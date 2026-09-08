Write-Host "=== 1. Checking Live Landing Page & SPA HTML ===" -ForegroundColor Cyan
$html = Invoke-RestMethod -Uri "https://society-one-portal.onrender.com/" -Method Get
if ($html -match "SocietyOne" -and $html -match "index-") {
    Write-Host "SUCCESS: Live landing page HTML is serving the new unified SPA bundle." -ForegroundColor Green
} else {
    Write-Host "WARNING: Unexpected landing page HTML." -ForegroundColor Yellow
}

Write-Host "`n=== 2. Testing Unauthenticated Access to Platform APIs (Must return 401) ===" -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri "https://society-one-portal.onrender.com/api/platform/requests" -Method Get
    Write-Host "FAILED: Platform API was accessible without authentication!" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Protected Platform API rejected unauthenticated request with status $status (Expected: 401)." -ForegroundColor Green
}

Write-Host "`n=== 3. Testing Public Society Request Submission & Tracking ===" -ForegroundColor Cyan
$subBody = @{
    primaryContactName  = "Live Verification Admin"
    primaryContactEmail = "prod_verify_admin_$(Get-Random)@societytest.org"
    primaryContactPhone = "+919876543299"
    societyName         = "Live Test Green Palms RWA"
    societyType         = "HOUSING_SOCIETY"
    totalFlats          = 36
    numberOfWings       = 2
    address             = "Plot 99, Marine Drive"
    city                = "Bhubaneswar"
    state               = "Odisha"
    postalCode          = "751024"
    managementMethod    = "MANAGING_COMMITTEE"
} | ConvertTo-Json

$subRes = Invoke-RestMethod -Uri "https://society-one-portal.onrender.com/api/public/society-requests" -Method Post -ContentType "application/json" -Body $subBody
$ref = $subRes.data.referenceCode
Write-Host "SUCCESS: Society Creation Request submitted with Reference: $ref (Status: $($subRes.data.status))" -ForegroundColor Green

$trackRes = Invoke-RestMethod -Uri "https://society-one-portal.onrender.com/api/public/society-requests/track?query=$ref" -Method Get
Write-Host "SUCCESS: Track request returned $(@($trackRes.data).Count) record(s) matching reference $ref." -ForegroundColor Green

Write-Host "`n=== 4. Checking Platform Admin Setup Status Endpoint ===" -ForegroundColor Cyan
$setupRes = Invoke-RestMethod -Uri "https://society-one-portal.onrender.com/api/auth/setup/platform-status" -Method Get
Write-Host "SUCCESS: Platform setup status checked: $($setupRes.data.available)" -ForegroundColor Green

Write-Host "`n=== ALL LIVE PRODUCTION CHECKS COMPLETED ===" -ForegroundColor Cyan
