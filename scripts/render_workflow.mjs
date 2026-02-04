#!/usr/bin/env node
/**
 * render_workflow.mjs
 * 
 * Renders n8n workflow templates by replacing placeholders with config values.
 * 
 * Usage:
 *   node scripts/render_workflow.mjs <template_path> <config_path> [output_path]
 * 
 * Example:
 *   node scripts/render_workflow.mjs templates/workflow_station_rep_sync.json config/env.local.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

/**
 * Flatten nested config object into placeholder map
 * e.g., { email: { fallback_email: "x" } } => { "EMAIL_FALLBACK_EMAIL": "x" }
 */
function flattenConfig(obj, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenConfig(value, newKey));
    } else {
      result[newKey.toUpperCase()] = value;
    }
  }
  
  return result;
}

/**
 * Replace all {{PLACEHOLDER}} patterns in text
 */
function replacePlaceholders(text, placeholders) {
  let result = text;
  
  for (const [key, value] of Object.entries(placeholders)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const replacement = typeof value === 'string' ? value : JSON.stringify(value);
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Check for unreplaced placeholders
 */
function findUnreplacedPlaceholders(text) {
  const pattern = /\{\{([A-Z_]+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

/**
 * Load and parse JSON file
 */
function loadJson(path) {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    }
    throw new Error(`Failed to parse JSON from ${path}: ${err.message}`);
  }
}

/**
 * Main render function
 */
export function renderWorkflow(templatePath, config) {
  const templateContent = readFileSync(templatePath, 'utf-8');
  const placeholders = flattenConfig(config);
  
  // Add computed placeholders
  placeholders['TEMPLATES_JSON'] = JSON.stringify(loadJson(resolve(projectRoot, 'rules/templates.json')));
  
  const rendered = replacePlaceholders(templateContent, placeholders);
  const unreplaced = findUnreplacedPlaceholders(rendered);
  
  if (unreplaced.length > 0) {
    console.warn(`Warning: Unreplaced placeholders found: ${unreplaced.join(', ')}`);
  }
  
  // Validate JSON
  try {
    JSON.parse(rendered);
  } catch (err) {
    throw new Error(`Rendered workflow is not valid JSON: ${err.message}`);
  }
  
  return rendered;
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node render_workflow.mjs <template_path> <config_path> [output_path]');
    process.exit(1);
  }
  
  const [templatePath, configPath, outputPath] = args;
  
  try {
    const config = loadJson(resolve(projectRoot, configPath));
    const rendered = renderWorkflow(resolve(projectRoot, templatePath), config);
    
    if (outputPath) {
      writeFileSync(resolve(projectRoot, outputPath), rendered);
      console.log(`Rendered workflow written to: ${outputPath}`);
    } else {
      console.log(rendered);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
