# Probar el cron de recordatorios (reemplaza TU_CRON_SECRET por tu valor real)
$secret = $env:CRON_SECRET
if (-not $secret) {
  $secret = "TU_CRON_SECRET"
}
$headers = @{
  Authorization = "Bearer $secret"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/due-reminders" -Headers $headers -UseBasicParsing | Select-Object -ExpandProperty Content
