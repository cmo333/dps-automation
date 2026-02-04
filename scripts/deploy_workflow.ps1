$workflowPath = "C:\Users\chris\Downloads\dps-automation\dps-automation\templates\workflow_dps_test.json"
$apiKey = "REDACTED_N8N_API_KEY"
$workflowId = "djhJ7QRU90IYXtm1"

$workflowJson = Get-Content -Path $workflowPath -Raw
$workflow = ConvertFrom-Json $workflowJson

$body = @{
    name = $workflow.name
    nodes = $workflow.nodes
    connections = $workflow.connections
    settings = $workflow.settings
} | ConvertTo-Json -Depth 20

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

$result = Invoke-RestMethod -Uri "https://n8n.usan.org/api/v1/workflows/$workflowId" -Method Put -Headers $headers -Body $body
Write-Host "Workflow updated successfully!"
Write-Host "ID: $($result.id)"
Write-Host "Name: $($result.name)"
