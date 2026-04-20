$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64"; "Content-Type" = "application/json" }

function Kudu-Cmd([string]$cmd, [string]$dir = "/home/site/wwwroot") {
    $body = @{ command = $cmd; dir = $dir } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod "https://$scm/api/command" -Method POST -Headers $h -Body $body -TimeoutSec 30
        return $r.Output
    } catch {
        return "ERROR: $_"
    }
}

Write-Host "=== Node version ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "node --version")

Write-Host "`n=== wwwroot files ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls -la")

Write-Host "`n=== .env file exists? ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls -la .env && head -5 .env")

Write-Host "`n=== dist/server dir ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls dist/server/")

Write-Host "`n=== node_modules installed? ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ls node_modules | head -20")

Write-Host "`n=== Running processes ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "ps aux 2>/dev/null | grep -E 'node|npm' || echo 'no node processes'" "/home")

Write-Host "`n=== PORT env var ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd 'echo "PORT=$PORT"')

Write-Host "`n=== App startup log (last 30 lines) ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "cat /home/LogFiles/Application/*.txt 2>/dev/null | tail -30 || echo 'no app logs'" "/home")
