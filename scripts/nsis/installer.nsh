!include LogicLib.nsh

Var StartupShellWasAllUsers

!ifndef BUILD_UNINSTALLER
!include MUI2.nsh
!include nsDialogs.nsh

Var StartOnLoginCheckbox
Var StartOnLoginState
!endif

!macro useCurrentStartupShell
  StrCpy $StartupShellWasAllUsers "0"
  ${If} $installMode == "all"
    StrCpy $StartupShellWasAllUsers "1"
    SetShellVarContext current
  ${EndIf}
!macroend

!macro restoreStartupShell
  ${If} $StartupShellWasAllUsers == "1"
    SetShellVarContext all
    StrCpy $StartupShellWasAllUsers "0"
  ${EndIf}
!macroend

!ifndef BUILD_UNINSTALLER
!macro customCheckAppRunning
  DetailPrint "Closing existing Codex Light processes."
  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$installDir = $$args[0]; Get-Process -Name 'Codex Light' -ErrorAction SilentlyContinue | Where-Object { $$_.Path -and $$_.Path.StartsWith($$installDir, [System.StringComparison]::CurrentCultureIgnoreCase) } | Stop-Process -Force" "$INSTDIR"`
  Pop $0
  ${If} $0 != 0
    nsExec::ExecToLog `"$CmdPath" /C taskkill /F /IM "Codex Light.exe" /T /FI "USERNAME eq %USERNAME%"`
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

  !insertmacro useCurrentStartupShell
  ${If} ${FileExists} "$SMSTARTUP\Codex Light.lnk"
    ${NSD_Check} $StartOnLoginCheckbox
  ${Else}
    ${NSD_Uncheck} $StartOnLoginCheckbox
  ${EndIf}
  !insertmacro restoreStartupShell

  nsDialogs::Show
FunctionEnd

Function StartOnLoginPageLeave
  ${NSD_GetState} $StartOnLoginCheckbox $StartOnLoginState
FunctionEnd

!macro customInstall
  !insertmacro useCurrentStartupShell
  ${If} $StartOnLoginState == ${BST_CHECKED}
    CreateShortCut "$SMSTARTUP\Codex Light.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
  ${ElseIf} $StartOnLoginState == ${BST_UNCHECKED}
    Delete "$SMSTARTUP\Codex Light.lnk"
  ${EndIf}
  !insertmacro restoreStartupShell
!macroend
!endif

!macro customUnInstall
  !insertmacro useCurrentStartupShell
  Delete "$SMSTARTUP\Codex Light.lnk"
  !insertmacro restoreStartupShell
!macroend
