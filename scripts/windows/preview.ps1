param([switch]$SmokeTest, [switch]$UiSmokeTest)
Set-StrictMode -Version 2
$ErrorActionPreference='Stop'
$script:Cancelled=$false
$script:Tick=$null
$script:OnStatus=$null
$script:Runtime=$null
$script:Busy=$false
$script:UiReady=$false
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
. (Join-Path $PSScriptRoot 'bootstrap.ps1')
if($SmokeTest){
    $script:OnStatus={param($text) Write-Host $text}
    try{
        $prepared=Initialize-BsignProject $projectRoot
        $script:Runtime=Start-BsignServer $projectRoot $prepared
        $health=Invoke-RestMethod ($script:Runtime.State.origin+'/api/health')
        if(-not $health.ok){throw 'Health check failed'}
        $html=Invoke-WebRequest -UseBasicParsing ($script:Runtime.State.origin+'/')
        if($html.StatusCode -ne 200){throw 'Website check failed'}
        $firstStamp=(Get-Item -LiteralPath (Join-Path $prepared.RuntimeRoot 'build.stamp')).LastWriteTimeUtc
        Stop-BsignServer $script:Runtime;$script:Runtime=$null
        $again=Initialize-BsignProject $projectRoot
        if((Get-Item -LiteralPath (Join-Path $prepared.RuntimeRoot 'build.stamp')).LastWriteTimeUtc -ne $firstStamp){throw 'Unchanged project rebuilt unexpectedly'}
        $script:Runtime=Start-BsignServer $projectRoot $again
        $status=Get-BsignStatus $script:Runtime.State
        if($status.product -ne 'BSIGN-LOCAL-PREVIEW'){throw 'Restart failed'}
        Write-Host 'PASS: portable runtime, dependencies, build cache, HTTP and restart on Windows'
    }finally{Stop-BsignServer $script:Runtime}
    exit 0
}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()
$mutexHash=Get-BsignFingerprint @((Join-Path $projectRoot 'scripts\windows\runtime.json')) $projectRoot
$created=$false
$mutex=New-Object Threading.Mutex($true,('Local\BSIGN-Preview-'+$mutexHash),[ref]$created)
if(-not $created){
    try{
        $active=[IO.File]::ReadAllText((Join-Path $projectRoot '.runtime\active-state.txt'))
        $state=Get-Content -LiteralPath $active -Raw | ConvertFrom-Json
        $null=Get-BsignStatus $state
        Start-Process $state.origin
    }catch{[Windows.Forms.MessageBox]::Show('มีหน้าต่างเปิดพรีวิวอยู่แล้ว กรุณารอการเตรียมระบบในหน้าต่างนั้น','BSIGN TECH')|Out-Null}
    $mutex.Dispose();exit 0
}
$form=New-Object Windows.Forms.Form
$form.Text='BSIGN TECH — เปิดพรีวิว'
$form.ClientSize=New-Object Drawing.Size(620,330)
$form.StartPosition='CenterScreen'
$form.FormBorderStyle='FixedDialog';$form.MaximizeBox=$false
$form.Font=New-Object Drawing.Font('Segoe UI',11)
$form.BackColor=[Drawing.Color]::FromArgb(247,248,250)
$heading=New-Object Windows.Forms.Label
$heading.Text='BSIGN TECH';$heading.Font=New-Object Drawing.Font('Segoe UI',23,[Drawing.FontStyle]::Bold)
$heading.SetBounds(28,20,560,50)
$description=New-Object Windows.Forms.Label
$description.Text='เปิดเว็บไซต์และหลังบ้านจากเครื่องนี้ได้ โดยไม่ต้องพิมพ์คำสั่ง'
$description.SetBounds(30,80,560,45)
$statusLabel=New-Object Windows.Forms.Label
$statusLabel.Text='กำลังเริ่มต้น…';$statusLabel.SetBounds(30,132,560,50)
$progress=New-Object Windows.Forms.ProgressBar
$progress.SetBounds(30,187,560,9);$progress.Style='Marquee'
$openButton=New-Object Windows.Forms.Button
$openButton.Text='เปิดเว็บไซต์';$openButton.SetBounds(30,218,170,46);$openButton.Enabled=$false
$openButton.BackColor=[Drawing.Color]::FromArgb(255,189,53)
$adminButton=New-Object Windows.Forms.Button
$adminButton.Text='จัดการเนื้อหา';$adminButton.SetBounds(216,218,170,46);$adminButton.Enabled=$false
$closeButton=New-Object Windows.Forms.Button
$closeButton.Text='หยุดพรีวิวและปิด';$closeButton.SetBounds(402,218,188,46)
$logsButton=New-Object Windows.Forms.LinkLabel
$logsButton.Text='เปิดบันทึกการเตรียมระบบ';$logsButton.SetBounds(30,284,280,30)
$form.Controls.AddRange(@($heading,$description,$statusLabel,$progress,$openButton,$adminButton,$closeButton,$logsButton))
$script:Tick={ [Windows.Forms.Application]::DoEvents() }
$script:OnStatus={param($text) $statusLabel.Text=$text;[Windows.Forms.Application]::DoEvents()}
function Open-BsignAdmin {
    $current=Get-BsignStatus $script:Runtime.State
    $url=$script:Runtime.State.origin+'/admin'
    if($current.needsSetup){$url=$script:Runtime.State.origin+'/setup#'+$script:Runtime.State.token}
    Start-Process $url
}
function Start-BsignPreview {
    if($script:Busy){return}
    $script:Busy=$true;$script:Cancelled=$false;$openButton.Enabled=$false;$adminButton.Enabled=$false;$progress.Visible=$true
    try{
        $prepared=Initialize-BsignProject $projectRoot
        $script:Runtime=Start-BsignServer $projectRoot $prepared
        $statusLabel.Text='พรีวิวพร้อมแล้ว • ปิดหน้าต่างนี้เมื่อต้องการหยุด • ข้อมูลยังคงอยู่'
        $openButton.Text='เปิดเว็บไซต์';$openButton.Enabled=$true;$adminButton.Enabled=$true
        if($UiSmokeTest){
            $script:UiReady=$true
            $null=$form.BeginInvoke([Action]{$form.Close()})
        }else{Start-Process $script:Runtime.State.origin}
    }catch{
        Stop-BsignServer $script:Runtime;$script:Runtime=$null
        if(-not $script:Cancelled){$statusLabel.Text='ยังเปิดไม่ได้: '+$_.Exception.Message;$openButton.Text='ลองอีกครั้ง';$openButton.Enabled=$true}
    }finally{
        $script:Busy=$false;$progress.Visible=$false
        if($script:Cancelled){$form.Close()}
    }
}
$openButton.Add_Click({if($script:Runtime){try{Start-Process $script:Runtime.State.origin}catch{$statusLabel.Text='เปิดเบราว์เซอร์ไม่สำเร็จ กรุณาลองอีกครั้ง'}}else{Start-BsignPreview}})
$adminButton.Add_Click({try{Open-BsignAdmin}catch{$statusLabel.Text='พรีวิวหยุดแล้ว กรุณาปิดและเปิดตัวเปิดพรีวิวใหม่'}})
$closeButton.Add_Click({$form.Close()})
$logsButton.Add_LinkClicked({$log=Join-Path $projectRoot '.runtime\logs\setup.log';if(Test-Path -LiteralPath $log){Start-Process notepad.exe -ArgumentList (Quote-BsignArgument $log)}})
$form.Add_FormClosing({param($sender,$eventArgs) if($script:Busy){$script:Cancelled=$true;$eventArgs.Cancel=$true}else{Stop-BsignServer $script:Runtime;$script:Runtime=$null}})
$form.Add_Shown({Start-BsignPreview})
try{
    [Windows.Forms.Application]::Run($form)
    if($UiSmokeTest){if(-not $script:UiReady){throw 'WinForms startup did not reach ready state'};Write-Host 'PASS: Windows Forms controller reached ready state and closed its server'}
}finally{Stop-BsignServer $script:Runtime;$mutex.ReleaseMutex();$mutex.Dispose();$form.Dispose()}
