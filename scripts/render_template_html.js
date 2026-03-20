// Render Template - HTML Email Format
// Replace the code in "Render Template (Preview)" with this

const allItems = $input.all();
const results = [];

const CC_RECIPIENTS = [
  'trevor.harris@usan.org',
  'centeroperations@usanorth811.org',
  'germain.suess@usan.org',
  'christian.olesen@usan.org'
];

// MANUAL REVIEW MODE - Set to true for testing (all emails go to reviewer)
const MANUAL_REVIEW_MODE = false;
const REVIEWER_EMAIL = 'christian.olesen@usan.org';  // Only used if MANUAL_REVIEW_MODE is true

// EXCEPTION CODES - Route to manual review (PG&E only - ATTDNORCAL handled separately below)
const MANUAL_REVIEW_CODES = [
  // PG&E codes - different process for Steve Cleaver
  'PGEYLO', 'PGESJ1', 'PGEMSV', 'PGEHAY', 'PGEGVY', 'PGEUET', 'PGEHIN', 'PGEVJO',
  'PGENPA', 'PGESAL', 'PGERID', 'PGEBR2', 'PGESJO', 'PGECND', 'PGERBF', 'PGEBUR',
  'PGEFNO', 'PGEOAK', 'PGESLO', 'PGEVAC', 'PGEPLA', 'PGECLM', 'PGEUKH', 'PGEMER',
  'PGEMDO', 'PGEBEL', 'PGESRO', 'PGERCH', 'PGEBFD', 'PGESRF', 'PGEEUR', 'PGESFO',
  'PGECHI', 'PGEAUB', 'PGECUP', 'PGEORO', 'PGERED', 'PGESAC', 'PGESTK'
];

// Check if any station codes require PG&E manual review
function requiresManualReview(stationCodes) {
  return stationCodes.some(code => MANUAL_REVIEW_CODES.includes(code.toUpperCase()));
}

// Issue types that route to memberservices (but with normal email format)
const MEMBERSERVICES_ISSUE_TYPES = ['other'];

function issueTypeRoutesToMemberServices(issueType) {
  return MEMBERSERVICES_ISSUE_TYPES.includes((issueType || '').toLowerCase());
}

function render(tmpl, vars) {
  let result = tmpl;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

// HTML Signature - Matches Outlook signature format
const LOGO_URL = 'https://i.imgur.com/v6diEdK.jpg';
const BANNER_URL = 'https://i.imgur.com/HfkbUwp.png';

const SIGNATURE_HTML = `
<p style="font-family: Aptos, sans-serif; font-size: 12pt;">Thank you,</p>
<br>
<table cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top; border-right: 1.5pt solid #000;">
      <img src="${LOGO_URL}" alt="USAN 811" width="175" style="max-width: 175px;">
    </td>
    <td style="padding-left: 15px; vertical-align: top;">
      <p style="margin: 0; font-family: 'Aptos Display', Aptos, sans-serif; font-size: 12pt;"><b>${repName || 'Member Services'}</b></p>
      <p style="margin: 0; font-family: 'Aptos Display', Aptos, sans-serif; font-size: 12pt;">Member Services Specialist</p>
      <p style="margin: 0; font-family: 'Aptos Display', Aptos, sans-serif; font-size: 12pt;">${repPhone || ''}</p>
      <p style="margin: 0; font-family: 'Aptos Display', Aptos, sans-serif; font-size: 12pt;"><a href="http://www.undergroundservicealert.org/" style="color: #0563c1;">undergroundservicealert.org</a></p>
      <p style="margin: 0; font-family: 'Aptos Display', Aptos, sans-serif; font-size: 12pt;">4005 Port Chicago Hwy #100 Concord, CA 94520</p>
      <p style="margin: 0; font-family: 'Aptos Display', Aptos, sans-serif; font-size: 12pt;"><a href="${repCalendly || '#'}" style="color: #4c94d8;"><b>Schedule a Meeting</b></a></p>
    </td>
  </tr>
</table>
<br>
<a href="https://www.undergroundservicealert.org/damage-prevention-portal/"><img src="${BANNER_URL}" alt="NEW Damage Prevention Portal" width="450" style="max-width: 450px;"></a>
<br><br>
<p style="font-size: 9pt; color: #666; font-family: Aptos, sans-serif;">This message contains confidential information and is intended only for the intended recipients. If you are not an intended recipient you should not disseminate, distribute or copy this e-mail. Please notify us immediately by e-mail if you have received this e-mail by mistake and delete this e-mail from your system.</p>
`;

// Helper function to build forwarded section (needed early for ATTDNORCAL)
function buildForwardedSection(data, stationCodes) {
  return `
<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<strong>From:</strong> noreply@fs26.formsite.com<br>
<strong>Sent:</strong> ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}<br>
<strong>To:</strong> Member Services &lt;memberservices@usan.org&gt;<br>
<strong>Subject:</strong> DPS - Department Alert System Result #${data.alert_id}
</p>
<table style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; border-collapse: collapse; margin-top: 15px;" cellpadding="8">
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Reference #</strong></td><td style="border: 1px solid #ddd;">${data.alert_id}</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Status</strong></td><td style="border: 1px solid #ddd;">Complete</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Primary issue or request</strong></td><td style="border: 1px solid #ddd;">${data.issue_type}</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Member Code</strong></td><td style="border: 1px solid #ddd;">${stationCodes.join(', ')}</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>State</strong></td><td style="border: 1px solid #ddd;">${data.states.join(', ')}</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Ticket Number(s)</strong></td><td style="border: 1px solid #ddd;">${(data.ticket_numbers || [data.ticket_number]).join(', ')}</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Customer Name</strong></td><td style="border: 1px solid #ddd;">${data.customer_name || 'N/A'}</td></tr>
  <tr><td style="border: 1px solid #ddd; background: #f5f5f5;"><strong>Additional Notes</strong></td><td style="border: 1px solid #ddd;">${data.notes || 'N/A'}</td></tr>
</table>
`;
}

for (let i = 0; i < allItems.length; i++) {
  const data = allItems[i].json;
  const template = data.template;
  const recipient = data.current_recipient;

  // Build forwarded section early (needed for all paths)
  const forwardedSection = buildForwardedSection(data, recipient.station_codes);

  // ============================================
  // SPECIAL HANDLING #1: ATTDNORCAL → Utiliquest team (Shant, Eduardo, Dawn)
  // ============================================
  const hasATTDNORCAL = recipient.station_codes.some(c => c.toUpperCase() === 'ATTDNORCAL');

  if (hasATTDNORCAL) {
    // Utiliquest team recipients
    // Utiliquest contacts - configure via environment or n8n credentials
    const utiliquestTo = data.utiliquest_primary || 'CONFIGURE_UTILIQUEST_PRIMARY';
    const utiliquestCcReal = [
      data.utiliquest_cc1 || 'CONFIGURE_UTILIQUEST_CC1',
      data.utiliquest_cc2 || 'CONFIGURE_UTILIQUEST_CC2',
      ...CC_RECIPIENTS
    ];

    // Review header for manual mode
    const attReviewHeader = MANUAL_REVIEW_MODE ? `
<div style="background: #d4edda; border: 2px solid #28a745; padding: 15px; margin-bottom: 20px; font-family: Arial, sans-serif;">
  <h3 style="margin: 0 0 10px 0; color: #155724;">📋 ATTDNORCAL - REVIEW BEFORE SENDING</h3>
  <p style="margin: 5px 0;"><strong>Send To:</strong> Shant Simonian &lt;shant.simonian@utiliquest.com&gt;</p>
  <p style="margin: 5px 0;"><strong>CC:</strong> eduardo.mercado@utiliquest.com, dawn.crawford@utiliquest.com, ${CC_RECIPIENTS.join(', ')}</p>
  <p style="margin: 5px 0;"><strong>Station Code(s):</strong> ${recipient.station_codes.join(', ')}</p>
  <hr style="border: none; border-top: 1px solid #28a745; margin: 10px 0;">
  <p style="margin: 0; font-size: 11px; color: #155724;">Review the email below, then forward to Utiliquest team.</p>
</div>
` : '';

    const utiliquestBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
${attReviewHeader}
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
Shant, an excavator has reported a no response on the ticket(s) below, please pay extra attention to this ticket and respond as soon as possible.
</p>
${SIGNATURE_HTML}
${forwardedSection}
</body>
</html>
`;

    // In manual review mode, send to reviewer; otherwise send to Utiliquest
    const sendTo = MANUAL_REVIEW_MODE ? REVIEWER_EMAIL : utiliquestTo;
    const sendCc = MANUAL_REVIEW_MODE ? [] : utiliquestCcReal;
    const sendToName = MANUAL_REVIEW_MODE ? 'Reviewer' : 'Shant';
    const subjectPrefix = MANUAL_REVIEW_MODE ? '[REVIEW] ATTDNORCAL - ' : '';

    results.push({
      json: {
        email_number: results.length + 1,
        status: MANUAL_REVIEW_MODE ? 'ATTDNORCAL - PENDING REVIEW' : 'UTILIQUEST NOTIFICATION',
        to: sendTo,
        to_name: sendToName,
        cc: sendCc,
        subject: `${subjectPrefix}FW: DPS - Department Alert System Result #${data.alert_id}`,
        body: utiliquestBody,
        body_text: 'Shant, an excavator has reported a no response on the ticket(s) below, please pay extra attention to this ticket and respond as soon as possible.',
        template_used: 'attdnorcal_utiliquest',
        station_codes: recipient.station_codes,
        intended_recipient: {
          email: utiliquestTo,
          name: 'Shant Simonian'
        },
        input_summary: {
          alert_id: data.alert_id,
          ticket_number: data.ticket_number,
          state: data.states.join(', '),
          issue_type: data.issue_type
        }
      }
    });
    continue; // Skip normal processing
  }

  // ============================================
  // SPECIAL HANDLING #2: PG&E codes → Manual review to memberservices
  // ============================================
  const needsCodeReview = requiresManualReview(recipient.station_codes);

  if (needsCodeReview) {
    const manualReviewBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<h2 style="color: #cc0000;">⚠️ MANUAL ATTENTION REQUIRED</h2>
<p><strong>Reason:</strong> PG&E code - Different process for Steve Cleaver</p>
<hr>
<p><strong>Original Recipient:</strong> ${recipient.rep_name} &lt;${recipient.rep_email}&gt;</p>
<p><strong>Station Code(s):</strong> ${recipient.station_codes.join(', ')}</p>
<p><strong>Ticket Number:</strong> ${data.ticket_number}</p>
<p><strong>Alert ID:</strong> ${data.alert_id}</p>
<p><strong>Issue Type:</strong> ${data.issue_type}</p>
<p><strong>State:</strong> ${data.states.join(', ')}</p>
<p><strong>Customer:</strong> ${data.customer_name || 'N/A'}</p>
<p><strong>Notes:</strong> ${data.notes || 'N/A'}</p>
<hr>
<p>Please handle this alert manually using the appropriate process.</p>
</body>
</html>`;

    results.push({
      json: {
        email_number: i + 1,
        status: 'PGE - MANUAL REVIEW',
        requires_human_review: true,
        to: 'memberservices@usan.org',
        to_name: 'Member Services',
        cc: [],
        subject: `⚠️ Manual Attention Required: Ticket #${data.ticket_number} - ${recipient.station_codes.join(', ')}`,
        body: manualReviewBody,
        template_used: 'manual_review_pge',
        station_codes: recipient.station_codes,
        input_summary: {
          alert_id: data.alert_id,
          ticket_number: data.ticket_number,
          state: data.states.join(', '),
          issue_type: data.issue_type
        }
      }
    });
    continue; // Skip normal processing
  }

  // ============================================
  // NORMAL EMAIL PROCESSING
  // (includes "Other" which routes to memberservices with normal format)
  // ============================================
  const isOtherIssueType = issueTypeRoutesToMemberServices(data.issue_type);

  const firstName = (recipient.rep_name || 'Member Rep').split(' ')[0];
  const hasRealName = recipient.rep_name && recipient.rep_name.trim() !== '';
  const subjectFirstName = hasRealName ? recipient.rep_name.split(' ')[0] : '';

  const templates = {
    no_response_ca: `
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<strong>${firstName}</strong>, please review the form below and reach out to the customer listed to resolve the issue.
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; background-color: #FFFF00; padding: 5px;">
Please monitor the tickets that require Electronic Positive Responses within the Damage Prevention Portal (DPP) as required by California Code 4216
(<a href="https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=GOV&division=5.&title=1.&part=&chapter=3.1.&article=2">link</a>).
</p>
<ul style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
  <li>How to use Electronic Positive Response - <a href="https://www.youtube.com/watch?v=c1b6HlX-fx4">https://www.youtube.com/watch?v=c1b6HlX-fx4</a></li>
</ul>
`,
    no_response_nv: `
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<strong>${firstName}</strong>, please review the form below and reach out to the customer listed to resolve the issue.
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; background-color: #FFFF00; padding: 5px;">
Please monitor the tickets that require Electronic Positive Responses within the Damage Prevention Portal (DPP) as required by NRS 455.
</p>
<ul style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
  <li>How to use Electronic Positive Response - <a href="https://www.youtube.com/watch?v=c1b6HlX-fx4">https://www.youtube.com/watch?v=c1b6HlX-fx4</a></li>
</ul>
`,
    no_response_generic: `
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<strong>${firstName}</strong>, please review the form below and reach out to the customer listed to resolve the issue.
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
Please monitor the tickets that require Electronic Positive Responses within the Damage Prevention Portal (DPP).
</p>
<ul style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
  <li>How to use Electronic Positive Response - <a href="https://www.youtube.com/watch?v=c1b6HlX-fx4">https://www.youtube.com/watch?v=c1b6HlX-fx4</a></li>
</ul>
`,
    contact_info_issue: `
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<strong>${firstName}</strong>, please review the email below from one of our agents for reference and reach out to the excavator on the ticket to resolve the issue.
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
If you need to update your Member Contact information within the Damage Prevention Portal, please use the link below to sign in. Then navigate to the station details for your station code (Settings > OneCallAccess).
</p>
<ul style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
  <li><strong>NV DPP Login Page</strong> - <a href="https://appsnv.undergroundservicealert.org/pcadmin/Account/Login">https://appsnv.undergroundservicealert.org/pcadmin/Account/Login</a></li>
  <li><strong>CA DPP Login Page</strong> - <a href="https://appsca.undergroundservicealert.org/pcadmin/Account/Login?returnUrl=%2Fpcadmin%2FOperations">https://appsca.undergroundservicealert.org/pcadmin/Account/Login</a></li>
</ul>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
Contact Information can be found under Settings - OneCallAccess then clicking on your Station Code.<br>
The Member Contact is displayed on each ticket available for the excavator.<br>
The Member IT contact is not displayed on the ticket and is meant for the Member Rep.
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">Please let me know if you have any questions.</p>
`,
    member_manually_added: `
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
Hello <strong>${firstName}</strong>,
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
Please review the email below from one of our agents for reference. The station code <strong>${recipient.station_codes.join(', ')}</strong> has been manually added to ticket# <strong>${data.ticket_number}</strong> at the request of the excavator.
</p>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
If you need to update your Area of Interest, please visit the Damage Prevention Portal using the link below.
</p>
<ul style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
  <li><strong>CA DPP Login Page</strong> - <a href="https://appsca.undergroundservicealert.org/pcadmin/Account/Login?returnUrl=%2Fpcadmin%2FOperations">https://appsca.undergroundservicealert.org/pcadmin/Account/Login</a></li>
</ul>
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
Area of Interest (AOI) can be found under Settings - OneCallAccess and clicking on your Station Code, then clicking on Area of Interest.<br>
Here is a video that goes into more detail: <a href="https://www.youtube.com/watch?v=KZzHnITi-3Q&feature=youtu.be">How to manage your Area of Interest</a>
</p>
`,
    general: `
<p style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
<strong>${firstName}</strong>, please review the form below and take appropriate action.
</p>
`
  };

  const templateId = template.id;
  const bodyHtml = templates[templateId] || templates.general;

  const reviewHeader = MANUAL_REVIEW_MODE ? `
<div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin-bottom: 20px; font-family: Arial, sans-serif;">
  <h3 style="margin: 0 0 10px 0; color: #856404;">📋 REVIEW BEFORE FORWARDING</h3>
  <p style="margin: 5px 0;"><strong>Forward To:</strong> ${recipient.rep_name} &lt;${recipient.rep_email}&gt;</p>
  <p style="margin: 5px 0;"><strong>CC:</strong> ${CC_RECIPIENTS.join(', ')}</p>
  <p style="margin: 5px 0;"><strong>Station Code(s):</strong> ${recipient.station_codes.join(', ')}</p>
  <hr style="border: none; border-top: 1px solid #ffc107; margin: 10px 0;">
  <p style="margin: 0; font-size: 11px; color: #856404;">Review the email below, then forward to the recipient above.</p>
</div>
` : '';

  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
${reviewHeader}
${bodyHtml}
${SIGNATURE_HTML}
${forwardedSection}
</body>
</html>
`;

  // Determine where to send
  let sendTo;
  if (MANUAL_REVIEW_MODE) {
    sendTo = REVIEWER_EMAIL;
  } else if (isOtherIssueType) {
    sendTo = 'memberservices@usan.org';  // "Other" routes here with normal email format
  } else {
    sendTo = recipient.rep_email;
  }

  const sendCc = MANUAL_REVIEW_MODE ? [] : CC_RECIPIENTS;
  const subjectPrefix = MANUAL_REVIEW_MODE ? `[REVIEW] For: ${recipient.rep_name} - ` : (subjectFirstName ? subjectFirstName + ', ' : '');

  let toName;
  if (MANUAL_REVIEW_MODE) {
    toName = 'Reviewer';
  } else if (isOtherIssueType) {
    toName = 'Member Services';
  } else {
    toName = recipient.rep_name;
  }

  let status;
  if (MANUAL_REVIEW_MODE) {
    status = 'PENDING REVIEW';
  } else if (isOtherIssueType) {
    status = 'OTHER - ROUTED TO MEMBERSERVICES';
  } else {
    status = 'AUTO-SEND TO REP';
  }

  results.push({
    json: {
      email_number: i + 1,
      status: status,
      to: sendTo,
      to_name: toName,
      cc: sendCc,
      subject: `${subjectPrefix}FW: DPS - Department Alert System Result #${data.alert_id}`,
      body: fullHtml,
      body_text: `${firstName}, please review the form below and reach out to the customer listed to resolve the issue.`,
      template_used: templateId,
      station_codes: recipient.station_codes,
      intended_recipient: {
        email: recipient.rep_email,
        name: recipient.rep_name
      },
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
