# Libère le port 8000 (Windows) avant de relancer uvicorn
$pids = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if (-not $pids) {
  Write-Host "Port 8000 is free."
  exit 0
}
foreach ($pid in $pids) {
  Write-Host "Stopping PID $pid ..."
  Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1
Write-Host "Done. Run: python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
