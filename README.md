# DPS Automation System

**Enterprise-grade workflow automation for Damage Prevention System compliance and member outreach**

![n8n](https://img.shields.io/badge/n8n-Workflow%20Automation-orange)
![HubSpot](https://img.shields.io/badge/HubSpot-CRM%20Integration-ff7a59)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Overview

A production-ready automation system that handles **15,000+ annual DPS alerts** and **EPR compliance outreach** for USAN Member Services. Built with n8n workflow automation, HubSpot CRM integration, and intelligent routing logic.

### Key Metrics
- **30 automated emails/day** for EPR compliance outreach
- **Multi-state support** (California & Nevada regulatory compliance)
- **Dynamic personalization** with QuickChart gauge visualizations
- **Zero manual intervention** for routine alert routing

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Workflow Engine** | n8n (self-hosted) |
| **CRM** | HubSpot API v3 (Companies, Contacts, Custom Objects) |
| **Email** | Mailgun API, Microsoft Outlook |
| **Data Storage** | Google Sheets, PostgreSQL |
| **Visualization** | QuickChart.io (dynamic gauge charts) |
| **Version Control** | Git/GitHub |

---

## Features

### 1. DPS Alert Router
Automatically routes incoming Damage Prevention System alerts to the appropriate Member Representative based on station code assignments.

```
Email Trigger → Parse Alert → Lookup Rep → Select Template → Forward → Log
```

### 2. EPR Compliance Escalation
Proactive outreach system for members with low Electronic Positive Response rates.

**Capabilities:**
- Pulls non-compliant members from Domo analytics
- State-specific templates (CA Gov Code 4216 / NV NRS 455)
- Dynamic gauge charts showing individual EPR scores
- Intelligent batching (30 contacts/day, 20-day rotation cycle)
- Outreach cooldown tracking (30-day minimum between contacts)
- Team workload balancing across representatives

**Sample Email Output:**
```
┌─────────────────────────────────────┐
│  [USAN Logo]     EPR Status Report  │
├─────────────────────────────────────┤
│  Hi {Name},                         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │    [GAUGE CHART - 73%]     │    │
│  │    Your Response Rate       │    │
│  └─────────────────────────────┘    │
│                                     │
│  {State-specific legal citation}    │
│  {Personalized action items}        │
│                                     │
│  [SCHEDULE A CALL - BUTTON]         │
└─────────────────────────────────────┘
```

### 3. Station Rep Sync
Daily synchronization of HubSpot station code assignments to local mapping table.

### 4. Dead Letter Handler
Catches and logs failed workflow executions for manual review.

---

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
│                      WORKFLOW C: EPR COMPLIANCE                              │
│                      (Daily Cron or Manual Trigger)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Domo Data → Filter Candidates → HubSpot Enrichment → Build Email →         │
│  State Template Selection → Mailgun Send → Google Sheets Log                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW D: DEAD LETTER HANDLER                         │
│                      (Error Trigger)                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Failed Items → Log → Notify Exception Email                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## EPR Workflow Details

### State-Specific Compliance

| State | Legal Framework | Portal |
|-------|-----------------|--------|
| California | Gov Code 4216.3.(c)(1)(A) | appsca.undergroundservicealert.org |
| Nevada | NRS 455.080 | appsnv.undergroundservicealert.org |

### Candidate Filtering Logic

```javascript
// Pseudocode for candidate selection
candidates = domoData
  .filter(hasValidEmail)
  .filter(notContactedWithin30Days)
  .filter(notExcludedOwner)
  .sortBy(responseRate, 'ascending')  // Worst performers first
  .limit(MAX_PER_RUN)                  // 30 per day
  .balanceAcrossReps()                 // Even distribution
```

### Dynamic Gauge Generation

Uses QuickChart.io API to generate personalized radial gauge charts:

```javascript
function generateGaugeChart(percentage) {
  const color = percentage >= 75 ? '#4CAF50' :
                percentage >= 50 ? '#FFC107' :
                percentage >= 25 ? '#FF9800' : '#F44336';

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: 'radialGauge',
    data: { datasets: [{ data: [percentage], backgroundColor: color }] },
    options: { centerArea: { text: percentage + '%' } }
  }))}`;
}
```

---

## File Structure

```
dps-automation/
├── README.md
├── package.json
├── templates/
│   ├── workflow_station_rep_sync.json      # Daily HubSpot sync
│   ├── workflow_dps_email_processor.json   # Alert routing
│   ├── workflow_epr_escalation.json        # EPR compliance outreach
│   └── workflow_deadletter_handler.json    # Error handling
├── config/
│   ├── env.local.json.example
│   └── env.prod.json.example
├── rules/
│   └── templates.json                      # Email templates + match rules
├── scripts/
│   ├── deploy_workflows.mjs                # Workflow deployer
│   └── render_workflow.mjs                 # Template renderer
├── sql/
│   └── 001_init.sql                        # PostgreSQL schema
└── docs/
    └── troubleshooting.md
```

---

## Quick Start

### Prerequisites

- n8n instance (self-hosted or cloud)
- Node.js 18+
- HubSpot account with API access
- Microsoft 365 / Outlook account
- Google Sheets OR PostgreSQL

### Installation

```bash
git clone https://github.com/cmo333/dps-automation.git
cd dps-automation
npm install
cp config/env.local.json.example config/env.local.json
# Edit config with your credentials
npm run deploy
```

### Required Credentials (n8n)

| Credential | Type | Scope |
|------------|------|-------|
| `hubspot_api` | HubSpot Private App | CRM read/write |
| `outlook_oauth` | Microsoft OAuth2 | Mail.Read, Mail.Send |
| `google_sheets` | Google OAuth2 | Spreadsheets |
| `mailgun_api` | Mailgun API | Send emails |

---

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `N8N_BASE_URL` | Your n8n instance URL |
| `N8N_API_KEY` | n8n API key |
| `STORAGE_MODE` | `sheets` or `postgres` |
| `FALLBACK_EMAIL` | Email for unassigned alerts |
| `MAX_PER_RUN` | EPR emails per execution (default: 30) |
| `COOLDOWN_DAYS` | Days between repeat contacts (default: 30) |

---

## Monitoring & Maintenance

### Daily Checks
- Review n8n execution history for failures
- Check dead letter queue for stuck items
- Verify outreach log for successful sends

### Manual Triggers
- **Station Rep Sync**: Run when HubSpot assignments change
- **EPR Escalation**: Run daily for compliance outreach

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**Christian Olesen**
Member Services Specialist | Systems Automation
[GitHub](https://github.com/cmo333)
