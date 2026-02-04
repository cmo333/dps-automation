import { readFileSync, writeFileSync } from 'fs';

const csvPath = 'C:/Users/chris/Downloads/hubspot-export.csv';
const csv = readFileSync(csvPath, 'utf-8');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

const lines = csv.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]);

const companyIdx = headers.findIndex(h => h === 'Company name');
const stateIdx = headers.findIndex(h => h === 'Membership State');
const stationCodeNameIdx = headers.findIndex(h => h === 'Station Code Name'); // Column 186
const assocStationIdx = headers.findIndex(h => h === 'Associated Station Code'); // Column 219
const repIdx = headers.findIndex(h => h === 'Member Representative');
const statusIdx = headers.findIndex(h => h === 'Membership Status');

console.log('Using columns:');
console.log('  Company name:', companyIdx);
console.log('  Membership State:', stateIdx);
console.log('  Station Code Name:', stationCodeNameIdx);
console.log('  Associated Station Code:', assocStationIdx);
console.log('  Member Representative:', repIdx);

function parseRep(repField) {
  if (!repField) return { name: '', email: '' };
  const match = repField.match(/^(.+?)\s*\(([^)]+@[^)]+)\)$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  if (repField.includes('@')) return { name: '', email: repField.trim() };
  return { name: repField.trim(), email: '' };
}

const mapping = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);

  const company = row[companyIdx] || '';
  const state = row[stateIdx] || '';
  const repRaw = row[repIdx] || '';
  const status = row[statusIdx] || '';

  // Get station codes from BOTH columns
  const stationCodeName = row[stationCodeNameIdx] || '';
  const assocStation = row[assocStationIdx] || '';
  const allCodes = stationCodeName + ';' + assocStation;

  if (!allCodes.replace(/;/g, '').trim()) continue;

  const rep = parseRep(repRaw);
  const codes = allCodes.split(/[;]+/).map(c => c.trim().toUpperCase()).filter(c => c && c.length > 1);

  for (const code of codes) {
    if (seen.has(code)) continue;
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

console.log(`\nExtracted ${mapping.length} station code mappings`);

const outputCSV = [
  'station_code,rep_name,rep_email,company_name,state,status',
  ...mapping.map(m =>
    `"${m.station_code}","${m.rep_name}","${m.rep_email}","${m.company_name.replace(/"/g, '""')}","${m.state}","${m.status}"`
  )
].join('\n');

const outputPath = 'C:/Users/chris/Downloads/station_rep_mapping_fixed.csv';
writeFileSync(outputPath, outputCSV);
console.log(`Saved to: ${outputPath}`);

// Verify VACSTR
const vacstr = mapping.find(m => m.station_code === 'VACSTR');
console.log('\nVACSTR:', vacstr ? `Found - Rep: ${vacstr.rep_email}` : 'NOT FOUND');
