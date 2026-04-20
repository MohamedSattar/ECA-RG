$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$scm     = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"
$b64     = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h       = @{ Authorization = "Basic $b64" }

# Try docker/application logs via Kudu vfs
$logPaths = @(
    "https://$scm/api/vfs/LogFiles/Application/",
    "https://$scm/api/vfs/LogFiles/eventlog.xml",
    "https://$scm/api/vfs/home/LogFiles/docker/"
)

foreach ($lp in $logPaths) {
    Write-Host "`n=== $lp ===" -ForegroundColor Cyan
    try {
        $r = Invoke-RestMethod $lp -Headers $h
        if ($r -is [array]) {
            $r | Sort-Object mtime -Descending | Select-Object -First 5 | ForEach-Object {
                Write-Host "  $($_.name)  $($_.mtime)"
            }
        } else {
            Write-Host ($r | Out-String | Select-Object -First 100)
        }
    } catch { Write-Host "  Not accessible: $($_.Exception.Message.Split([char]10)[0])" }
}

# List wwwroot to confirm files landed
Write-Host "`n=== wwwroot contents ===" -ForegroundColor Cyan
try {
    $files = Invoke-RestMethod "https://$scm/api/vfs/site/wwwroot/" -Headers $h
    $files | ForEach-Object { Write-Host "  $($_.name)  $($_.size)" }
} catch { Write-Host "  $_" }

# Most recent docker log file
Write-Host "`n=== Latest Docker Log ===" -ForegroundColor Cyan
try {
    $dockerFiles = Invoke-RestMethod "https://$scm/api/vfs/home/LogFiles/docker/" -Headers $h
    $latest = $dockerFiles | Where-Object { $_.name -notmatch "_default_docker" } |
              Sort-Object mtime -Descending | Select-Object -First 1
    if ($latest) {
        Write-Host "Reading: $($latest.name)" -ForegroundColor Yellow
        $content = Invoke-RestMethod "https://$scm/api/vfs/home/LogFiles/docker/$($latest.name)" -Headers $h
        $lines = $content -split "`n"
        $lines | Select-Object -Last 60 | ForEach-Object { Write-Host $_ }
    }
} catch { Write-Host "  $_" }
