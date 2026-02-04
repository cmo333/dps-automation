// Parse Webhook - Extracts data from Formsite webhook
// Connect this to the Webhook node output

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

// Combine main codes and notes codes, removing duplicates
const allCodesSet = new Set([...mainCodes, ...notesCodes]);
const stationCodes = Array.from(allCodesSet);

// Extract ticket numbers from notes (12-13 digit numbers that start with 202)
function extractTicketNumbersFromNotes(notesText) {
  if (!notesText) return [];

  // Match 12-13 digit numbers that look like ticket numbers (typically start with year like 2026, 2025, etc.)
  const matches = notesText.match(/\b20\d{10,11}\b/g) || [];
  return matches;
}

const notesTickets = extractTicketNumbersFromNotes(notes);

// Combine main ticket number with any found in notes, removing duplicates
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
    ticket_numbers: ticketNumbers,  // Array of all ticket numbers (main + from notes)

    // Station codes as array (combined from main field + notes, deduplicated)
    station_codes: stationCodes,
    member_codes: stationCodes,  // Alias for compatibility

    // Debug: show where codes/tickets came from
    _codes_from_field: mainCodes,
    _codes_from_notes: notesCodes,
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
