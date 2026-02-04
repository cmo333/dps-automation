import { readFileSync, writeFileSync } from 'fs';

// Read the CSV
const csvPath = 'C:/Users/chris/Downloads/hubspot-export.csv';
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
  // Just a name, no email
  return { name: repField.trim(), email: '' };
}

// Process data rows
const mapping = [];
const seen = new Set();
let skippedNoCode = 0;
let skippedDuplicate = 0;
let noRepCount = 0;

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);

  const company = row[companyIdx] || '';
  const state = row[stateIdx] || '';
  const stationCodes = row[stationIdx] || '';
  const repRaw = row[repIdx] || '';
  const status = row[statusIdx] || '';

  // Skip if no station code (but DON'T skip if no rep - include those too)
  if (!stationCodes) {
    skippedNoCode++;
    continue;
  }

  const rep = parseRep(repRaw);
  if (!rep.email) {
    noRepCount++;
  }

  // Station codes can be semicolon-separated
  const codes = stationCodes.split(/[;]+/).map(c => c.trim().toUpperCase()).filter(c => c);

  for (const code of codes) {
    // Dedupe by station code
    if (seen.has(code)) {
      skippedDuplicate++;
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

console.log(`Total rows processed: ${lines.length - 1}`);
console.log(`Skipped (no station code): ${skippedNoCode}`);
console.log(`Skipped (duplicate code): ${skippedDuplicate}`);
console.log(`Entries without rep email: ${noRepCount}`);
console.log(`\nExtracted ${mapping.length} station code mappings\n`);

// Output as CSV for Google Sheets
const outputCSV = [
  'station_code,rep_name,rep_email,company_name,state,status',
  ...mapping.map(m =>
    `"${m.station_code}","${m.rep_name}","${m.rep_email}","${m.company_name.replace(/"/g, '""')}","${m.state}","${m.status}"`
  )
].join('\n');

const outputPath = 'C:/Users/chris/Downloads/station_rep_mapping_v2.csv';
writeFileSync(outputPath, outputCSV);
console.log(`Mapping saved to: ${outputPath}`);

// Show sample entries including ones without reps
console.log('\nSample mappings (including those without reps):');
console.log('station_code | rep_email | company');
console.log('-'.repeat(80));

// Show first 5 with reps
const withReps = mapping.filter(m => m.rep_email).slice(0, 5);
withReps.forEach(m => {
  console.log(`${m.station_code.padEnd(12)} | ${m.rep_email.substring(0, 30).padEnd(30)} | ${m.company_name.substring(0, 25)}`);
});

// Show first 5 without reps
console.log('\nEntries WITHOUT rep email (will route to exception):');
const noReps = mapping.filter(m => !m.rep_email).slice(0, 5);
noReps.forEach(m => {
  console.log(`${m.station_code.padEnd(12)} | (no rep) | ${m.company_name.substring(0, 40)}`);
});

// Check for VACSTR specifically
const vacstr = mapping.find(m => m.station_code === 'VACSTR');
console.log('\n--- Checking for VACSTR ---');
if (vacstr) {
  console.log('VACSTR found:', vacstr);
} else {
  console.log('VACSTR NOT found in extracted data');
  // Search raw data
  console.log('\nSearching raw CSV for VACSTR...');
  for (let i = 1; i < Math.min(lines.length, 500); i++) {
    if (lines[i].toUpperCase().includes('VACSTR')) {
      console.log(`Found at row ${i}:`, lines[i].substring(0, 200));
    }
  }
}
