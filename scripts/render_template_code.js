// Render Template - processes ALL items (multiple recipients)
const allItems = $input.all();
const results = [];

const CC_RECIPIENTS = [
  'trevor.harris@usan.org',
  'centeroperations@usanorth811.org',
  'germain.suess@usan.org'
];

const SIGNATURE = `

Christian Olesen
Member Services Representative
USAN - Underground Service Alert Network
memberservices@usan.org`;

function render(tmpl, vars) {
  let result = tmpl;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

for (let i = 0; i < allItems.length; i++) {
  const data = allItems[i].json;
  const template = data.template;
  const recipient = data.current_recipient;

  // Extract first name only
  const firstName = (recipient.rep_name || 'Member Rep').split(' ')[0];

  const vars = {
    rep_name: firstName,
    rep_email: recipient.rep_email,
    ticket_number: data.ticket_number,
    station_codes: recipient.station_codes.join(', '),
    all_station_codes: data.member_codes.join(', '),
    states: data.states.join(', '),
    notes: data.notes,
    customer_name: data.customer_name,
    alert_id: data.alert_id,
    issue_type: data.issue_type
  };

  const renderedBody = render(template.body_template, vars) + SIGNATURE;

  results.push({
    json: {
      email_number: i + 1,
      status: 'DRAFT EMAIL PREVIEW',
      to: recipient.rep_email,
      to_name: recipient.rep_name,
      cc: CC_RECIPIENTS,
      subject: render(template.subject_template, vars),
      body: renderedBody,
      template_used: template.id,
      station_codes: recipient.station_codes,
      input_summary: {
        alert_id: data.alert_id,
        ticket_number: data.ticket_number,
        state: data.states.join(', '),
        issue_type: data.issue_type
      }
    }
  });
}

return results;
