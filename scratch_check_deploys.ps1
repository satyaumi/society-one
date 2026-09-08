$headers = @{
    "Authorization" = "Bearer rnd_D6FKRoqDRLX0aMByFOq2DXX8ESep"
    "Accept"        = "application/json"
}

$deploys = Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-dag32gmk1f9s73dvv1p0/deploys?limit=3" -Method Get -Headers $headers
$deploys | ForEach-Object {
    [PSCustomObject]@{
        id         = $_.deploy.id
        status     = $_.deploy.status
        commit     = $_.deploy.commit.message
        createdAt  = $_.deploy.createdAt
        updatedAt  = $_.deploy.updatedAt
    }
} | Format-Table -AutoSize
