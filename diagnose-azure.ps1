$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$AppUrl  = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64" }
$hj      = $h + @{ "Content-Type" = "application/json" }

function Kudu-Cmd([string]$cmd, [string]$dir = "/home/site/wwwroot") {
    $body = @{ command = $cmd; dir = $dir } | ConvertTo-Json
    try { (Invoke-RestMethod "https://$scm/api/command" -Method POST -Headers $hj -Body $body -TimeoutSec 20).Output }
    catch { "ERROR: $($_.Exception.Message.Split([char]10)[0])" }
}

Write-Host "=== 1. Current Kudu App Settings ===" -ForegroundColor Cyan
try {
    $settings = Invoke-RestMethod "https://$scm/api/settings" -Headers $h
    $settings.PSObject.Properties | Sort-Object Name | ForEach-Object {
        Write-Host "  $($_.Name) = $($_.Value)"
    }
} catch { Write-Host "ERROR: $_" }

Write-Host "`n=== 2. wwwroot contents ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls -la")

Write-Host "`n=== 3. node_modules presence ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls node_modules 2>/dev/null | wc -l && echo packages")

Write-Host "`n=== 4. .env file (first 3 lines) ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "head -3 .env 2>/dev/null || echo 'NO .env FILE'")

Write-Host "`n=== 5. dist/server contents ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls dist/server/")

Write-Host "`n=== 6. Running node processes ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd 'ps aux 2>/dev/null | grep -v grep | grep node || echo "NO NODE PROCESS"' "/home")

Write-Host "`n=== 7. PORT env var ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd 'printenv PORT 2>/dev/null || echo "PORT NOT SET"')

Write-Host "`n=== 8. App health ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest "$AppUrl/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "  HTTP $($r.StatusCode): $($r.Content)" -ForegroundColor Green
} catch {
    $resp = $_.Exception.Response
    if ($resp) { Write-Host "  HTTP $($resp.StatusCode.value__)" -ForegroundColor Yellow }
    else { Write-Host "  $($_.Exception.Message)" -ForegroundColor Red }
}
