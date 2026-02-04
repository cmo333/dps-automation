// Final Output - Email Preview for Demo
const items = $input.all();
const emails = items.map(item => item.json);

// Create email preview that looks like actual emails
const emailPreviews = emails.map((e, idx) => {
  const divider = "═".repeat(60);
  const thinDivider = "─".repeat(60);

  return `
${divider}
📧 EMAIL ${idx + 1} OF ${emails.length} - READY TO SEND
${divider}

To:      ${e.to_name} <${e.to}>
CC:      ${e.cc ? e.cc.join('; ') : ''}
Subject: ${e.subject}

${thinDivider}

${e.body}

${divider}
`;
}).join('\n');

const summary = `
╔════════════════════════════════════════════════════════════╗
║         ✅ DPS AUTOMATION COMPLETE                         ║
╠════════════════════════════════════════════════════════════╣
║  Emails Generated:  ${emails.length}                                       ║
║  Processing Time:   < 1 second                             ║
║  Status:            Ready for Review                       ║
╚════════════════════════════════════════════════════════════╝

${emailPreviews}
`;

return [{ json: { email_preview: summary } }];
