#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Programs\CodexLight'),
  [switch]$RemoveRuntime
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[Codex Light] $Message" -ForegroundColor Cyan
}

if (-not $env:LOCALAPPDATA) {
  throw 'LOCALAPPDATA is not set. Run this script from Windows PowerShell on Win11.'
}

$runtimeDir = Join-Path $env:LOCALAPPDATA 'CodexLight'
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Codex Light.lnk'
$startMenuShortcut = Join-Path (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs') 'Codex Light.lnk'
$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Codex Light.lnk'

Write-Step 'Stopping Codex Light processes'
Get-Process -Name 'Codex Light' -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Step 'Removing Desktop, Start Menu, and Startup shortcuts'
foreach ($path in @($desktopShortcut, $startMenuShortcut, $startupShortcut)) {
  if (Test-Path $path) {
    Write-Step "Removing shortcut: $path"
    Remove-Item -Path $path -Force
  }
}

if (Test-Path $InstallDir) {
  Write-Step "Removing install directory: $InstallDir"
  Remove-Item -Path $InstallDir -Recurse -Force
}

if ($RemoveRuntime) {
  if (Test-Path $runtimeDir) {
    Write-Step "Removing runtime directory: $runtimeDir"
    Remove-Item -Path $runtimeDir -Recurse -Force
  }
} else {
  Write-Step "Preserving runtime directory: $runtimeDir"
}

Write-Host ''
Write-Host 'Codex Light uninstalled successfully.' -ForegroundColor Green
if (-not $RemoveRuntime) {
  Write-Host "Runtime data was preserved. Re-run with -RemoveRuntime to delete: $runtimeDir"
}
