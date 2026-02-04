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

// Load what we already extracted
const extractedCsv = readFileSync('C:/Users/chris/Downloads/station_rep_mapping_fixed.csv', 'utf-8');
const extractedCodes = new Set();
extractedCsv.split('\n').slice(1).forEach(line => {
  const match = line.match(/^"([A-Z0-9]+)"/);
  if (match) extractedCodes.add(match[1]);
});
console.log('Already extracted:', extractedCodes.size, 'codes\n');

// Pattern for station codes: uppercase letters/numbers, 3-15 chars
const codePattern = /\b[A-Z][A-Z0-9]{2,14}\b/g;

// Scan entire CSV for potential station codes
const allFoundCodes = new Map(); // code -> { row, col, company, rep, context }

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  const company = row[22] || '';
  const rep = row[212] || '';

  // Check all columns for potential codes
  for (let c = 0; c < row.length; c++) {
    const val = row[c] || '';
    // Look for semicolon-separated codes (strong indicator)
    if (val.includes(';') && /[A-Z]{3,}/.test(val)) {
      const codes = val.split(/[;]+/).map(s => s.trim()).filter(s => /^[A-Z][A-Z0-9]{2,14}$/.test(s));
      codes.forEach(code => {
        if (!allFoundCodes.has(code)) {
          allFoundCodes.set(code, { row: i, col: c, header: headers[c], company, rep, context: val.substring(0, 80) });
        }
      });
    }
  }

  // Also check station code columns specifically
  [186, 219].forEach(c => {
    const val = row[c] || '';
    if (val) {
      const codes = val.split(/[;]+/).map(s => s.trim()).filter(s => /^[A-Z][A-Z0-9]{2,14}$/.test(s));
      codes.forEach(code => {
        if (!allFoundCodes.has(code)) {
          allFoundCodes.set(code, { row: i, col: c, header: headers[c], company, rep, context: val.substring(0, 80) });
        }
      });
    }
  });
}

// Find missing codes
const missingCodes = [];
allFoundCodes.forEach((info, code) => {
  if (!extractedCodes.has(code)) {
    missingCodes.push({ code, ...info });
  }
});

console.log('Found', allFoundCodes.size, 'potential station codes in raw CSV');
console.log('Missing from our extract:', missingCodes.length, '\n');

if (missingCodes.length > 0) {
  console.log('=== MISSING CODES ===\n');

  // Group by company for easier review
  const byCompany = new Map();
  missingCodes.forEach(m => {
    const key = m.company || '(no company)';
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key).push(m);
  });

  byCompany.forEach((codes, company) => {
    console.log(company + ':');
    codes.forEach(c => {
      console.log('  ' + c.code + ' | Rep: ' + (c.rep || '(none)') + ' | Found in: ' + c.header);
    });
    console.log('');
  });

  // Output CSV of missing codes for manual addition
  const missingCsv = [
    'station_code,rep_name,rep_email,company_name,source_column,context',
    ...missingCodes.map(m => {
      const repMatch = (m.rep || '').match(/^(.+?)\s*\(([^)]+@[^)]+)\)$/);
      const repName = repMatch ? repMatch[1] : m.rep || '';
      const repEmail = repMatch ? repMatch[2] : '';
      return `"${m.code}","${repName}","${repEmail}","${m.company.replace(/"/g, '""')}","${m.header}","${m.context.replace(/"/g, '""')}"`;
    })
  ].join('\n');

  writeFileSync('C:/Users/chris/Downloads/missing_station_codes.csv', missingCsv);
  console.log('Missing codes saved to: C:/Users/chris/Downloads/missing_station_codes.csv');
}
