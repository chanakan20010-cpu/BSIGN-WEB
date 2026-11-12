Option Explicit
Dim fs, root, launcher, shell, command, result, mode
Set fs = CreateObject("Scripting.FileSystemObject")
root = fs.GetParentFolderName(WScript.ScriptFullName)
launcher = fs.BuildPath(root, "START-WINDOWS.cmd")
If Not fs.FileExists(launcher) Then
  MsgBox "Please extract the entire ZIP folder before opening preview.", 48, "BSIGN TECH"
  WScript.Quit 1
End If
Set shell = CreateObject("WScript.Shell")
mode = " -Gui"
If WScript.Arguments.Named.Exists("test-ui") Then mode = " -UiSmokeTest"
command = "cmd.exe /d /v:off /c " & Chr(34) & Chr(34) & launcher & Chr(34) & mode & Chr(34)
result = shell.Run(command, 0, True)
If result <> 0 And Not WScript.Arguments.Named.Exists("test-ui") Then
  MsgBox "Windows could not open the preview launcher." & vbCrLf & "Open START-WINDOWS to read the error. Organization signing policies may require IT approval." & vbCrLf & "See START-HERE.html for help.", 48, "BSIGN TECH"
End If
WScript.Quit result
