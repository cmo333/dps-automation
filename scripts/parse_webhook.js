// Parse Webhook - Extracts data from Formsite webhook
// n8n node: "Code in JavaScript"
// Connect this to the Webhook node output
//
// CHANGE LOG:
// - 2026-02-17: Added HubSpot IN-query validation to filter out English words
//   extracted from notes (e.g., CUSTOMER, HAS, THREE). Only codes that exist
//   in HubSpot pass through. Falls back to field-only codes if validation fails.

const webhookData = $input.first().json;
// Handle both direct items and items nested in body (webhook wrapper)
const items = webhookData.items || webhookData.body?.items || [];

// Helper function to find item by ID
function getItemById(id) {
  return items.find(item => item.id === id || item.id === String(id));
}

// Helper function to get value from item (handles both direct value and values array)
function getValue(id) {
  const item = getItemById(id);
  if (!item) return '';

  // If it has a direct value
  if (item.value !== undefined) {
    return item.value;
  }

  // If it has a values array
  if (item.values && item.values.length > 0) {
    return item.values[0].value || '';
  }

  return '';
}

// Extract department first - only process Member Services
const department = getValue(15);        // "Member Services", "IT", etc.

// EARLY EXIT: If not Member Services, stop processing
// Other departments get their normal Formsite emails without automation
if (!department.toLowerCase().includes('member services')) {
  return [{
    json: {
      _skipped: true,
      _reason: `Department is "${department}" - not Member Services, skipping automation`,
      department: department
    }
  }];
}

// Extract fields from Formsite
const stationCodesRaw = getValue(32);  // "VACTSTR PGESTK"
const issueType = getValue(16);         // "No Response"
const stateRaw = getValue(33);          // "California"
const ticketNumber = getValue(45);      // "2026012101268"
const customerName = getValue(23);      // Customer name
const notes = getValue(6);              // Notes

// Parse station codes from the main field (space, comma, or "and" separated)
const mainCodes = stationCodesRaw
  .split(/[\s,]+|(?:\s+and\s+)/i)
  .map(code => code.trim().toUpperCase())
  .filter(code => code.length > 0);

// Also extract potential station codes from the notes field
// Station codes are typically 4-8 uppercase alphanumeric characters
// Pattern: look for words that look like codes (uppercase, alphanumeric, 3-10 chars)
function extractCodesFromNotes(notesText) {
  if (!notesText) return [];

  // Split on common separators: comma, space, &, "and", periods
  const words = notesText
    .split(/[\s,&.]+|(?:\s+and\s+)/i)
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= 3 && w.length <= 10);

  // Filter to only alphanumeric words that look like station codes
  // Station codes typically have letters and optionally numbers (e.g., QFRCA3, MEDCTV, PGESJ1)
  return words.filter(w => /^[A-Z0-9]+$/.test(w) && /[A-Z]/.test(w));
}

const notesCodes = extractCodesFromNotes(notes);

// Combine all candidates (field + notes), deduplicated
const allCandidates = [...new Set([...mainCodes, ...notesCodes])];

// Validate ALL candidate codes against HubSpot in ONE API call using IN operator.
// This filters out English words (CUSTOMER, HAS, THREE, etc.) that the loose
// regex picks up from notes, while keeping real station codes that DPS agents
// may have typed in the wrong field.
let validatedCodes = mainCodes; // Default: trust field codes if validation fails

if (notesCodes.length > 0) {
  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/2-35681060/search', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ${HUBSPOT_API_KEY}',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'station_code',
            operator: 'IN',
            values: allCandidates
          }]
        }],
        properties: ['station_code'],
        limit: 100
      })
    });

    const data = await response.json();
    const validHubSpotCodes = (data.results || [])
      .map(r => r.properties?.station_code?.toUpperCase())
      .filter(Boolean);

    validatedCodes = [...new Set(validHubSpotCodes)];
  } catch (err) {
    // If validation call fails, fall back to field codes only (safe default)
    validatedCodes = mainCodes;
  }
}

const stationCodes = validatedCodes;

// Extract ticket numbers from notes (12-13 digit numbers that start with 202)
function extractTicketNumbersFromNotes(notesText) {
  if (!notesText) return [];
  const matches = notesText.match(/\b20\d{10,11}\b/g) || [];
  return matches;
}

const notesTickets = extractTicketNumbersFromNotes(notes);
const mainTickets = ticketNumber ? [ticketNumber] : [];
const allTicketsSet = new Set([...mainTickets, ...notesTickets]);
const ticketNumbers = Array.from(allTicketsSet);

// Parse states (could be multiple)
const states = stateRaw
  .split(/[,\/]+/)
  .map(s => s.trim())
  .filter(s => s.length > 0);

// Generate alert ID from timestamp or use ticket number
const alertId = ticketNumber || new Date().getTime().toString();

return [{
  json: {
    // Main identifiers
    alert_id: alertId,
    ticket_number: ticketNumber,
    ticket_numbers: ticketNumbers,

    // Station codes as array (validated against HubSpot)
    station_codes: stationCodes,
    member_codes: stationCodes,  // Alias for compatibility

    // Debug: show where codes came from and validation results
    _codes_from_field: mainCodes,
    _codes_from_notes: notesCodes,
    _all_candidates: allCandidates,
    _validated_codes: validatedCodes,
    _tickets_from_field: mainTickets,
    _tickets_from_notes: notesTickets,

    // Issue categorization
    issue_type: issueType,

    // Location
    states: states,

    // Customer info
    customer_name: customerName,
    notes: notes,

    // Department (for debugging)
    department: department,

    // Metadata
    source: 'formsite_webhook',
    received_at: webhookData.date_finish || new Date().toISOString(),

    // Raw data for debugging
    _raw: webhookData
  }
}];
