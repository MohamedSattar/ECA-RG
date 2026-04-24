$url = "https://researchgrants-portal-fub3erb6hwawctay.uaenorth-01.azurewebsites.net/.well-known/microsoft-identity-association.json"
$r = Invoke-WebRequest $url -UseBasicParsing
Write-Host "HTTP $($r.StatusCode)"
Write-Host "Content-Type: $($r.Headers['Content-Type'])"
Write-Host $r.Content
