$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64" }
$hj      = $h + @{ "Content-Type" = "application/json" }

function Kudu-Cmd([string]$cmd, [string]$dir = "/home/site/wwwroot") {
    $body = @{ command = $cmd; dir = $dir } | ConvertTo-Json
    try { (Invoke-RestMethod "https://$scm/api/command" -Method POST -Headers $hj -Body $body -TimeoutSec 30).Output }
    catch { "ERROR: $($_.Exception.Message.Split([char]10)[0])" }
}

Write-Host "=== oryx-manifest.toml ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "cat oryx-manifest.toml")

Write-Host "`n=== Oryx startup script ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "cat /home/oryx-start.sh 2>/dev/null || echo NOT FOUND" "/home")
Write-Host (Kudu-Cmd "ls /opt/startup/ 2>/dev/null || echo NOT FOUND" "/home")

Write-Host "`n=== Try running node directly (captures crash output) ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "timeout 5 node dist/server/node-build.mjs 2>&1 || echo 'process exited'")

Write-Host "`n=== Check if /node_modules has express ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls /node_modules/express 2>/dev/null | head -5 || echo 'express NOT in /node_modules'" "/home")

Write-Host "`n=== PATH and node location ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd 'which node && node --version && echo "PATH=$PATH"')
