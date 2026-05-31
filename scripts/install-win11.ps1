#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Programs\CodexLight'),
  [switch]$SkipBuild,
  [switch]$StartOnLogin,
  [switch]$NoLaunch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[Codex Light] $Message" -ForegroundColor Cyan
}

function Resolve-CommandPath {
  param([string]$Name)

  $command = Get-Command "$Name.cmd" -ErrorAction SilentlyContinue
  if (-not $command) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
  }
  if (-not $command) {
    throw "Required command '$Name' was not found in PATH."
  }
  return $command.Source
}

function New-CodexLightShortcut {
  param(
    [string]$ShortcutPath,
    [string]$TargetPath,
    [string]$WorkingDirectory
  )

  $shortcutParent = Split-Path -Parent $ShortcutPath
  New-Item -ItemType Directory -Force -Path $shortcutParent | Out-Null

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $TargetPath
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.IconLocation = $TargetPath
  $shortcut.Description = 'Codex Light'
  $shortcut.Save()
}

if (-not $env:LOCALAPPDATA) {
  throw 'LOCALAPPDATA is not set. Run this script from Windows PowerShell on Win11.'
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
$packageDir = Join-Path $repoRoot 'dist\win-unpacked'
$packagedExe = Join-Path $packageDir 'Codex Light.exe'
$runtimeDir = Join-Path $env:LOCALAPPDATA 'CodexLight'

Write-Step "Repository: $repoRoot"
Write-Step "Install directory: $InstallDir"

if (-not $SkipBuild) {
  $nodePath = Resolve-CommandPath 'node'
  $npmPath = Resolve-CommandPath 'npm'
  Write-Step "Using Node: $nodePath"
  Write-Step 'Building unpacked Windows app with npm run package:win:dir'

  Push-Location $repoRoot
  try {
    & $npmPath install
    & $npmPath run package:win:dir
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $packagedExe)) {
  throw "Packaged app not found: $packagedExe. Run without -SkipBuild or build with npm run package:win:dir first."
}

Write-Step 'Stopping existing Codex Light processes'
Get-Process -Name 'Codex Light' -ErrorAction SilentlyContinue | Stop-Process -Force

$installParent = Split-Path -Parent $InstallDir
New-Item -ItemType Directory -Force -Path $installParent | Out-Null

if (Test-Path $InstallDir) {
  $backupDir = "$InstallDir.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Write-Step "Backing up existing install to $backupDir"
  Move-Item -Path $InstallDir -Destination $backupDir
}

Write-Step 'Copying application files'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Path (Join-Path $packageDir '*') -Destination $InstallDir -Recurse -Force

Write-Step "Preparing runtime directory: $runtimeDir"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

$installedExe = Join-Path $InstallDir 'Codex Light.exe'
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Codex Light.lnk'
$startMenuShortcut = Join-Path (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs') 'Codex Light.lnk'
$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Codex Light.lnk'

Write-Step 'Creating Desktop shortcut'
New-CodexLightShortcut -ShortcutPath $desktopShortcut -TargetPath $installedExe -WorkingDirectory $InstallDir

Write-Step 'Creating Start Menu shortcut'
New-CodexLightShortcut -ShortcutPath $startMenuShortcut -TargetPath $installedExe -WorkingDirectory $InstallDir

if ($StartOnLogin) {
  Write-Step 'Creating Startup shortcut'
  New-CodexLightShortcut -ShortcutPath $startupShortcut -TargetPath $installedExe -WorkingDirectory $InstallDir
}

if (-not $NoLaunch) {
  Write-Step 'Launching Codex Light'
  Start-Process -FilePath $installedExe -WorkingDirectory $InstallDir
}

Write-Host ''
Write-Host 'Codex Light installed successfully.' -ForegroundColor Green
Write-Host "App: $installedExe"
Write-Host "Runtime: $runtimeDir"
Write-Host "Desktop shortcut: $desktopShortcut"
Write-Host "Start Menu shortcut: $startMenuShortcut"
if ($StartOnLogin) {
  Write-Host "Startup shortcut: $startupShortcut"
}
