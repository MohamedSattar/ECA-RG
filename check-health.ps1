$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$AppUrl  = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net"

$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h   = @{ Authorization = "Basic $b64" }

# --- Deployment log ---
Write-Host "=== Deployment Log ===" -ForegroundColor Cyan
try {
    $depId  = (Invoke-RestMethod "https://$scm/api/deployments/latest" -Headers $h).id
    $logs   = Invoke-RestMethod "https://$scm/api/deployments/$depId/log" -Headers $h
    $logs | ForEach-Object { Write-Host "  $($_.log_time)  $($_.message)" }
} catch {
    Write-Host "  Could not fetch deployment log: $_"
}

# --- App process list ---
Write-Host "`n=== Kudu Processes ===" -ForegroundColor Cyan
try {
    $procs = Invoke-RestMethod "https://$scm/api/processes" -Headers $h
    $procs | ForEach-Object { Write-Host "  id=$($_.id)  name=$($_.name)" }
} catch {
    Write-Host "  Could not fetch processes: $_"
}

# --- App stdout log (last 50 lines) ---
Write-Host "`n=== App Stdout Log ===" -ForegroundColor Cyan
try {
    $logContent = Invoke-RestMethod "https://$scm/api/logstream/application" -Headers $h -TimeoutSec 5
    Write-Host $logContent
} catch {
    Write-Host "  (log stream not available or empty)"
}

# --- Health check ---
Write-Host "`n=== Health Check ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest "$AppUrl/health" -UseBasicParsing -TimeoutSec 15
    Write-Host "  HTTP $($r.StatusCode): $($r.Content)" -ForegroundColor Green
} catch {
    $resp = $_.Exception.Response
    if ($resp) { Write-Host "  HTTP $($resp.StatusCode.value__)" -ForegroundColor Yellow }
    else { Write-Host "  $($_.Exception.Message)" -ForegroundColor Red }
}

# --- Root URL check ---
Write-Host "`n=== Root URL ===" -ForegroundColor Cyan
try {
    $r2 = Invoke-WebRequest $AppUrl -UseBasicParsing -TimeoutSec 15
    Write-Host "  HTTP $($r2.StatusCode)" -ForegroundColor Green
} catch {
    $resp2 = $_.Exception.Response
    if ($resp2) { Write-Host "  HTTP $($resp2.StatusCode.value__)" -ForegroundColor Yellow }
    else { Write-Host "  $($_.Exception.Message)" -ForegroundColor Red }
}

# --- Azure App Service environment settings (via Kudu env) ---
Write-Host "`n=== Key App Settings (via Kudu /api/settings) ===" -ForegroundColor Cyan
try {
    $settings = Invoke-RestMethod "https://$scm/api/settings" -Headers $h
    $keyNames = @("WEBSITE_NODE_DEFAULT_VERSION", "SCM_DO_BUILD_DURING_DEPLOYMENT",
                  "DISABLE_ORYX_BUILD", "WEBSITE_RUN_FROM_PACKAGE", "NODE_ENV")
    foreach ($k in $keyNames) {
        if ($settings.PSObject.Properties[$k]) {
            Write-Host "  $k = $($settings.$k)"
        }
    }
} catch {
    Write-Host "  Could not fetch settings: $_"
}
