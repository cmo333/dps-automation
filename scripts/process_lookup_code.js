// Replace the code in "Process Lookup" node with this
// This fixes the issue where only the first code is processed

const items = $input.all();
const explodedItems = $('Explode Codes').all();
const results = [];

// Debug: log what we received
console.log('Lookup results count:', items.length);
console.log('Exploded codes count:', explodedItems.length);

for (let i = 0; i < explodedItems.length; i++) {
  const exploded = explodedItems[i].json;
  const stationCode = exploded.station_code;
  const root = exploded.root;

  // Find the matching lookup result for this station code
  const lookup = items.find(item => {
    const lookupCode = (item.json.station_code || '').toUpperCase();
    return lookupCode === stationCode.toUpperCase();
  });

  const hasResult = lookup && lookup.json && lookup.json.rep_email;

  results.push({
    json: {
      station_code: stationCode,
      found: hasResult,
      rep_email: lookup?.json?.rep_email || null,
      rep_name: lookup?.json?.rep_name || null,
      root: root
    }
  });
}

return results;
