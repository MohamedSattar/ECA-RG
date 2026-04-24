$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64" }
$hj      = $h + @{ "Content-Type" = "application/json" }

function Kudu-Cmd([string]$cmd, [string]$dir = "/home/site/wwwroot") {
    $body = @{ command = $cmd; dir = $dir } | ConvertTo-Json
    try { (Invoke-RestMethod "https://$scm/api/command" -Method POST -Headers $hj -Body $body -TimeoutSec 20).Output }
    catch { "ERROR: $($_.Exception.Message.Split([char]10)[0])" }
}

Write-Host "=== dotfiles in node-build.mjs? ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "grep -n 'dotfiles' dist/server/node-build.mjs || echo 'NOT FOUND'")

Write-Host "`n=== .well-known dir on Azure ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls -la dist/spa/.well-known/ 2>/dev/null || echo 'dir NOT FOUND'")

Write-Host "`n=== node-build.mjs static line ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "grep -n 'static' dist/server/node-build.mjs | head -5")

Write-Host "`n=== node-build.mjs modification time ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls -la dist/server/node-build.mjs")
