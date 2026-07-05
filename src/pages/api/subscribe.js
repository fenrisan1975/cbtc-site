// POST /api/subscribe
// Body: { email: string }
// Adds the address to a Mailchimp audience. Requires three env vars set in
// Netlify (Site settings > Environment variables) -- see SETUP.md:
//   MAILCHIMP_API_KEY        e.g. abc123...-us21
//   MAILCHIMP_SERVER_PREFIX  the part after the dash above, e.g. "us21"
//   MAILCHIMP_AUDIENCE_ID    found in Mailchimp under Audience > Settings

export const prerender = false;

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const email = (body.email || '').trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return new Response(JSON.stringify({ error: 'A valid email address is required.' }), { status: 400 });
  }

  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !serverPrefix || !audienceId) {
    return new Response(
      JSON.stringify({ error: 'Mailchimp is not configured yet on the server.' }),
      { status: 500 }
    );
  }

  const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

  const mcResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Mailchimp accepts any string as the Basic auth username.
      Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
    },
    body: JSON.stringify({
      email_address: email,
      status: 'subscribed',
    }),
  });

  if (mcResponse.ok) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mcError = await mcResponse.json().catch(() => ({}));

  // Mailchimp returns 400 with title "Member Exists" if already subscribed --
  // treat that as success from the user's point of view.
  if (mcError.title === 'Member Exists') {
    return new Response(JSON.stringify({ ok: true, alreadySubscribed: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ error: mcError.detail || 'Could not subscribe right now.' }),
    { status: 502 }
  );
}
