// Transform HubSpot Response - Converts HubSpot search results to Process Lookup interface
// n8n node: "Transform HubSpot Response"
//
// Replaces the old Google Sheets lookup with HubSpot custom object lookups.
// Includes fallback: if station_email is null on the station code record,
// follows the "Member Representative" association to the contact to get the email.
//
// CHANGE LOG:
// - 2026-02-17: Added Member Representative association fallback for stations
//   where station_email is null (~30% of records). Uses this.helpers.httpRequest
//   (fetch is not available in this node's sandbox).

const items = $input.all();
const explodedItems = $('Explode Codes').all();
const results = [];

const HS_TOKEN = 'Bearer ${HUBSPOT_API_KEY}';

for (let i = 0; i < items.length; i++) {
  const hsResponse = items[i].json;
  const exploded = explodedItems[i]?.json || {};
  const stationCode = exploded.station_code;
  const root = exploded.root;

  const station = hsResponse.results?.[0];
  let rep_email = station?.properties?.station_email || null;
  let rep_name = station?.properties?.station_contact_name || null;
  let _lookup_method = rep_email ? 'direct' : 'none';

  // If no direct email, follow the Member Representative association
  // HubSpot data structure:
  //   Station Code (custom object 2-35681060)
  //     └─ Association (typeId: 36, "Member Representative")
  //          └─ Contact (has email, firstname, lastname)
  if (!rep_email && station) {
    try {
      const assocData = await this.helpers.httpRequest({
        method: 'GET',
        url: `https://api.hubapi.com/crm/v4/objects/2-35681060/${station.id}/associations/contacts`,
        headers: { 'Authorization': HS_TOKEN }
      });

      const contactId = assocData.results?.[0]?.toObjectId;

      if (contactId) {
        const contact = await this.helpers.httpRequest({
          method: 'GET',
          url: `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname`,
          headers: { 'Authorization': HS_TOKEN }
        });

        rep_email = contact.properties?.email || null;
        rep_name = `${contact.properties?.firstname || ''} ${contact.properties?.lastname || ''}`.trim() || null;
        _lookup_method = rep_email ? 'association' : 'association_no_email';
      } else {
        _lookup_method = 'no_association_found';
      }
    } catch (err) {
      _lookup_method = `error: ${err.message}`;
    }
  }

  results.push({
    json: {
      station_code: stationCode,
      found: !!rep_email,
      rep_email: rep_email,
      rep_name: rep_name,
      _lookup_method: _lookup_method,
      root: root
    }
  });
}

return results;
