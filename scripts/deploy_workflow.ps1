# Deploy workflow to n8n
# Usage: Set environment variables N8N_API_KEY and N8N_WORKFLOW_ID before running
$workflowPath = $args[0]
if (-not $workflowPath) {
    Write-Host "Usage: .\deploy_workflow.ps1 <path-to-workflow-json>"
    exit 1
}

$apiKey = $env:N8N_API_KEY
$workflowId = $env:N8N_WORKFLOW_ID

if (-not $apiKey) {
    Write-Host "ERROR: Set N8N_API_KEY environment variable"
    exit 1
}
if (-not $workflowId) {
    Write-Host "ERROR: Set N8N_WORKFLOW_ID environment variable"
    exit 1
}

$n8nUrl = $env:N8N_URL
if (-not $n8nUrl) { $n8nUrl = "https://n8n.usan.org" }

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

$result = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/$workflowId" -Method Put -Headers $headers -Body $body
Write-Host "Workflow updated successfully!"
Write-Host "ID: $($result.id)"
Write-Host "Name: $($result.name)"
