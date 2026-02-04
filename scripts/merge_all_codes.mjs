import { readFileSync, writeFileSync } from 'fs';

// Load extracted codes
const extractedCsv = readFileSync('C:/Users/chris/Downloads/station_rep_mapping_fixed.csv', 'utf-8');
const lines = extractedCsv.split('\n');
const header = lines[0];
const rows = lines.slice(1).filter(l => l.trim());

const codeMap = new Map();
rows.forEach(line => {
  const match = line.match(/^"([A-Z0-9]+)"/);
  if (match) codeMap.set(match[1], line);
});

console.log('Loaded', codeMap.size, 'existing codes');

// Load missing codes
const missingCsv = readFileSync('C:/Users/chris/Downloads/missing_station_codes.csv', 'utf-8');
const missingLines = missingCsv.split('\n').slice(1).filter(l => l.trim());

// False positives to skip
const falsePositives = new Set(['LLC', 'INC', 'USA', 'ISP', 'VOIP', 'B2C', 'PHP', 'ADP', 'DB2', 'LEED', 'AOI', 'SUNSET', 'SIERRA']);

let added = 0;
missingLines.forEach(line => {
  const parts = line.split(',');
  const code = parts[0]?.replace(/"/g, '');
  if (!code || falsePositives.has(code) || codeMap.has(code)) return;

  // Extract rep info
  const repName = parts[1]?.replace(/"/g, '') || '';
  const repEmail = parts[2]?.replace(/"/g, '') || '';
  const company = parts[3]?.replace(/"/g, '') || '';

  // Add as new row
  const newRow = `"${code}","${repName}","${repEmail}","${company}","","needs_review"`;
  codeMap.set(code, newRow);
  added++;
});

console.log('Added', added, 'missing codes');

// Manually add City of Vacaville codes that we know
const vacavilleCodes = [
  { code: 'VACSTR', rep: 'Miguel Medina', email: 'miguel.medina@cityofvacaville.com', company: 'City of Vacaville', state: 'California' },
  { code: 'VACSWR', rep: 'Miguel Medina', email: 'miguel.medina@cityofvacaville.com', company: 'City of Vacaville', state: 'California' },
  { code: 'VACTFC', rep: 'Miguel Medina', email: 'miguel.medina@cityofvacaville.com', company: 'City of Vacaville', state: 'California' },
  { code: 'VACSTL', rep: 'Miguel Medina', email: 'miguel.medina@cityofvacaville.com', company: 'City of Vacaville', state: 'California' },
  { code: 'CTYVAC', rep: 'Miguel Medina', email: 'miguel.medina@cityofvacaville.com', company: 'City of Vacaville', state: 'California' },
];

vacavilleCodes.forEach(v => {
  if (!codeMap.has(v.code)) {
    codeMap.set(v.code, `"${v.code}","${v.rep}","${v.email}","${v.company}","${v.state}","Active"`);
    console.log('Added Vacaville code:', v.code);
  }
});

// Output final merged file
const output = [header, ...Array.from(codeMap.values())].join('\n');
writeFileSync('C:/Users/chris/Downloads/station_rep_mapping_FINAL.csv', output);

console.log('\nFinal count:', codeMap.size, 'codes');
console.log('Saved to: C:/Users/chris/Downloads/station_rep_mapping_FINAL.csv');
