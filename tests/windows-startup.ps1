param([switch]$SkipBenchmark)
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:Cancelled = $false
$script:Tick = $null
$script:OnStatus = $null
. (Join-Path $projectRoot 'scripts\windows\bootstrap.ps1')
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# All cache roots and output folders in these tests belong to this invocation.
# Never inspect or change a person's data directory, configuration or account.
$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('bsign-startup-' + [Guid]::NewGuid().ToString('N'))
$null = [IO.Directory]::CreateDirectory($fixtureRoot)
$previousLocalAppData = $env:LOCALAPPDATA
$previousProgress = $ProgressPreference
$script:Checks = 0
$script:ActiveCheck = 'startup'
$script:TickCount = 0

function Assert-BsignTest([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
function Assert-BsignFailure([scriptblock]$Operation, [string]$Pattern = '') {
    $failed = $false
    try { $null = & $Operation }
    catch {
        $failed = $true
        if ($Pattern -and $_.Exception.GetBaseException().Message -notmatch $Pattern) {
            throw 'The operation failed for an unexpected reason'
        }
    }
    Assert-BsignTest $failed 'An unsafe or cancelled operation unexpectedly succeeded'
}
function Test-BsignStartup([string]$Name, [scriptblock]$Operation) {
    $script:ActiveCheck = $Name
    & $Operation
    $script:Checks++
    Write-Host ('PASS: startup check ' + $script:Checks + ' - ' + $Name)
}
function New-BsignFixtureZip([string]$File, [System.Collections.IDictionary]$Entries) {
    $stream = [IO.File]::Open($File, [IO.FileMode]::CreateNew)
    $zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
    try {
        foreach ($name in $Entries.Keys) {
            $entry = $zip.CreateEntry([string]$name)
            $writer = New-Object IO.StreamWriter($entry.Open(), (New-Object Text.UTF8Encoding($false)))
            try { $writer.Write([string]$Entries[$name]) }
            finally { $writer.Dispose() }
        }
    } finally { $zip.Dispose(); $stream.Dispose() }
}
function New-BsignFixtureDestination([string]$Name) {
    $folder = Join-Path $fixtureRoot $Name
    $null = [IO.Directory]::CreateDirectory($folder)
    return (Join-Path $folder 'node-fixture.zip')
}
function Get-BsignFileInventory([string]$Folder) {
    $inventory = @{}
    foreach ($file in Get-ChildItem -LiteralPath $Folder -Recurse -File) {
        $relative = $file.FullName.Substring($Folder.Length + 1)
        $inventory[$relative] = ([string]$file.Length + ':' + (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash)
    }
    return $inventory
}

try {
    $env:LOCALAPPDATA = Join-Path $fixtureRoot 'isolated local app data'
    $trustedArchive = Join-Path $fixtureRoot 'trusted fixture.zip'
    $entries = [ordered]@{ 'node-fixture/README.txt' = 'First-run fixture'; 'node-fixture/โฟลเดอร์ ภาษาไทย/file with spaces.txt' = 'ข้อมูลทดสอบ Unicode' }
    for ($index = 0; $index -lt 80; $index++) { $entries[('node-fixture/items/file-' + $index + '.txt')] = ('content-' + $index) }
    New-BsignFixtureZip $trustedArchive $entries
    $trustedSha = (Get-FileHash -LiteralPath $trustedArchive -Algorithm SHA256).Hash.ToLowerInvariant()
    $trustedUrl = (New-Object Uri($trustedArchive)).AbsoluteUri

    Test-BsignStartup 'Unicode paths, exact contents, ticks and unchanged progress preference' {
        $destination = Join-Path $fixtureRoot 'แตกไฟล์ มีช่องว่าง'
        $script:TickCount = 0
        $script:Tick = { $script:TickCount++ }
        $ProgressPreference = 'Continue'
        $output = @(Expand-BsignArchive $trustedArchive $destination)
        Assert-BsignTest ($output.Count -eq 0) 'Archive extraction leaked pipeline output'
        Assert-BsignTest ($ProgressPreference -eq 'Continue') 'Archive extraction changed its caller progress preference'
        Assert-BsignTest ($script:TickCount -ge 2) 'Extraction did not service launcher ticks'
        Assert-BsignTest ((Get-ChildItem -LiteralPath $destination -Recurse -File).Count -eq $entries.Count) 'Extracted file count differs'
        foreach ($name in $entries.Keys) {
            Assert-BsignTest ([IO.File]::ReadAllText((Join-Path $destination $name)) -eq $entries[$name]) 'Extracted Unicode file contents differ'
        }
        $script:Tick = $null
    }

    Test-BsignStartup 'Pre-existing destination directories and files remain untouched' {
        $destination = Join-Path $fixtureRoot 'existing-folder'
        $null = [IO.Directory]::CreateDirectory($destination)
        $marker = Join-Path $destination 'preserve.txt'
        [IO.File]::WriteAllText($marker, 'Existing owner data')
        Assert-BsignFailure { Expand-BsignArchive $trustedArchive $destination }
        Assert-BsignTest ([IO.File]::ReadAllText($marker) -eq 'Existing owner data') 'Existing destination data changed'
        $file = Join-Path $fixtureRoot 'existing-file'
        [IO.File]::WriteAllText($file, 'Keep this file')
        Assert-BsignFailure { Expand-BsignArchive $trustedArchive $file }
        Assert-BsignTest ([IO.File]::ReadAllText($file) -eq 'Keep this file') 'Existing destination file changed'
    }

    Test-BsignStartup 'Unsafe archive paths and malformed archives reject without leaving output' {
        $absolute = (Join-Path $fixtureRoot 'absolute-escape.txt').Replace('\', '/')
        $unsafeNames = @('../escaped.txt', 'nested/../../escaped.txt', '..\escaped.txt', $absolute, 'nested/file.txt:alternate')
        $index = 0
        foreach ($name in $unsafeNames) {
            $archive = Join-Path $fixtureRoot ('unsafe-' + $index + '.zip')
            $destination = Join-Path $fixtureRoot ('unsafe-output-' + $index)
            New-BsignFixtureZip $archive ([ordered]@{ 'safe.txt' = 'before rejection'; $name = 'must not escape' })
            Assert-BsignFailure { Expand-BsignArchive $archive $destination }
            Assert-BsignTest (-not (Test-Path -LiteralPath $destination)) 'Rejected archive left a partial destination'
            $index++
        }
        Assert-BsignTest (-not (Test-Path -LiteralPath (Join-Path $fixtureRoot 'escaped.txt'))) 'Archive escaped its destination'
        Assert-BsignTest (-not (Test-Path -LiteralPath (Join-Path $fixtureRoot 'absolute-escape.txt'))) 'Rooted archive path escaped its destination'
        $bad = Join-Path $fixtureRoot 'malformed.zip'
        [IO.File]::WriteAllText($bad, 'This is not a ZIP archive')
        $destination = Join-Path $fixtureRoot 'malformed-output'
        Assert-BsignFailure { Expand-BsignArchive $bad $destination }
        Assert-BsignTest (-not (Test-Path -LiteralPath $destination)) 'Malformed archive left a partial destination'
    }

    Test-BsignStartup 'Cancellation removes only the extractor-owned destination' {
        $destination = Join-Path $fixtureRoot 'cancelled-output'
        $script:TickCount = 0
        $script:Tick = { $script:TickCount++; if ($script:TickCount -ge 2) { $script:Cancelled = $true } }
        try { Assert-BsignFailure { Expand-BsignArchive $trustedArchive $destination } 'PREVIEW_CANCELLED' }
        finally { $script:Tick = $null; $script:Cancelled = $false }
        Assert-BsignTest ($script:TickCount -ge 2) 'The cancellation fixture did not reach a mid-extraction tick'
        Assert-BsignTest (-not (Test-Path -LiteralPath $destination)) 'Cancelled extraction left output behind'
        Assert-BsignTest (Test-Path -LiteralPath $trustedArchive) 'Cancellation removed the source archive'
    }

    Test-BsignStartup 'Npm download cache is shared across project folders with a local fallback' {
        $firstRuntime = Join-Path $fixtureRoot 'project-one\.runtime'
        $secondRuntime = Join-Path $fixtureRoot 'project-two\.runtime'
        $first = @(Get-BsignNpmCache $firstRuntime)
        $second = @(Get-BsignNpmCache $secondRuntime)
        Assert-BsignTest ($first.Count -eq 1 -and $second.Count -eq 1) 'Cache selection returned unexpected pipeline output'
        Assert-BsignTest ([IO.Path]::GetFullPath($first[0]) -eq [IO.Path]::GetFullPath($second[0])) 'Separate projects did not reuse the npm download cache'
        Assert-BsignTest ($first[0].StartsWith($env:LOCALAPPDATA, [StringComparison]::OrdinalIgnoreCase)) 'Cache escaped the isolated LocalAppData root'
        $blocked = Join-Path $fixtureRoot 'blocked-local-app-data'
        [IO.File]::WriteAllText($blocked, 'A file cannot hold a cache directory')
        $env:LOCALAPPDATA = $blocked
        $fallback = Get-BsignNpmCache $firstRuntime
        Assert-BsignTest ($fallback -eq (Join-Path $firstRuntime 'npm-cache')) 'Unavailable shared cache did not use the project cache'
        Assert-BsignTest ([IO.File]::ReadAllText($blocked) -eq 'A file cannot hold a cache directory') 'Cache fallback changed an existing file'
        $env:LOCALAPPDATA = Join-Path $fixtureRoot 'isolated local app data'
    }

    Test-BsignStartup 'Verified Node ZIP cache is published and reused without downloading' {
        $destination = New-BsignFixtureDestination 'node-cold'
        $output = @(Receive-BsignNodeArchive $trustedUrl $destination $trustedSha)
        Assert-BsignTest ($output.Count -eq 0) 'Node archive cache leaked pipeline output'
        Assert-BsignTest ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -eq $trustedSha) 'Downloaded fixture SHA differs'
        $sharedFolder = Get-BsignCacheDirectory 'node-archives'
        $shared = Join-Path $sharedFolder ('node-fixture-' + $trustedSha + '.zip')
        Assert-BsignTest (Test-Path -LiteralPath $shared) 'Verified Node archive was not cached'
        Assert-BsignTest ((Get-FileHash -LiteralPath $shared -Algorithm SHA256).Hash -eq $trustedSha) 'Shared archive SHA differs'
        $hit = New-BsignFixtureDestination 'node-hit'
        $missingUrl = (New-Object Uri((Join-Path $fixtureRoot 'does-not-exist.zip'))).AbsoluteUri
        $null = Receive-BsignNodeArchive $missingUrl $hit $trustedSha
        Assert-BsignTest ((Get-FileHash -LiteralPath $hit -Algorithm SHA256).Hash -eq $trustedSha) 'Cache hit did not copy verified bytes'
    }

    Test-BsignStartup 'Corrupt shared Node ZIP is ignored in favor of the verified source' {
        $shared = Join-Path (Get-BsignCacheDirectory 'node-archives') ('node-fixture-' + $trustedSha + '.zip')
        [IO.File]::WriteAllText($shared, 'Corrupt cached bytes')
        $destination = New-BsignFixtureDestination 'node-corrupt-cache'
        $null = Receive-BsignNodeArchive $trustedUrl $destination $trustedSha
        Assert-BsignTest ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -eq $trustedSha) 'Corrupt cache bytes reached the project'
    }

    Test-BsignStartup 'Unavailable shared Node cache preserves project download and local cache reuse' {
        $env:LOCALAPPDATA = Join-Path $fixtureRoot 'blocked-local-app-data'
        $destination = New-BsignFixtureDestination 'node-no-shared-cache'
        $null = Receive-BsignNodeArchive $trustedUrl $destination $trustedSha
        Assert-BsignTest ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -eq $trustedSha) 'Local fallback download differs'
        $missingUrl = (New-Object Uri((Join-Path $fixtureRoot 'still-does-not-exist.zip'))).AbsoluteUri
        $null = Receive-BsignNodeArchive $missingUrl $destination $trustedSha
        Assert-BsignTest ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -eq $trustedSha) 'A valid existing project archive was not reused'
        $env:LOCALAPPDATA = Join-Path $fixtureRoot 'isolated local app data'
    }

    Test-BsignStartup 'SHA mismatch rejects untrusted bytes and removes temporary downloads' {
        $destination = New-BsignFixtureDestination 'node-bad-checksum'
        Assert-BsignFailure { Receive-BsignNodeArchive $trustedUrl $destination ('0' * 64) }
        Assert-BsignTest (-not (Test-Path -LiteralPath $destination)) 'Unverified archive was published'
        Assert-BsignTest (-not (Test-Path -LiteralPath ($destination + '.partial'))) 'Failed download left a partial file'
        Assert-BsignTest (@(Get-ChildItem -LiteralPath $fixtureRoot -Recurse -File -Filter '*.partial').Count -eq 0) 'Cache operation left temporary archives'
    }

    if (-not $SkipBenchmark) {
        Test-BsignStartup 'Actual pinned Node ZIP benchmark preserves every extracted file' {
            $manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'scripts\windows\runtime.json') -Raw | ConvertFrom-Json
            $architecture = $env:PROCESSOR_ARCHITECTURE
            if ($env:PROCESSOR_ARCHITEW6432) { $architecture = $env:PROCESSOR_ARCHITEW6432 }
            switch ($architecture) { 'AMD64' { $arch = 'x64' } 'ARM64' { $arch = 'arm64' } default { throw 'Unsupported benchmark architecture' } }
            $folder = 'node-v' + $manifest.version + '-win-' + $arch
            $archive = Join-Path $projectRoot ('.runtime\' + $folder + '.zip')
            Assert-BsignTest (Test-Path -LiteralPath $archive) 'Run the Windows launcher smoke test before the startup benchmark'
            $sha = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
            Assert-BsignTest ($sha -eq $manifest.archives.$arch.sha256) 'The benchmark archive is not the pinned Node distribution'
            $legacy = Join-Path $fixtureRoot 'benchmark legacy'
            $fast = Join-Path $fixtureRoot 'benchmark fast'
            $ProgressPreference = 'Continue'
            $clock = [Diagnostics.Stopwatch]::StartNew()
            Expand-Archive -LiteralPath $archive -DestinationPath $legacy -Force
            $clock.Stop(); $legacyMilliseconds = $clock.Elapsed.TotalMilliseconds
            $clock.Restart()
            $null = Expand-BsignArchive $archive $fast
            $clock.Stop(); $fastMilliseconds = $clock.Elapsed.TotalMilliseconds
            $legacyFiles = Get-BsignFileInventory $legacy
            $fastFiles = Get-BsignFileInventory $fast
            Assert-BsignTest ($legacyFiles.Count -eq $fastFiles.Count -and $fastFiles.Count -gt 10) 'Benchmark file counts differ'
            foreach ($name in $legacyFiles.Keys) {
                Assert-BsignTest ($fastFiles.ContainsKey($name) -and $legacyFiles[$name] -eq $fastFiles[$name]) 'Benchmark extracted bytes differ'
            }
            Assert-BsignTest (Test-Path -LiteralPath (Join-Path $fast ($folder + '\node.exe'))) 'Fast extraction changed the Node directory layout'
            $result = [ordered]@{
                nodeVersion = $manifest.version
                architecture = $arch
                archiveSha256 = $sha
                archiveBytes = (Get-Item -LiteralPath $archive).Length
                extractedFiles = $fastFiles.Count
                legacyMilliseconds = [Math]::Round($legacyMilliseconds, 2)
                fastMilliseconds = [Math]::Round($fastMilliseconds, 2)
                ratio = [Math]::Round(($legacyMilliseconds / [Math]::Max(1, $fastMilliseconds)), 2)
                measurement = 'One sequential extraction per method on this CI runner; not a guaranteed user-device speedup.'
            }
            $logFolder = Join-Path $projectRoot '.runtime\logs'
            $null = [IO.Directory]::CreateDirectory($logFolder)
            [IO.File]::WriteAllText((Join-Path $logFolder 'startup-performance.json'), ($result | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
            $summary = 'Expand-Archive ' + $result.legacyMilliseconds.ToString([Globalization.CultureInfo]::InvariantCulture) + ' ms; fast extraction ' + $result.fastMilliseconds.ToString([Globalization.CultureInfo]::InvariantCulture) + ' ms; ' + $result.extractedFiles + ' identical files; ratio ' + $result.ratio.ToString([Globalization.CultureInfo]::InvariantCulture)
            Write-Host ('::notice title=Node extraction benchmark::' + $summary)
            Write-Host ('PASS: ' + $summary)
        }
    }
    Write-Host ('PASS: ' + $script:Checks + ' Windows startup checks; extraction, cache integrity, fallback, cancellation and data preservation')
} catch {
    # Fixed check names and this test's source location are safe for public CI.
    # Never publish raw exceptions, environment variables or file contents.
    $location = ($_.ScriptStackTrace -split '[\r\n]+' | Where-Object { $_ -match 'windows-startup\.ps1: line \d+' } | Select-Object -First 1)
    $line = if ($location -match ': line (\d+)') { $Matches[1] } else { 'unknown' }
    Write-Host ('::error title=Windows startup check::' + $script:ActiveCheck + '; windows-startup.ps1 line ' + $line)
    throw ('Windows startup check failed: ' + $script:ActiveCheck)
} finally {
    $script:Tick = $null
    $script:Cancelled = $false
    $ProgressPreference = $previousProgress
    $env:LOCALAPPDATA = $previousLocalAppData
    if (Test-Path -LiteralPath $fixtureRoot) { Remove-Item -LiteralPath $fixtureRoot -Recurse -Force }
}
