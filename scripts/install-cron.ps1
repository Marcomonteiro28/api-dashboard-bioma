# Registra a Task Scheduler "Bioma Dashboard Sync Daily" para rodar
# sync-daily.ps1 todos os dias as 09:00 horario local (configure o
# timezone do Windows para America/Sao_Paulo).

$TaskName = "Bioma Dashboard Sync Daily"
$ScriptPath = Join-Path $PSScriptRoot "sync-daily.ps1"

if (-not (Test-Path $ScriptPath)) {
  Write-Error "sync-daily.ps1 nao encontrado em $ScriptPath"
  exit 1
}

# Remove versao anterior se existir
Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

$Action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

$Trigger = New-ScheduledTaskTrigger `
  -Daily `
  -At "09:00:00"

$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$Principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Principal $Principal `
  -Description "Sync diario AC + Meta -> BQ para dashboard Bioma. Roda 09:00 horario local."

$Tz = (Get-TimeZone).Id
Write-Host "Tarefa registrada: '$TaskName' as 09:00 ($Tz)"
Write-Host "Para testar manualmente: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Para ver status: Get-ScheduledTaskInfo -TaskName '$TaskName'"
Write-Host "Para remover: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
