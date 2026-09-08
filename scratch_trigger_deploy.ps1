$headers = @{
    "Authorization" = "Bearer rnd_D6FKRoqDRLX0aMByFOq2DXX8ESep"
    "Accept"        = "application/json"
    "Content-Type"  = "application/json"
}

$response = Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-dag32gmk1f9s73dvv1p0/deploys" -Method Post -Headers $headers -Body "{}"
$response | ConvertTo-Json -Depth 5
