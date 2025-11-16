#!/usr/bin/env pwsh
param(
    [switch]$NonInteractive
)
$ErrorActionPreference = 'Stop'

function Write-Info($msg){ Write-Host "[i] $msg" -ForegroundColor Cyan }
function Write-Ok($msg){ Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[x] $msg" -ForegroundColor Red }

# Project root = this script's parent directory's parent
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

$Python = ${env:PYTHON_BIN}
if (-not $Python) { $Python = 'python' }

Write-Info "Using python: $Python"

$VenvDir = ${env:VENV_DIR}
if (-not $VenvDir) { $VenvDir = '.venv' }

if (-not (Test-Path $VenvDir)) {
  Write-Info "Creating virtual environment in $VenvDir"
  & $Python -m venv $VenvDir
} else {
  Write-Info "Virtual environment already exists: $VenvDir"
}

# Activate venv for current session
$Activate = Join-Path $VenvDir 'Scripts' 'Activate.ps1'
. $Activate
Write-Ok "Activated venv: $VenvDir"

Write-Info "Upgrading pip and installing requirements"
python -m pip install --upgrade pip
pip install -r requirements.txt
Write-Ok "Dependencies installed"

if (-not (Test-Path '.env')) {
  if (Test-Path '.env-EXAMPLE') {
    Write-Info "Creating .env from .env-EXAMPLE"
    Copy-Item '.env-EXAMPLE' '.env'
  } else {
    Write-Warn ".env-EXAMPLE not found; creating minimal .env"
    @(
      'EMBEDDINGS_BACKEND=sbert'
      'LLM_BACKEND=openrouter'
      'OPENROUTER_API_KEY='
    ) | Set-Content -Path '.env' -Encoding UTF8
  }
} else {
  Write-Info ".env already exists; leaving it as-is"
}

if (-not $NonInteractive) {
  $envContent = Get-Content '.env' -Raw
  if ($envContent -notmatch '(?m)^OPENROUTER_API_KEY=') {
    Add-Content '.env' 'OPENROUTER_API_KEY='
    $envContent = Get-Content '.env' -Raw
  }
  $currentKey = ($envContent -split "`n") | Where-Object { $_ -match '^(?i)OPENROUTER_API_KEY=' } | Select-Object -First 1
  $currentVal = ''
  if ($currentKey) { $currentVal = $currentKey -replace '^(?i)OPENROUTER_API_KEY=', '' }

  if (-not $currentVal -or $currentVal -eq '<YOUR_OPENROUTER_API_KEY>') {
    $keyInput = Read-Host 'Enter your OpenRouter API key (leave blank to skip)'
    if ($keyInput) {
      (Get-Content '.env') | ForEach-Object {
        if ($_ -match '^(?i)OPENROUTER_API_KEY=') { "OPENROUTER_API_KEY=$keyInput" } else { $_ }
      } | Set-Content '.env'
      Write-Ok 'Saved OPENROUTER_API_KEY to .env'
    } else {
      Write-Warn 'Skipped setting OPENROUTER_API_KEY; hosted backends will not work until you add it.'
    }
  }
}

Write-Ok 'Setup complete. Next steps:'
Write-Host '  1) Put your PDFs/DOCX/TXT/MD into data/'
Write-Host '  2) Activate venv: .\.venv\Scripts\activate'
Write-Host '  3) Run: python ingest.py'
Write-Host '  4) Run: streamlit run app.py'
