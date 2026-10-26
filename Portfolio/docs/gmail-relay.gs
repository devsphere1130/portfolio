// DevSphere contact form -> your Gmail. Paste this whole file into script.google.com (see the steps).
// The secret must match CONTACT_NOTIFY_WEBHOOK_SECRET on Render. Keep this private.
const SECRET = 'PASTE-THE-SAME-LONG-RANDOM-SECRET-AS-ON-RENDER';

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('bad request'); }
  if (data.secret !== SECRET) return ContentService.createTextOutput('forbidden');
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),   // your own Gmail address
    subject: String(data.subject || 'New project inquiry').slice(0, 200),
    body: String(data.body || '').slice(0, 20000),
    replyTo: data.reply_to || undefined,         // "Reply" in Gmail answers the client
    name: 'DevSphere website',
  });
  return ContentService.createTextOutput('ok');
}

// Optional: run this once from the editor to test that email arrives.
function testEmail() {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'DevSphere test email', 'If you can read this, the script can send email.');
}
