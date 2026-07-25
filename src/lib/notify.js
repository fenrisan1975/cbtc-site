// Sends an email notification via Resend (https://resend.com) whenever a
// new business is submitted. Fires immediately on submission (status is
// still 'pending' at this point -- see submit-business.js), not on later
// admin approval.
//
// Requires three Netlify env vars -- see SETUP.md:
//   RESEND_API_KEY      Resend dashboard > API Keys
//   RESEND_FROM_EMAIL   verified sender, e.g. "notify@constancebaytrading.com"
//   NOTIFY_EMAILS       comma-separated recipient list, e.g.
//                        "james@constancebaytrading.com,amelia@constancebaytrading.com,andrew@constancebaytrading.com"
//
// If any of these are missing, this silently no-ops -- a submission should
// never fail (or even error visibly) just because notifications aren't
// configured yet.
export async function notifyNewBusiness(business) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const notifyList = (process.env.NOTIFY_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!apiKey || !from || notifyList.length === 0) return;

  const adminUrl = 'https://constancebaytrading.com/admin';
  const subject = `New business submitted: ${business.name}`;
  const lines = [
    `${business.name} just submitted a listing for Constance Bay Trading Co.`,
    '',
    business.description ? `Description: ${business.description}` : null,
    business.address ? `Address: ${business.address}` : null,
    business.phone ? `Phone: ${business.phone}` : null,
    business.email ? `Contact email: ${business.email}` : null,
    business.website ? `Website: ${business.website}` : null,
    '',
    `Review it in the admin panel: ${adminUrl}`,
  ].filter((line) => line !== null);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: notifyList,
        subject,
        text: lines.join('\n'),
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('notifyNewBusiness: Resend returned', res.status, errBody);
    }
  } catch (err) {
    // Never let a notification failure break the submission flow.
    console.error('notifyNewBusiness failed:', err);
  }
}
