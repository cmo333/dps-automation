# Troubleshooting Guide

## Common Issues

### 1. Workflow Won't Deploy

**Symptom:** `deploy_workflows.mjs` fails with connection error

**Causes & Solutions:**

1. **Wrong n8n URL**
   - Check `config/env.local.json` → `n8n.base_url`
   - Ensure no trailing slash
   - Try accessing `<base_url>/api/v1/workflows` in browser

2. **Invalid API Key**
   - Go to n8n → Settings → API → Create new key
   - Update `n8n.api_key` in config
   - API key must have workflow read/write permissions

3. **Network/Firewall**
   - If n8n is behind VPN, ensure you're connected
   - Check if n8n instance is running

---

### 2. Station Rep Sync Fails

**Symptom:** Sync workflow errors on HubSpot API calls

**Causes & Solutions:**

1. **Invalid HubSpot Object Type ID**
   - Go to HubSpot → Settings → Data Management → Objects
   - Find "Station Codes" custom object
   - Copy the object type ID (format: `2-XXXXXX`)
   - Update `hubspot.station_codes_object_type` in config

2. **Missing HubSpot Permissions**
   - Your private app needs scopes:
     - `crm.objects.custom.read`
     - `crm.objects.contacts.read`
   - Regenerate token if needed

3. **Association Label Not Found**
   - Verify the association label in HubSpot matches config
   - Default: "Member Representative"
   - Check: HubSpot → Settings → Objects → Station Codes → Associations

---

### 3. Emails Not Being Processed

**Symptom:** DPS emails arrive but workflow doesn't trigger

**Causes & Solutions:**

1. **Outlook Trigger Not Polling**
   - Activate the workflow in n8n UI
   - Check n8n execution history for poll attempts
   - Verify Outlook credentials aren't expired

2. **Email Subject Doesn't Match Filter**
   - Filter expects: subject contains "DPS" AND "Alert"
   - Check actual email subjects from DPS system
   - Adjust regex in "Is DPS Alert?" node if needed

3. **Shared Mailbox Permissions**
   - The OAuth account needs access to the shared mailbox
   - In Microsoft 365 Admin → Users → [user] → Mail → Mailbox delegation

---

### 4. Station Codes Not Found in Lookup

**Symptom:** All alerts go to exception queue with "unknown station code"

**Causes & Solutions:**

1. **Sync Hasn't Run**
   - Manually trigger Station Rep Sync workflow
   - Check sync_log sheet/table for results

2. **Sheet/Table Empty**
   - Verify data in `station_rep_mapping` sheet
   - Headers must exactly match: `station_code`, `rep_email`, `rep_name`, etc.

3. **Case Sensitivity**
   - Station codes are uppercased in parsing
   - Ensure lookup table has uppercase codes

4. **Wrong Spreadsheet ID**
   - Double-check `storage.sheets.spreadsheet_id` in config
   - ID is in the Google Sheets URL: `docs.google.com/spreadsheets/d/{ID}/edit`

---

### 5. Emails Not Being Forwarded

**Symptom:** Workflow processes but no email sent to reps

**Causes & Solutions:**

1. **Outlook Send Permission**
   - OAuth scope needs `Mail.Send`
   - Reauthenticate if scope was changed

2. **Message ID Issue**
   - The `email_message_id` must match an email the account can access
   - Check if email was deleted or moved

3. **Rate Limiting**
   - Microsoft 365 has send limits
   - Check n8n execution for 429 errors

---

### 6. Dead Letter Queue Growing

**Symptom:** Many items in dead_letter with same error

**Causes & Solutions:**

1. **Review the Error Type**
   - Common patterns:
     - `TypeError` → Usually parsing issue with unexpected email format
     - `HTTPError 401` → Credential expired
     - `HTTPError 429` → Rate limited

2. **Check Input Snapshot**
   - The `input_snapshot` field shows what data caused the failure
   - Identify patterns (e.g., all same station code)

3. **Manual Resolution**
   - Update `reviewed` to `true` once handled
   - Add `resolution_notes` for audit trail

---

## Switching Storage Modes

### From Google Sheets to PostgreSQL

1. Run the SQL init script:
   ```bash
   psql -h host -U user -d database -f sql/001_init.sql
   ```

2. Update config:
   ```json
   {
     "storage": {
       "mode": "postgres"
     }
   }
   ```

3. In each workflow:
   - Disable Sheets nodes (suffix: `(Sheets)`)
   - Enable Postgres nodes (suffix: `(Postgres)`)

4. Migrate existing data (if needed):
   ```bash
   # Export from Sheets to CSV, then import to Postgres
   ```

5. Redeploy workflows

---

## Useful Queries

### PostgreSQL: Find All Exceptions Today
```sql
SELECT alert_id, ticket_number, station_codes, exception_reason, created_at
FROM alert_log
WHERE status = 'exception'
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### PostgreSQL: Station Codes Without Reps
```sql
SELECT station_code, station_status, last_synced_at
FROM station_rep_mapping
WHERE rep_email IS NULL
  AND station_status = 'Active';
```

### PostgreSQL: Dead Letters Needing Review
```sql
SELECT id, error_type, failed_node, ticket_number, created_at
FROM dead_letter
WHERE reviewed = false
ORDER BY created_at DESC;
```

---

## Getting Help

1. **n8n Community:** https://community.n8n.io/
2. **HubSpot Developer Forum:** https://community.hubspot.com/t5/APIs-Integrations/ct-p/integrations
3. **Check n8n Execution Logs:** Most issues are visible in the execution detail view
