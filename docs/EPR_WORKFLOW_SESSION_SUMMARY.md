# EPR Compliance Escalation Workflow - Session Summary

## What We Built

An n8n workflow that automates EPR (Electronic Positive Response) compliance outreach for USAN Member Services.

### Workflow Features

| Feature | Status |
|---------|--------|
| Manual trigger (not scheduled) | Done |
| Read EPR data from Google Sheet | Done |
| Filter members below 90% response rate | Done |
| 30-day cooldown (skip recently contacted) | Done |
| HubSpot Station Code lookup | Done |
| Get Company owner from HubSpot | Done |
| Personalized rep signatures (Christian, Germain, Trevor) | Done |
| Exclude Nick's companies | Done |
| 10 emails per rep per run limit | Done |
| Mailgun email sending | Done |
| TEST MODE (redirects to christian.olesen@usan.org) | Done |
| Log all outreach to Google Sheet | Done |

### Files Created/Modified

- `templates/workflow_epr_escalation.json` - Main workflow template
- `templates/workflow_epr_escalation_test.json` - Simplified test workflow
- `config/env.local.json` - Added workflow names
- `scripts/deploy_workflows.mjs` - Added EPR workflow deployment

### Workflow Flow

```
Manual Trigger
    |
Fetch EPR Data + Fetch Outreach Log (parallel)
    |
Merge Data
    |
Filter Candidates (<90%, not recently contacted)
    |
Search HubSpot Station Code
    |
Get Company Association
    |
Get Company Details (owner)
    |
Get Owner Email
    |
Check Owner (skip Nick's companies)
    |
Get Contacts Association
    |
Find Member Rep Contact
    |
Get Contact Details (email, name)
    |
Build Email (personalized signature)
    |
Send via Mailgun
    |
Log to outreach_log sheet
```

---

## Where Claude Failed

### 1. HubSpot Credential Permission Issue

**Problem:** n8n workflows deployed via API don't have access to credentials created in the UI. Every HubSpot HTTP Request node failed with:
```
Node 'Search HubSpot Station' does not have access to the credential
```

**What was tried that didn't work:**
- Using `predefinedCredentialType` with `hubspotAppTokenApi`
- Using Generic Credential Type with Header Auth
- Creating credentials from within the node

**Solution attempted (not yet verified):**
Changed all 6 HubSpot nodes from credential-based auth to **inline headers**:
```json
{
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [{
      "name": "Authorization",
      "value": "Bearer pat-na1-YOUR_HUBSPOT_PAT_HERE"
    }]
  }
}
```

**Nodes updated:**
1. Search HubSpot Station
2. Get Company Assoc
3. Get Company
4. Get Owner
5. Get Contacts
6. Get Contact Details

### 2. n8n API Doesn't Support PATCH

**Problem:** Tried to update workflow with PATCH request, got 405 error.

**Solution:** Delete workflow and create new one via POST.

### 3. Context Loss During Long Session

**Problem:** During compressed context, Claude forgot the inline header solution we had discussed.

**Solution:** User triggered manual compaction with summary notes.

---

## Current State

- **Template file:** Updated with inline headers (all 6 HubSpot nodes)
- **Old workflow:** Deleted (ID: `Bbe3AlRpOC6repYj`)
- **New workflow:** Needs to be created from updated template

## Next Steps

1. **Deploy the updated template** to n8n:
```bash
curl -X POST "https://n8n.usan.org/api/v1/workflows" \
  -H "X-N8N-API-KEY: <key>" \
  -H "Content-Type: application/json" \
  -d @templates/workflow_epr_escalation.json
```

2. **Test the workflow** - trigger manually and verify:
   - HubSpot API calls succeed (no credential errors)
   - Correct rep signature appears based on Company owner
   - Email goes to christian.olesen@usan.org (TEST MODE)
   - Outreach logged to Google Sheet

3. **If inline headers still fail**, the nuclear option is to:
   - Manually create the workflow in n8n UI
   - Manually configure each HubSpot node with credentials
   - Export and save as the canonical template

## Key Config Values

| Item | Value |
|------|-------|
| n8n URL | `https://n8n.usan.org` |
| HubSpot Token | `pat-na1-YOUR_HUBSPOT_PAT_HERE` |
| Station Code Object ID | `2-35681060` |
| EPR Google Sheet | `1o5V_o6_2B38oNgWGgXmV8nsepxywUWDgNNpzXAmDhhI` |
| Test Email | `christian.olesen@usan.org` |
| TEST_MODE | `true` (in Build Email node) |

## Rep Details for Signatures

Rep contact details (phone, Calendly links) are stored in the n8n workflow configuration.
Do not commit personal contact info to this repo.

## Google Sheet Structure

**Sheet:** `1o5V_o6_2B38oNgWGgXmV8nsepxywUWDgNNpzXAmDhhI`

**Tab: Sheet1** (EPR Data)
- MEMBER NAME
- STATION CODE
- TICKETS RECEIVED
- RESPONSES NEEDED
- TOTAL RESPS SENT
- % RESPONDED

**Tab: outreach_log** (Logging)
- member_name
- station_code
- email
- sent_to
- contact_name
- response_rate
- rep_name
- status (sent, test_sent, skipped, send_failed)
- sent_at / processed_at
- skip_reason (if skipped)
