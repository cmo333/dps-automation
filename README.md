# DPS Alerts Automation System

A template-first, deterministic automation system for routing DPS (Damage Prevention System) alerts to Member Representatives.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW A: STATION REP SYNC                         │
│                         (Daily Cron - 2:00 AM)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  HubSpot Station Codes → Associated Contacts → Local Mapping Table          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW B: DPS EMAIL PROCESSOR                         │
│                      (Outlook Trigger)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Email → Parse → Lookup Local → Select Template → Forward → Log             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW C: DEAD LETTER HANDLER                         │
│                      (Error Trigger)                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Failed Items → Log → Notify Exception Email                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- n8n instance (self-hosted or cloud)
- Node.js 18+
- HubSpot account with API access
- Microsoft 365 / Outlook account
- Either: Google Sheets OR PostgreSQL/Supabase

### 1. Clone and Install

```bash
git clone <this-repo>
cd dps-automation
npm install
```

### 2. Configure Environment

```bash
# Copy example config
cp config/env.local.json.example config/env.local.json

# Edit with your values
nano config/env.local.json
```

Required configuration:

| Variable | Description |
|----------|-------------|
| `N8N_BASE_URL` | Your n8n instance URL (e.g., `https://n8n.yourcompany.com`) |
| `N8N_API_KEY` | n8n API key (Settings → API → Create API Key) |
| `STORAGE_MODE` | `sheets` or `postgres` |
| `FALLBACK_EMAIL` | Email for unassigned alerts |
| `EXCEPTION_EMAIL` | Email for exceptions/errors |
| `OUTLOOK_MAILBOX` | Member Services shared mailbox |

### 3. Set Up n8n Credentials (Manual Step)

In n8n UI, create these credentials:

1. **HubSpot API** (name: `hubspot_api`)
   - Type: HubSpot API
   - Access Token: Your HubSpot private app token

2. **Microsoft Outlook** (name: `outlook_oauth`)
   - Type: Microsoft OAuth2
   - Scope: Mail.Read, Mail.Send, Mail.ReadWrite

3. **Google Sheets** (if using sheets mode, name: `google_sheets`)
   - Type: Google OAuth2
   - Scope: spreadsheets

4. **PostgreSQL** (if using postgres mode, name: `postgres_db`)
   - Type: Postgres
   - Connection details for your database

### 4. Initialize Storage

**Google Sheets Mode:**
```bash
# Create the spreadsheet manually, then add the ID to config
# Required sheets: station_rep_mapping, alert_log, dead_letter
```

**PostgreSQL Mode:**
```bash
# Run the init script
psql -h your-host -U your-user -d your-db -f sql/001_init.sql
```

### 5. Deploy Workflows

```bash
# Deploy all workflows
npm run deploy

# Or deploy individually
npm run deploy:sync      # Station Rep Sync
npm run deploy:processor # DPS Email Processor
npm run deploy:deadletter # Dead Letter Handler
```

### 6. Activate Workflows

In n8n UI:
1. Open each workflow
2. Click "Activate" toggle
3. For Station Rep Sync: manually trigger once to populate initial data

## File Structure

```
dps-automation/
├── README.md
├── package.json
├── templates/
│   ├── workflow_station_rep_sync.json      # Workflow A
│   ├── workflow_dps_email_processor.json   # Workflow B
│   └── workflow_deadletter_handler.json    # Workflow C
├── config/
│   ├── env.local.json.example
│   └── env.prod.json.example
├── rules/
│   └── templates.json                      # Email templates + match rules
├── scripts/
│   ├── deploy_workflows.mjs                # Main deployer
│   └── render_workflow.mjs                 # Template renderer
├── sql/
│   └── 001_init.sql                        # PostgreSQL schema
└── docs/
    └── troubleshooting.md
```

## Template System

Templates are defined in `rules/templates.json`. Each template has:
- `id`: Unique identifier
- `name`: Human-readable name
- `match_rules`: Array of conditions (first match wins)
- `subject_template`: Email subject with placeholders
- `body_template`: Email body with placeholders

### Match Rule Types

| Type | Example | Description |
|------|---------|-------------|
| `notes_contains` | `"no response"` | Notes field contains text |
| `notes_regex` | `"storm\\s+drain"` | Notes matches regex |
| `issue_type_equals` | `"No Response"` | Exact issue type match |
| `issue_type_contains` | `"AOI"` | Issue type contains text |

### Available Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{{rep_name}}` | Recipient's name |
| `{{rep_email}}` | Recipient's email |
| `{{ticket_number}}` | DPS ticket number |
| `{{station_codes}}` | Comma-separated codes for this rep |
| `{{all_station_codes}}` | All codes from the alert |
| `{{states}}` | Affected states |
| `{{notes}}` | Additional notes |
| `{{customer_name}}` | Customer first + last name |
| `{{alert_id}}` | DPS alert system ID |
| `{{issue_type}}` | Primary issue type |

## Maintenance

### Manual Sync Trigger

If rep assignments change mid-day:
1. Open Station Rep Sync workflow in n8n
2. Click "Execute Workflow"

### Adding New Templates

1. Edit `rules/templates.json`
2. Add new template object with match rules
3. Re-deploy: `npm run deploy:processor`

### Monitoring

- Check n8n executions for failures
- Review dead_letter table/sheet for stuck items
- Daily digest (if configured) summarizes activity

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md)

## License

MIT
