$subBody = @{
    primaryContactName  = "Live Verification Admin"
    primaryContactEmail = "prod_verify_admin_001@societytest.org"
    primaryContactPhone = "+919876543299"
    societyName         = "Live Test Green Palms RWA 99"
    societyType         = "HOUSING_SOCIETY"
    totalFlats          = 36
    numberOfWings       = 2
    address             = "Plot 99, Marine Drive"
    city                = "Bhubaneswar"
    state               = "Odisha"
    postalCode          = "751024"
    managementMethod    = "MANAGING_COMMITTEE"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "https://society-one-portal.onrender.com/api/public/society-requests" -Method Post -ContentType "application/json" -Body $subBody
    Write-Host "Success:" ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error Status:" $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errBody = $reader.ReadToEnd()
    Write-Host "Error Body:" $errBody
}
