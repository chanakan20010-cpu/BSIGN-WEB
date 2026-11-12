param([switch]$SmokeTest)
Set-StrictMode -Version 2
$ErrorActionPreference='Stop'
$script:Cancelled=$false
$script:Tick=$null
$script:OnStatus={param($text) Write-Host $text}
$runtime=$null
$ownedJob=$null
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
. (Join-Path $PSScriptRoot 'bootstrap.ps1')
. (Join-Path $PSScriptRoot 'lifetime.ps1')
$mutexHash=Get-BsignFingerprint @((Join-Path $PSScriptRoot 'runtime.json')) $projectRoot
$created=$false
$mutex=New-Object Threading.Mutex($true,('Local\BSIGN-Preview-'+$mutexHash),[ref]$created)
function Show-BsignReady($State) {
    Write-Host ''
    Write-Host ('Website ready:       '+$State.origin)
    Write-Host ('Admin panel:         '+$State.origin+'/admin')
    if($State.PSObject.Properties.Name -contains 'initialAdmin'){
        if($State.initialAdmin.status -ne 'existing-no-file'){
            Write-Host ('Admin login details: '+$State.initialAdmin.file)
            Write-Host 'Open that text file to find Username (email) and the initial random Password.'
            Write-Host 'If you changed the password, use your new password.'
        }else{
            Write-Host 'An admin account already exists. Use its previous email and password.'
            Write-Host 'For account recovery: stop this preview, then open OPEN-PREVIEW.vbs.'
        }
    }
    Write-Host 'Local content and uploads are kept in the data folder when preview stops.'
}
try {
    Write-Host 'BSIGN TECH - Windows Preview'
    if(-not $created){
        $active=[IO.File]::ReadAllText((Join-Path $projectRoot '.runtime\active-state.txt'))
        $state=Get-Content -LiteralPath $active -Raw -Encoding UTF8 | ConvertFrom-Json
        $null=Get-BsignStatus $state
        Show-BsignReady $state
        if(-not $SmokeTest){Start-Process $state.origin}
        Write-Host 'Preview is already running. Keep the original preview window open.'
        exit 0
    }
    Write-Host '[1/3] Preparing portable Node.js, dependencies and website...'
    $prepared=Initialize-BsignProject $projectRoot -Console
    if($prepared -isnot [hashtable]){throw 'Project preparation returned unexpected pipeline output'}
    Write-Host '[2/3] Starting the website and preparing the local admin account...'
    $runtime=Start-BsignServer $projectRoot $prepared -InitialAdmin
    $ownedJob=[BsignPreviewLifetime]::Own($runtime.Process)
    Write-Host '[3/3] Ready'
    Show-BsignReady $runtime.State
    if($SmokeTest){
        $null=Invoke-BsignProcess $prepared.Node @('tests/initial-admin-login-smoke.js',$runtime.State.origin,$runtime.State.initialAdmin.file,$prepared.Log) $projectRoot $prepared.Log -ShowOutput
        $stamp=(Get-Item -LiteralPath (Join-Path $prepared.RuntimeRoot 'build.stamp')).LastWriteTimeUtc
        $credentialHash=(Get-FileHash -LiteralPath $runtime.State.initialAdmin.file -Algorithm SHA256).Hash
        Stop-BsignServer $runtime;$runtime=$null
        $ownedJob.Dispose();$ownedJob=$null
        $again=Initialize-BsignProject $projectRoot -Console
        if((Get-Item -LiteralPath (Join-Path $prepared.RuntimeRoot 'build.stamp')).LastWriteTimeUtc -ne $stamp){throw 'Unchanged project rebuilt unexpectedly'}
        $runtime=Start-BsignServer $projectRoot $again -InitialAdmin
        $ownedJob=[BsignPreviewLifetime]::Own($runtime.Process)
        if((Get-FileHash -LiteralPath $runtime.State.initialAdmin.file -Algorithm SHA256).Hash -ne $credentialHash){throw 'Initial account file changed after restart'}
        $null=Invoke-BsignProcess $prepared.Node @('tests/initial-admin-login-smoke.js',$runtime.State.origin,$runtime.State.initialAdmin.file,$prepared.Log) $projectRoot $prepared.Log -ShowOutput
        Write-Host 'PASS: START-WINDOWS portable setup, website, file credentials, admin login, cache and restart'
    }else{
        Start-Process $runtime.State.origin
        Write-Host 'Keep this CMD window open while previewing. Press Ctrl+C to stop.'
        while(-not $runtime.Process.HasExited){Start-Sleep -Milliseconds 250}
    }
} catch {
    Write-Host ('Preview failed: '+$_.Exception.Message) -ForegroundColor Red
    Write-Host 'See .runtime\logs\setup.log or START-HERE.html for help.'
    if($SmokeTest){
        $message=($_.Exception.GetBaseException().Message+' | '+$_.ScriptStackTrace) -replace '[\r\n]+',' '
        Write-Host ('::error title=Console startup::'+$message)
        throw
    }
    exit 1
} finally {
    Stop-BsignServer $runtime
    if($null -ne $ownedJob){$ownedJob.Dispose()}
    if($created){$mutex.ReleaseMutex()}
    $mutex.Dispose()
}
