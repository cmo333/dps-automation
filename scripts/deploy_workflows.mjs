#!/usr/bin/env node
/**
 * deploy_workflows.mjs
 * 
 * Deploys n8n workflows via the REST API.
 * Supports create, update (upsert), and validation modes.
 * 
 * Usage:
 *   node scripts/deploy_workflows.mjs --all                    # Deploy all workflows
 *   node scripts/deploy_workflows.mjs --workflow <name>        # Deploy specific workflow
 *   node scripts/deploy_workflows.mjs --validate-only          # Validate without deploying
 *   node scripts/deploy_workflows.mjs --env prod               # Use prod config
 * 
 * Environment:
 *   DPS_ENV=local|prod    Override config file selection
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { renderWorkflow } from './render_workflow.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Workflow mapping
const WORKFLOWS = {
  station_rep_sync: {
    template: 'templates/workflow_station_rep_sync.json',
    nameKey: 'workflow_names.station_rep_sync'
  },
  dps_email_processor: {
    template: 'templates/workflow_dps_email_processor.json',
    nameKey: 'workflow_names.dps_email_processor'
  },
  deadletter_handler: {
    template: 'templates/workflow_deadletter_handler.json',
    nameKey: 'workflow_names.deadletter_handler'
  },
  epr_escalation: {
    template: 'templates/workflow_epr_escalation.json',
    nameKey: 'workflow_names.epr_escalation'
  },
  epr_escalation_test: {
    template: 'templates/workflow_epr_escalation_test.json',
    nameKey: 'workflow_names.epr_escalation_test'
  }
};

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    workflows: [],
    validateOnly: false,
    env: process.env.DPS_ENV || 'local',
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--all':
        result.workflows = Object.keys(WORKFLOWS);
        break;
      case '--workflow':
        if (args[i + 1]) {
          result.workflows.push(args[++i]);
        }
        break;
      case '--validate-only':
        result.validateOnly = true;
        break;
      case '--env':
        if (args[i + 1]) {
          result.env = args[++i];
        }
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }
  
  return result;
}

/**
 * Load config file
 */
function loadConfig(env) {
  const configPath = resolve(projectRoot, `config/env.${env}.json`);
  
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}\nCopy from env.${env}.json.example and configure.`);
  }
  
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Failed to parse config: ${err.message}`);
  }
}

/**
 * Get nested config value by dot path
 */
function getConfigValue(config, path) {
  return path.split('.').reduce((obj, key) => obj?.[key], config);
}

/**
 * n8n API client
 */
class N8nClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }
  
  async request(method, path, body = null) {
    const url = `${this.baseUrl}/api/v1${path}`;
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`n8n API error (${response.status}): ${JSON.stringify(data)}`);
    }
    
    return data;
  }
  
  async listWorkflows() {
    const result = await this.request('GET', '/workflows');
    return result.data || result;
  }
  
  async getWorkflow(id) {
    return await this.request('GET', `/workflows/${id}`);
  }
  
  async createWorkflow(workflow) {
    return await this.request('POST', '/workflows', workflow);
  }
  
  async updateWorkflow(id, workflow) {
    return await this.request('PATCH', `/workflows/${id}`, workflow);
  }
  
  async activateWorkflow(id, active = true) {
    return await this.request('PATCH', `/workflows/${id}`, { active });
  }
  
  async findWorkflowByName(name) {
    const workflows = await this.listWorkflows();
    return workflows.find(w => w.name === name);
  }
}

/**
 * Deploy a single workflow
 */
async function deployWorkflow(client, workflowKey, config, validateOnly) {
  const workflowDef = WORKFLOWS[workflowKey];
  
  if (!workflowDef) {
    throw new Error(`Unknown workflow: ${workflowKey}`);
  }
  
  const templatePath = resolve(projectRoot, workflowDef.template);
  
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }
  
  const workflowName = getConfigValue(config, workflowDef.nameKey);
  
  console.log(`\n📋 Processing: ${workflowKey}`);
  console.log(`   Template: ${workflowDef.template}`);
  console.log(`   Name: ${workflowName}`);
  
  // Render the workflow
  let rendered;
  try {
    rendered = renderWorkflow(templatePath, config);
    console.log(`   ✓ Rendered successfully`);
  } catch (err) {
    console.error(`   ✗ Render failed: ${err.message}`);
    return { success: false, error: err.message };
  }
  
  // Parse and validate
  let workflow;
  try {
    workflow = JSON.parse(rendered);
    workflow.name = workflowName;
    console.log(`   ✓ Valid JSON`);
  } catch (err) {
    console.error(`   ✗ Invalid JSON: ${err.message}`);
    return { success: false, error: err.message };
  }
  
  if (validateOnly) {
    console.log(`   ✓ Validation passed (dry run)`);
    return { success: true, action: 'validated' };
  }
  
  // Check if workflow exists
  try {
    const existing = await client.findWorkflowByName(workflowName);
    
    if (existing) {
      // Update existing
      console.log(`   → Updating existing workflow (ID: ${existing.id})`);
      
      // Preserve certain fields from existing
      workflow.id = existing.id;
      workflow.active = existing.active;
      
      await client.updateWorkflow(existing.id, workflow);
      console.log(`   ✓ Updated successfully`);
      return { success: true, action: 'updated', id: existing.id };
    } else {
      // Create new
      console.log(`   → Creating new workflow`);
      const created = await client.createWorkflow(workflow);
      console.log(`   ✓ Created successfully (ID: ${created.id})`);
      return { success: true, action: 'created', id: created.id };
    }
  } catch (err) {
    console.error(`   ✗ Deploy failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    console.log(`
DPS Automation Workflow Deployer

Usage:
  node scripts/deploy_workflows.mjs [options]

Options:
  --all                Deploy all workflows
  --workflow <name>    Deploy specific workflow (station_rep_sync, dps_email_processor, deadletter_handler)
  --validate-only      Validate templates without deploying
  --env <env>          Use specific config (local, prod). Default: local
  --help, -h           Show this help

Examples:
  npm run deploy                           # Deploy all (local)
  npm run deploy:sync                      # Deploy station_rep_sync only
  node scripts/deploy_workflows.mjs --env prod --all
`);
    process.exit(0);
  }
  
  if (args.workflows.length === 0) {
    console.error('Error: Specify --all or --workflow <name>');
    process.exit(1);
  }
  
  console.log(`\n🚀 DPS Automation Deployer`);
  console.log(`   Environment: ${args.env}`);
  console.log(`   Mode: ${args.validateOnly ? 'Validate Only' : 'Deploy'}`);
  console.log(`   Workflows: ${args.workflows.join(', ')}`);
  
  // Load config
  let config;
  try {
    config = loadConfig(args.env);
    console.log(`   ✓ Config loaded`);
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
  
  // Create n8n client (skip if validate-only)
  let client = null;
  if (!args.validateOnly) {
    const baseUrl = config.n8n?.base_url;
    const apiKey = config.n8n?.api_key;
    
    if (!baseUrl || !apiKey) {
      console.error('\n❌ Missing n8n.base_url or n8n.api_key in config');
      process.exit(1);
    }
    
    client = new N8nClient(baseUrl, apiKey);
    
    // Test connection
    try {
      await client.listWorkflows();
      console.log(`   ✓ Connected to n8n`);
    } catch (err) {
      console.error(`\n❌ Cannot connect to n8n: ${err.message}`);
      process.exit(1);
    }
  }
  
  // Deploy each workflow
  const results = [];
  
  for (const workflowKey of args.workflows) {
    const result = await deployWorkflow(client, workflowKey, config, args.validateOnly);
    results.push({ workflow: workflowKey, ...result });
  }
  
  // Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log('Summary:');
  
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  for (const r of results) {
    const icon = r.success ? '✓' : '✗';
    const status = r.success ? r.action : `FAILED: ${r.error}`;
    console.log(`  ${icon} ${r.workflow}: ${status}`);
  }
  
  console.log(`\nTotal: ${succeeded.length} succeeded, ${failed.length} failed`);
  
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\n❌ Unexpected error: ${err.message}`);
  process.exit(1);
});
