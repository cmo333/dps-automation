// OPTION: Replace both "Lookup Sheets" and "Process Lookup" nodes with this single Code node
// This fetches from previous node and does the matching in one step
//
// To use this:
// 1. Delete "Lookup Sheets" node
// 2. Replace "Process Lookup" with this code
// 3. Make sure "Explode Codes" connects directly to this node
// 4. You'll need a separate Google Sheets node earlier that fetches ALL mappings once

// For now, this expects the data to come from Explode Codes
// and matches against a cached/pre-fetched mapping

const explodedItems = $input.all();
const results = [];

// You need to have fetched the mapping data earlier
// For testing, let's just pass through and mark as needing lookup
for (const item of explodedItems) {
  const stationCode = item.json.station_code;
  const root = item.json.root;

  results.push({
    json: {
      station_code: stationCode,
      found: false, // Will be set by actual lookup
      rep_email: null,
      rep_name: null,
      root: root,
      _debug: 'Code processed: ' + stationCode
    }
  });
}

return results;
