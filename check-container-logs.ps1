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

Write-Host "=== /home/LogFiles/ directory ===" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod "https://$scm/api/vfs/home/LogFiles/" -Headers $h
    $r | ForEach-Object { Write-Host "  $($_.name)  ($($_.mime))" }
} catch { Write-Host "  $_" }

Write-Host "`n=== Docker log files ===" -ForegroundColor Cyan
try {
    $files = Invoke-RestMethod "https://$scm/api/vfs/home/LogFiles/docker/" -Headers $h
    $files | Sort-Object mtime -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.name)  $($_.mtime)  $($_.size) bytes"
    }
} catch { Write-Host "  $_" }

Write-Host "`n=== Latest app container log (last 80 lines) ===" -ForegroundColor Cyan
try {
    $dockerFiles = Invoke-RestMethod "https://$scm/api/vfs/home/LogFiles/docker/" -Headers $h
    # Get the main app container log (not default_docker which is the SCM container)
    $latest = $dockerFiles | Where-Object { $_.name -match "\.log$" } |
              Sort-Object mtime -Descending | Select-Object -First 1
    if ($latest) {
        Write-Host "  File: $($latest.name)" -ForegroundColor Yellow
        $content = Invoke-RestMethod "https://$scm/api/vfs/home/LogFiles/docker/$($latest.name)" -Headers $h
        ($content -split "`n") | Select-Object -Last 80 | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "  No .log files found"
    }
} catch { Write-Host "  $_" }

Write-Host "`n=== Kudu /api/logs/docker (last 50 lines) ===" -ForegroundColor Cyan
try {
    # This streams the live docker log
    $dockerLog = Invoke-WebRequest "https://$scm/api/logs/docker" -Headers $h -UseBasicParsing -TimeoutSec 10
    ($dockerLog.Content -split "`n") | Select-Object -Last 50 | ForEach-Object { Write-Host $_ }
} catch { Write-Host "  $_" }

Write-Host "`n=== Oryx startup scripts in /opt ===" -ForegroundColor Cyan
Write-Host (Kudu-Cmd "find /opt -name '*.sh' 2>/dev/null | head -20" "/home")
Write-Host (Kudu-Cmd "ls /opt/startup/ 2>/dev/null" "/home")
Write-Host (Kudu-Cmd "cat /opt/startup/startup.sh 2>/dev/null || echo NOT_FOUND" "/home")
