# Roda sync:all (AC -> Meta -> views) e grava log diario.
# Acionado pelo Windows Task Scheduler as 9h horario de Brasilia.

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogsDir = Join-Path $ProjectRoot "logs"
$null = New-Item -ItemType Directory -Force -Path $LogsDir
$Today = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $LogsDir "sync-$Today.log"

Set-Location $ProjectRoot

"========================================" | Out-File -FilePath $LogFile -Append
"Iniciando sync em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')" | Out-File -FilePath $LogFile -Append
"========================================" | Out-File -FilePath $LogFile -Append

# Garante que npm/node estao no PATH (Task Scheduler pode rodar com PATH minimo)
$NpmPath = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Path
if (-not $NpmPath) {
  $NpmPath = "C:\Program Files\nodejs\npm.cmd"
}

if (-not (Test-Path $NpmPath)) {
  "ERRO: npm.cmd nao encontrado. Caminho tentado: $NpmPath" | Out-File -FilePath $LogFile -Append
  exit 1
}

& $NpmPath run sync:all 2>&1 | Out-File -FilePath $LogFile -Append
$ExitCode = $LASTEXITCODE

"========================================" | Out-File -FilePath $LogFile -Append
"Concluido em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz') | exit=$ExitCode" | Out-File -FilePath $LogFile -Append
"========================================" | Out-File -FilePath $LogFile -Append

exit $ExitCode
