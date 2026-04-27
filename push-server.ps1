$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$AppUrl  = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net"
$Root    = "C:\Users\mohamed.abdelsattar\Desktop\Prime\Builder\New folder\ECA-RG"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64"; "If-Match" = "*" }
$hj      = @{ Authorization = "Basic $b64"; "Content-Type" = "application/json" }

function Upload-File([string]$local, [string]$remote) {
    $bytes = [IO.File]::ReadAllBytes($local)
    $resp  = Invoke-WebRequest "https://$scm/api/vfs/$remote" -Method PUT `
        -Headers ($h + @{ "Content-Type" = "application/octet-stream" }) -Body $bytes -UseBasicParsing
    Write-Host "  $remote  (HTTP $($resp.StatusCode))" -ForegroundColor Green
}

Write-Host "[1] Uploading new node-build.mjs ..." -ForegroundColor Cyan
Upload-File "$Root\dist\server\node-build.mjs"     "site/wwwroot/dist/server/node-build.mjs"
Upload-File "$Root\dist\server\node-build.mjs.map" "site/wwwroot/dist/server/node-build.mjs.map"

Write-Host "`n[2] Triggering container restart via settings change ..." -ForegroundColor Cyan
$ts = (Get-Date -Format "yyyyMMddHHmmss")
Invoke-RestMethod "https://$scm/api/settings" -Method POST -Headers $hj `
    -Body (@{ LAST_RESTART = $ts } | ConvertTo-Json) | Out-Null
Write-Host "  LAST_RESTART=$ts" -ForegroundColor Green

Write-Host "`n[3] Waiting 35s for container to restart ..." -ForegroundColor Cyan
Start-Sleep -Seconds 35

$verifyUrl = "$AppUrl/.well-known/microsoft-identity-association.json"
Write-Host "[4] Verifying $verifyUrl ..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest $verifyUrl -UseBasicParsing -TimeoutSec 15
        if ($r.Content -match '"associatedApplications"') {
            Write-Host "`n  SUCCESS  HTTP $($r.StatusCode)" -ForegroundColor Green
            Write-Host "  Content-Type: $($r.Headers["Content-Type"])" -ForegroundColor White
            Write-Host "  Body: $($r.Content.Trim())" -ForegroundColor White
            break
        }
        Write-Host "  Got HTML, still restarting -- retry in 15s" -ForegroundColor Yellow
        Start-Sleep -Seconds 15
    } catch {
        $resp = $_.Exception.Response
        $sc = if ($resp) { $resp.StatusCode.value__ } else { "?" }
        Write-Host "  HTTP $sc -- retry in 15s"; Start-Sleep -Seconds 15
    }
}
