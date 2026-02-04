import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'path';

// Read the CSV
const csvPath = process.argv[2] || 'C:\\Users\\chris\\Downloads\\hubspot-export.csv';
const csv = readFileSync(csvPath, 'utf-8');

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const lines = csv.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

// Find column indices
const findCol = (name) => headers.findIndex(h => h === name);

const companyIdx = findCol('Company name');
const stateIdx = findCol('Membership State');
const stationIdx = findCol('Associated Station Code');
const repIdx = findCol('Member Representative');
const statusIdx = findCol('Membership Status');

console.log('Column indices found:');
console.log('  Company name:', companyIdx);
console.log('  Membership State:', stateIdx);
console.log('  Associated Station Code:', stationIdx);
console.log('  Member Representative:', repIdx);
console.log('  Membership Status:', statusIdx);
console.log('');

// Parse member rep field: "Name (email@domain.com)" -> { name, email }
function parseRep(repField) {
  if (!repField) return { name: '', email: '' };
  const match = repField.match(/^(.+?)\s*\(([^)]+@[^)]+)\)$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  // Maybe it's just an email
  if (repField.includes('@')) {
    return { name: '', email: repField.trim() };
  }
  return { name: repField.trim(), email: '' };
}

// Process data rows
const mapping = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);

  const company = row[companyIdx] || '';
  const state = row[stateIdx] || '';
  const stationCodes = row[stationIdx] || '';
  const repRaw = row[repIdx] || '';
  const status = row[statusIdx] || '';

  // Skip if no station code or no rep
  if (!stationCodes || !repRaw) continue;

  const rep = parseRep(repRaw);
  if (!rep.email) continue;

  // Station codes can be semicolon-separated
  const codes = stationCodes.split(';').map(c => c.trim().toUpperCase()).filter(c => c);

  for (const code of codes) {
    // Dedupe by station code
    if (seen.has(code)) {
      console.log(`  Duplicate station code: ${code} (keeping first)`);
      continue;
    }
    seen.add(code);

    mapping.push({
      station_code: code,
      rep_name: rep.name,
      rep_email: rep.email,
      company_name: company,
      state: state,
      status: status
    });
  }
}

console.log(`\nExtracted ${mapping.length} station code mappings\n`);

// Output as CSV for Google Sheets
const outputCSV = [
  'station_code,rep_name,rep_email,company_name,state,status',
  ...mapping.map(m =>
    `"${m.station_code}","${m.rep_name}","${m.rep_email}","${m.company_name.replace(/"/g, '""')}","${m.state}","${m.status}"`
  )
].join('\n');

const outputPath = 'C:\\Users\\chris\\Downloads\\station_rep_mapping.csv';
writeFileSync(outputPath, outputCSV);
console.log(`Mapping saved to: ${outputPath}`);

// Show first 10 entries
console.log('\nFirst 10 mappings:');
console.log('station_code | rep_name | rep_email | state');
console.log('-'.repeat(80));
mapping.slice(0, 10).forEach(m => {
  console.log(`${m.station_code.padEnd(12)} | ${m.rep_name.substring(0, 20).padEnd(20)} | ${m.rep_email.substring(0, 30).padEnd(30)} | ${m.state}`);
});
