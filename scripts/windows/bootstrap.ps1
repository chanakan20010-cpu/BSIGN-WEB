# Windows PowerShell 5.1+. No machine-wide installation, PATH or policy changes.
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
function Quote-BsignArgument([string]$Argument) {
    $escaped = $Argument -replace '(\\*)"', '$1$1\"'
    $escaped = $escaped -replace '(\\+)$', '$1$1'
    return '"' + $escaped + '"'
}
function Invoke-BsignTick {
    if ($script:Tick) { & $script:Tick }
    if ($script:Cancelled) { throw 'PREVIEW_CANCELLED' }
}
function Write-BsignStatus([string]$Message) {
    if ($script:OnStatus) { & $script:OnStatus $Message }
}
function Stop-BsignOwnedProcess($Process) {
    if ($null -eq $Process) { return }
    try {
        if (-not $Process.HasExited) {
            # Only the process started by this launcher and its own children.
            $info = New-Object System.Diagnostics.ProcessStartInfo
            $info.FileName = Join-Path $env:SystemRoot 'System32\taskkill.exe'
            $info.Arguments = '/PID ' + $Process.Id + ' /T /F'
            $info.UseShellExecute = $false
            $info.CreateNoWindow = $true
            $info.RedirectStandardOutput = $true
            $info.RedirectStandardError = $true
            $killer = [System.Diagnostics.Process]::Start($info)
            $null = $killer.StandardOutput.ReadToEnd()
            $null = $killer.StandardError.ReadToEnd()
            $null = $killer.WaitForExit(5000)
            $killer.Dispose()
        }
    } catch { }
}
function Invoke-BsignProcess([string]$Executable, [string[]]$Arguments, [string]$WorkingDirectory, [string]$LogPath) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Executable
    $info.Arguments = ($Arguments | ForEach-Object { Quote-BsignArgument $_ }) -join ' '
    $info.WorkingDirectory = $WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = [System.Diagnostics.Process]::Start($info)
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    try {
        while (-not $process.HasExited) { Invoke-BsignTick; Start-Sleep -Milliseconds 100 }
        $process.WaitForExit()
        $output = $stdout.GetAwaiter().GetResult() + $stderr.GetAwaiter().GetResult()
        [IO.File]::AppendAllText($LogPath, $output, [Text.Encoding]::UTF8)
        if ($process.ExitCode -ne 0) { throw "ขั้นตอนเตรียมระบบไม่สำเร็จ (รหัส $($process.ExitCode)) ดูรายละเอียดที่ปุ่มเปิดบันทึก" }
        return $output.Trim()
    } finally { Stop-BsignOwnedProcess $process; $process.Dispose() }
}
function Receive-BsignArchive([string]$Url,[string]$Destination,[string]$Sha256) {
    if (Test-Path -LiteralPath $Destination) {
        if ((Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -eq $Sha256) { return }
        Remove-Item -LiteralPath $Destination -Force
    }
    $partial = $Destination + '.partial'
    $client = New-Object Net.WebClient
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $task = $client.DownloadFileTaskAsync([Uri]$Url,$partial)
        while (-not $task.IsCompleted) { Invoke-BsignTick; Start-Sleep -Milliseconds 100 }
        $task.GetAwaiter().GetResult()
        if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -ne $Sha256) {
            throw 'ไฟล์ Node.js ตรวจสอบ SHA-256 ไม่ผ่าน กรุณาลองใหม่ ไม่ได้ใช้ไฟล์ที่ดาวน์โหลดมา'
        }
        Move-Item -LiteralPath $partial -Destination $Destination -Force
    } finally {
        $client.CancelAsync(); $client.Dispose()
        if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
    }
}
function Get-BsignFingerprint([string[]]$Files,[string]$Salt) {
    $builder = New-Object Text.StringBuilder
    $null = $builder.AppendLine($Salt)
    foreach ($file in ($Files | Sort-Object)) {
        $null = $builder.AppendLine($file)
        $null = $builder.AppendLine((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash)
    }
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($builder.ToString())))).Replace('-','').ToLowerInvariant() }
    finally { $hasher.Dispose() }
}
function Test-BsignStamp([string]$File,[string]$Expected) {
    return (Test-Path -LiteralPath $File) -and ([IO.File]::ReadAllText($File) -eq $Expected)
}
function Initialize-BsignProject([string]$ProjectRoot) {
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json'))) {
        throw 'ไม่พบไฟล์โปรเจกต์ กรุณาแตก ZIP ทั้งโฟลเดอร์ก่อนเปิดพรีวิว'
    }
    $runtimeRoot = Join-Path $ProjectRoot '.runtime'
    $logs = Join-Path $runtimeRoot 'logs'
    $null = New-Item -ItemType Directory -Path $logs -Force
    $logFile = Join-Path $logs 'setup.log'
    [IO.File]::WriteAllText($logFile,'',[Text.Encoding]::UTF8)
    $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'runtime.json') -Raw | ConvertFrom-Json
    $architecture = $env:PROCESSOR_ARCHITECTURE
    if ($env:PROCESSOR_ARCHITEW6432) { $architecture = $env:PROCESSOR_ARCHITEW6432 }
    switch ($architecture) { 'AMD64' { $arch='x64' } 'ARM64' { $arch='arm64' } default { throw 'รองรับ Windows 64-bit (x64 หรือ ARM64) เท่านั้น' } }
    $folderName = 'node-v' + $manifest.version + '-win-' + $arch
    $nodeDirectory = Join-Path $runtimeRoot $folderName
    $node = Join-Path $nodeDirectory 'node.exe'
    if (-not (Test-Path -LiteralPath $node)) {
        Write-BsignStatus 'ครั้งแรก: กำลังดาวน์โหลดเครื่องมือที่จำเป็น…'
        $archive = Join-Path $runtimeRoot ($folderName+'.zip')
        Receive-BsignArchive ('https://nodejs.org/dist/v'+$manifest.version+'/'+$folderName+'.zip') $archive $manifest.archives.$arch.sha256
        Write-BsignStatus 'ตรวจสอบไฟล์แล้ว กำลังเตรียม Node.js สำหรับโปรเจกต์นี้…'
        $stage = Join-Path $runtimeRoot ('unpack-'+[Guid]::NewGuid().ToString('N'))
        try {
            Expand-Archive -LiteralPath $archive -DestinationPath $stage -Force
            if (Test-Path -LiteralPath $nodeDirectory) { Remove-Item -LiteralPath $nodeDirectory -Recurse -Force }
            Move-Item -LiteralPath (Join-Path $stage $folderName) -Destination $nodeDirectory
        } finally { if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force} }
    }
    $actualVersion = Invoke-BsignProcess $node @('--version') $ProjectRoot $logFile
    if ($actualVersion -ne ('v'+$manifest.version)) { throw 'เวอร์ชันเครื่องมือในโฟลเดอร์ .runtime ไม่ตรง กรุณาปิดและลบเฉพาะโฟลเดอร์ .runtime แล้วลองใหม่' }
    # This change affects only this launcher and its children, never the machine PATH.
    $env:PATH = $nodeDirectory + [IO.Path]::PathSeparator + $env:PATH
    $npm = Join-Path $nodeDirectory 'node_modules\npm\bin\npm-cli.js'
    $deps = Get-BsignFingerprint @((Join-Path $ProjectRoot 'package.json'),(Join-Path $ProjectRoot 'package-lock.json')) ($folderName+'-deps-v1')
    $depsStamp = Join-Path $runtimeRoot 'dependencies.stamp'
    if (-not ((Test-BsignStamp $depsStamp $deps) -and (Test-Path -LiteralPath (Join-Path $ProjectRoot 'node_modules\.package-lock.json')))) {
        Write-BsignStatus 'กำลังเตรียมส่วนประกอบของเว็บไซต์ (ครั้งแรกต้องใช้อินเทอร์เน็ต)…'
        $null = Invoke-BsignProcess $node @($npm,'ci','--include=dev','--no-audit','--no-fund','--strict-ssl=true','--cache',(Join-Path $runtimeRoot 'npm-cache')) $ProjectRoot $logFile
        [IO.File]::WriteAllText($depsStamp,$deps)
    }
    $files = @((Join-Path $ProjectRoot 'index.html'),(Join-Path $ProjectRoot 'vite.config.js'))
    foreach($folder in @('src','public')) { $files += @(Get-ChildItem -LiteralPath (Join-Path $ProjectRoot $folder) -Recurse -File | ForEach-Object { $_.FullName }) }
    $buildHash = Get-BsignFingerprint $files $deps
    $buildStamp = Join-Path $runtimeRoot 'build.stamp'
    if (-not ((Test-BsignStamp $buildStamp $buildHash) -and (Test-Path -LiteralPath (Join-Path $ProjectRoot 'dist\index.html')))) {
        Write-BsignStatus 'กำลังจัดเตรียมหน้าพรีวิว…'
        $null = Invoke-BsignProcess $node @($npm,'run','build') $ProjectRoot $logFile
        [IO.File]::WriteAllText($buildStamp,$buildHash)
    }
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot '.env'))) { Copy-Item -LiteralPath (Join-Path $ProjectRoot '.env.example') -Destination (Join-Path $ProjectRoot '.env') }
    return @{Node=$node;RuntimeRoot=$runtimeRoot;Log=$logFile}
}
function Start-BsignServer([string]$ProjectRoot,$Prepared) {
    Write-BsignStatus 'กำลังเปิดเว็บไซต์…'
    $stateFile = Join-Path $Prepared.RuntimeRoot ('run-'+[Guid]::NewGuid().ToString('N')+'.json')
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Prepared.Node
    $arguments = @('--env-file-if-exists=.env','server/preview.js',$stateFile)
    $info.Arguments = ($arguments | ForEach-Object {Quote-BsignArgument $_}) -join ' '
    $info.WorkingDirectory = $ProjectRoot
    $info.UseShellExecute=$false; $info.CreateNoWindow=$true
    $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
    $process=[Diagnostics.Process]::Start($info)
    $stdout=$process.StandardOutput.ReadToEndAsync();$stderr=$process.StandardError.ReadToEndAsync()
    try {
        $deadline=[DateTime]::UtcNow.AddSeconds(45)
        while(-not (Test-Path -LiteralPath $stateFile)){
            Invoke-BsignTick
            if($process.HasExited){[IO.File]::AppendAllText($Prepared.Log,$stdout.GetAwaiter().GetResult()+$stderr.GetAwaiter().GetResult());throw 'เปิดเว็บไซต์ไม่สำเร็จ ดูรายละเอียดที่ปุ่มเปิดบันทึก'}
            if([DateTime]::UtcNow -gt $deadline){throw 'เปิดพรีวิวไม่ทันเวลา กรุณาลองใหม่'}
            Start-Sleep -Milliseconds 100
        }
        $state=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
        $result=Get-BsignStatus $state
        if($result.product -ne 'BSIGN-LOCAL-PREVIEW' -or $result.pid -ne $process.Id){throw 'ไม่สามารถยืนยันพรีวิวของโปรเจกต์นี้ได้'}
        [IO.File]::WriteAllText((Join-Path $Prepared.RuntimeRoot 'active-state.txt'),$stateFile)
        return @{Process=$process;State=$state;StateFile=$stateFile;Stdout=$stdout;Stderr=$stderr}
    } catch {Stop-BsignOwnedProcess $process;throw}
}
function Get-BsignStatus($State) {
    if($State.origin -notmatch '^http://127\.0\.0\.1:\d+$' -or $State.token -notmatch '^[a-f0-9]{64}$'){throw 'ข้อมูลพรีวิวไม่ถูกต้อง'}
    return Invoke-RestMethod -Uri ($State.origin+'/__preview/status') -Headers @{'X-BSIGN-Preview'=$State.token} -TimeoutSec 5
}
function Stop-BsignServer($Runtime) {
    if($null -eq $Runtime){return}
    try {
        $null=Invoke-RestMethod -Method Post -Uri ($Runtime.State.origin+'/__preview/stop') -Headers @{'X-BSIGN-Preview'=$Runtime.State.token} -TimeoutSec 5
        if(-not $Runtime.Process.WaitForExit(5000)){Stop-BsignOwnedProcess $Runtime.Process}
    } catch {Stop-BsignOwnedProcess $Runtime.Process}
    finally {if(Test-Path -LiteralPath $Runtime.StateFile){Remove-Item -LiteralPath $Runtime.StateFile -Force}}
}
