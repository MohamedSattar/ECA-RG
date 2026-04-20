$PubUser = '$ResearchGrants-Portal'
$PubPass = "2lrdBEq9A6Yikdj3j44egi0qcoRc0ySkhxizGP6QsoTvzPCzcYozKWTyivS5"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${PubUser}:${PubPass}"))
$h   = @{ Authorization = "Basic $b64" }
$scm = "researchgrants-portal-fub3erb6hwawctay.scm.uaenorth-01.azurewebsites.net"

# Two most active logs today
$logs = @(
    "https://$scm/api/vfs/LogFiles/2026_04_20_lm0sdlwk0000E9_docker.log",
    "https://$scm/api/vfs/LogFiles/2026_04_20_lm1sdlwk0000BC_docker.log"
)

foreach ($url in $logs) {
    $name = ($url -split "/")[-1]
    Write-Host "`n===== $name (last 100 lines) =====" -ForegroundColor Cyan
    try {
        $content = Invoke-RestMethod $url -Headers $h
        ($content -split "`n") | Select-Object -Last 100 | ForEach-Object { Write-Host $_ }
    } catch { Write-Host "ERROR: $_" }
}
