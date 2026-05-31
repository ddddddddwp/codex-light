!include LogicLib.nsh
!include nsDialogs.nsh

Var StartOnLoginCheckbox
Var StartOnLoginState

!macro customCheckAppRunning
  DetailPrint "Closing existing Codex Light processes."
  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name 'Codex Light' -ErrorAction SilentlyContinue | Stop-Process -Force"`
  Pop $0
  ${If} $0 != 0
    nsExec::ExecToLog `"$CmdPath" /C taskkill /F /IM "Codex Light.exe" /T`
    Pop $0
  ${EndIf}
  Sleep 500
!macroend

!macro customPageAfterChangeDir
  Page custom StartOnLoginPageCreate StartOnLoginPageLeave
!macroend

Function StartOnLoginPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "Startup option" "Choose whether Codex Light starts when you sign in."
  ${NSD_CreateLabel} 0 0 100% 24u "Codex Light can start automatically when Windows starts."
  Pop $1
  ${NSD_CreateCheckbox} 0 32u 100% 12u "Start Codex Light when I sign in"
  Pop $StartOnLoginCheckbox
  ${NSD_Uncheck} $StartOnLoginCheckbox

  nsDialogs::Show
FunctionEnd

Function StartOnLoginPageLeave
  ${NSD_GetState} $StartOnLoginCheckbox $StartOnLoginState
FunctionEnd

!macro customInstall
  ${If} $StartOnLoginState == ${BST_CHECKED}
    CreateShortCut "$SMSTARTUP\Codex Light.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
  ${Else}
    Delete "$SMSTARTUP\Codex Light.lnk"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$SMSTARTUP\Codex Light.lnk"
!macroend
