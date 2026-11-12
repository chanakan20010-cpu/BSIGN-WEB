param([switch]$GuiOnly)
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$scriptFiles = @('bootstrap.ps1', 'console.ps1', 'lifetime.ps1', 'preview.ps1') | ForEach-Object {
    Join-Path $projectRoot ('scripts\windows\' + $_)
}
$consoleFile = Join-Path $projectRoot 'scripts\windows\console.ps1'
$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$commandExe = Join-Path $env:SystemRoot 'System32\cmd.exe'

function Get-BsignPolicySnapshot {
    return ((Get-ExecutionPolicy -List | ForEach-Object {
        $_.Scope.ToString() + '=' + $_.ExecutionPolicy.ToString()
    }) -join ';')
}
function Set-BsignInternetMark([string]$File) {
    Set-Content -LiteralPath $File -Stream Zone.Identifier -Encoding ASCII -Value "[ZoneTransfer]`r`nZoneId=3`r`n"
    $zone = Get-Content -LiteralPath $File -Stream Zone.Identifier -Raw
    if ($zone -notmatch '(?m)^ZoneId=3\s*$') { throw 'Could not create the Internet-zone test fixture' }
}
function Test-BsignZoneStream([string]$File) {
    return $null -ne (Get-Item -LiteralPath $File -Stream Zone.Identifier -ErrorAction SilentlyContinue)
}
function Assert-BsignMarks([bool]$Expected) {
    foreach ($file in $scriptFiles) {
        if ((Test-BsignZoneStream $file) -ne $Expected) {
            throw ('Unexpected Internet-zone state for ' + [IO.Path]::GetFileName($file))
        }
    }
}
function Stop-BsignTestChild($Process) {
    try {
        if (-not $Process.HasExited) {
            & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /PID $Process.Id /T /F 2>$null | Out-Null
        }
    } catch { }
}
function Invoke-BsignTestChild([string]$Executable, [string]$Arguments, [int]$TimeoutSeconds) {
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Executable
    $info.Arguments = $Arguments
    $info.WorkingDirectory = $projectRoot
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = [Diagnostics.Process]::Start($info)
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    try {
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
            throw ('Test child did not finish within ' + $TimeoutSeconds + ' seconds')
        }
        $process.WaitForExit()
        return [PSCustomObject]@{
            ExitCode = $process.ExitCode
            Output = $stdout.GetAwaiter().GetResult() + $stderr.GetAwaiter().GetResult()
        }
    } finally {
        Stop-BsignTestChild $process
        $process.Dispose()
    }
}
function Assert-BsignChildSuccess($Result, [string]$Step) {
    if ($Result.ExitCode -ne 0) {
        # Only product-owned error summaries are copied to the CI annotation.
        # Full subprocess output and all credential contents stay out of it.
        $detail = ($Result.Output -split '[\r\n]+' | Where-Object {
            $_ -match '^Preview launcher:|^Preview failed:|^::error title=Console startup::'
        } | Select-Object -First 1)
        throw ($Step + ' failed (exit ' + $Result.ExitCode + '). ' + $detail)
    }
}

$beforePolicy = Get-BsignPolicySnapshot
$originalConsole = [IO.File]::ReadAllBytes($consoleFile)
$unrelatedFile = $null
try {
    foreach ($file in $scriptFiles) { Set-BsignInternetMark $file }
    Assert-BsignMarks $true
    if ($GuiOnly) {
        Write-Host 'Testing the VBS GUI entry point with Internet-marked PowerShell scripts...'
        $wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
        $vbs = Join-Path $projectRoot 'OPEN-PREVIEW.vbs'
        $result = Invoke-BsignTestChild $wscript ('"' + $vbs + '" /test-ui') 180
        Assert-BsignChildSuccess $result 'VBS GUI startup'
        Assert-BsignMarks $false
        if ((Get-BsignPolicySnapshot) -ne $beforePolicy) { throw 'The GUI launcher changed execution policy' }
        Write-Host 'PASS: marked VBS GUI startup, scoped unblocking and unchanged execution policy'
    } else {
        $runtimeFolder = Join-Path $projectRoot '.runtime'
        $null = [IO.Directory]::CreateDirectory($runtimeFolder)
        $unrelatedFile = Join-Path $runtimeFolder ('motw-unrelated-' + [Guid]::NewGuid().ToString('N') + '.ps1')
        [IO.File]::WriteAllText($unrelatedFile, '# Unrelated test file: the launcher must not unblock this.', [Text.Encoding]::UTF8)
        Set-BsignInternetMark $unrelatedFile

        Write-Host 'Reproducing the original RemoteSigned rejection before running the launcher...'
        $blocked = Invoke-BsignTestChild $powershellExe ('-NoLogo -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File "' + $consoleFile + '" -SmokeTest') 10
        if ($blocked.ExitCode -eq 0 -or $blocked.Output -notmatch 'SecurityError|UnauthorizedAccess') {
            throw 'Internet-marked console.ps1 did not reproduce the expected execution-policy rejection'
        }
        Assert-BsignMarks $true

        Write-Host 'Testing that a changed script is rejected before any files are unblocked...'
        try {
            $comment = [Text.Encoding]::UTF8.GetBytes("`r`n# Intentional integrity-test change`r`n")
            $tampered = New-Object byte[] ($originalConsole.Length + $comment.Length)
            [Array]::Copy($originalConsole, $tampered, $originalConsole.Length)
            [Array]::Copy($comment, 0, $tampered, $originalConsole.Length, $comment.Length)
            [IO.File]::WriteAllBytes($consoleFile, $tampered)
            Set-BsignInternetMark $consoleFile
            $launcher = Join-Path $projectRoot 'START-WINDOWS.cmd'
            $arguments = '/d /v:off /s /c ""' + $launcher + '" -SmokeTest"'
            $rejected = Invoke-BsignTestChild $commandExe $arguments 15
            if ($rejected.ExitCode -eq 0 -or $rejected.Output -notmatch 'Launcher file changed or incomplete: console\.ps1') {
                throw 'The changed script was not rejected by the launcher integrity check'
            }
            Assert-BsignMarks $true
            if (-not (Test-BsignZoneStream $unrelatedFile)) { throw 'The integrity rejection unblocked an unrelated file' }
        } finally {
            [IO.File]::WriteAllBytes($consoleFile, $originalConsole)
            Set-BsignInternetMark $consoleFile
        }

        Write-Host 'Testing the actual START-WINDOWS entry point with verified Internet-marked scripts...'
        foreach ($file in $scriptFiles) { Set-BsignInternetMark $file }
        $started = Invoke-BsignTestChild $commandExe $arguments 600
        Assert-BsignChildSuccess $started 'START-WINDOWS Internet-zone startup'
        Assert-BsignMarks $false
        if (-not (Test-BsignZoneStream $unrelatedFile)) { throw 'The launcher unblocked an unrelated file' }
        if ((Get-BsignPolicySnapshot) -ne $beforePolicy) { throw 'The console launcher changed execution policy' }
        Write-Host 'PASS: original rejection reproduced, tampering rejected, marked START-WINDOWS startup, unrelated mark retained and policy unchanged'
    }
} catch {
    $message = $_.Exception.GetBaseException().Message -replace '[\r\n]+', ' '
    Write-Host ('::error title=Windows MOTW::' + $message)
    throw
} finally {
    # Always restore the source bytes, including after a failed tamper assertion.
    [IO.File]::WriteAllBytes($consoleFile, $originalConsole)
}
