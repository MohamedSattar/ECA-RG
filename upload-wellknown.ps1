$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$AppUrl  = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net"
$Root    = "C:\Users\mohamed.abdelsattar\Desktop\Prime\Builder\New folder\ECA-RG"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64" }

function Upload-File([string]$localPath, [string]$remotePath) {
    $url   = "https://$scm/api/vfs/$remotePath"
    $bytes = [IO.File]::ReadAllBytes($localPath)
    # If-Match: * is required by Kudu VFS to overwrite existing files
    $putH  = $h + @{ "If-Match" = "*"; "Content-Type" = "application/octet-stream" }
    try {
        $resp = Invoke-WebRequest $url -Method PUT -Headers $putH -Body $bytes -UseBasicParsing
        Write-Host "  Uploaded $remotePath (HTTP $($resp.StatusCode))" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response; $sc = if ($code) { $code.StatusCode.value__ } else { "?" }
        Write-Host "  FAILED $remotePath (HTTP $sc): $($_.Exception.Message.Split([char]10)[0])" -ForegroundColor Red
        throw
    }
}

Write-Host "`n[1] Uploading server bundle (dotfiles fix) ..." -ForegroundColor Cyan
Upload-File "$Root\dist\server\node-build.mjs"     "site/wwwroot/dist/server/node-build.mjs"
Upload-File "$Root\dist\server\node-build.mjs.map" "site/wwwroot/dist/server/node-build.mjs.map"

Write-Host "`n[2] Uploading microsoft-identity-association.json ..." -ForegroundColor Cyan
Upload-File "$Root\microsoft-identity-association.json" `
    "site/wwwroot/dist/spa/.well-known/microsoft-identity-association.json"

Write-Host "`n[3] Restarting app ..." -ForegroundColor Cyan
$restartJob = Start-Job {
    param($url, $auth)
    try { Invoke-WebRequest $url -Method DELETE -Headers @{ Authorization = $auth } `
        -UseBasicParsing -TimeoutSec 10 | Out-Null } catch {}
} -ArgumentList "https://$scm/api/processes/0", "Basic $b64"
Wait-Job $restartJob -Timeout 12 | Out-Null
Remove-Job $restartJob -Force | Out-Null
Write-Host "  Restart signal sent" -ForegroundColor Green

Write-Host "`n[4] Waiting 20s then verifying ..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

$verifyUrl = "$AppUrl/.well-known/microsoft-identity-association.json"
try {
    $r = Invoke-WebRequest $verifyUrl -UseBasicParsing -TimeoutSec 15
    Write-Host "`n  SUCCESS  HTTP $($r.StatusCode)" -ForegroundColor Green
    Write-Host "  URL: $verifyUrl" -ForegroundColor White
    Write-Host "  Body: $($r.Content)" -ForegroundColor White
} catch {
    $resp2 = $_.Exception.Response; $code = if ($resp2) { $resp2.StatusCode.value__ } else { 0 }
    Write-Host "`n  HTTP $code at $verifyUrl" -ForegroundColor Yellow
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
}
