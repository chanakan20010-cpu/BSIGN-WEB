Option Explicit
Dim fs, root, script, shell, command, result
Set fs = CreateObject("Scripting.FileSystemObject")
root = fs.GetParentFolderName(WScript.ScriptFullName)
script = fs.BuildPath(root, "scripts\windows\preview.ps1")
If Not fs.FileExists(script) Then
  MsgBox "Please extract the entire ZIP folder before opening preview.", 48, "BSIGN TECH"
  WScript.Quit 1
End If
Set shell = CreateObject("WScript.Shell")
command = "powershell.exe -NoLogo -NoProfile -STA -ExecutionPolicy RemoteSigned -WindowStyle Hidden -File " & Chr(34) & script & Chr(34)
If WScript.Arguments.Named.Exists("test-ui") Then command = command & " -UiSmokeTest"
result = shell.Run(command, 0, True)
If result <> 0 And Not WScript.Arguments.Named.Exists("test-ui") Then
  MsgBox "Windows could not open the preview launcher." & vbCrLf & "If Windows blocked the downloaded ZIP, open ZIP Properties, select Unblock, then extract it again." & vbCrLf & "See START-HERE.html for help.", 48, "BSIGN TECH"
End If
WScript.Quit result
