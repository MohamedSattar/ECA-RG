$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$AppUrl  = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64" }
$hj      = $h + @{ "Content-Type" = "application/json" }

# Changing an app setting triggers a container restart on Azure App Service Linux
Write-Host "Triggering container restart via settings change ..." -ForegroundColor Cyan
$ts = (Get-Date -Format "yyyyMMddHHmmss")
Invoke-RestMethod "https://$scm/api/settings" -Method POST -Headers $hj `
    -Body (@{ LAST_RESTART = $ts } | ConvertTo-Json) | Out-Null
Write-Host "  Settings updated (LAST_RESTART=$ts) -- container will restart" -ForegroundColor Green

Write-Host "Waiting 35s for container to come back up ..." -ForegroundColor Cyan
Start-Sleep -Seconds 35

$verifyUrl = "$AppUrl/.well-known/microsoft-identity-association.json"
Write-Host "Verifying $verifyUrl ..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest $verifyUrl -UseBasicParsing -TimeoutSec 15
        $ct = $r.Headers["Content-Type"]
        if ($r.Content -match '"associatedApplications"') {
            Write-Host "`n  SUCCESS  HTTP $($r.StatusCode)  Content-Type: $ct" -ForegroundColor Green
            Write-Host "  $($r.Content.Trim())" -ForegroundColor White
        } else {
            Write-Host "  HTTP $($r.StatusCode) but got HTML (still old server?) -- retrying in 15s" -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            continue
        }
        break
    } catch {
        $resp = $_.Exception.Response
        $sc = if ($resp) { $resp.StatusCode.value__ } else { "?" }
        Write-Host "  HTTP $sc -- retrying in 15s"
        Start-Sleep -Seconds 15
    }
}
