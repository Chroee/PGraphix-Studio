// Cloudflare Pages Function — receives the commission form's POST and
// relays it to the studio's Discord channel as a webhook message.
//
// The webhook URL is read from the DISCORD_WEBHOOK_URL environment variable
// (set as a *secret* in the Cloudflare Pages project settings) so it is never
// exposed in the page's client-side source.
//
// Route: POST /api/commission  (file-based routing: this file's path under
// /functions becomes its URL path automatically — no extra config needed.)

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DISCORD_WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ error: 'DISCORD_WEBHOOK_URL is not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let data;
  try {
    data = await request.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Honeypot: the form ships a hidden "website" field real visitors never
  // fill in. If it's present, silently pretend success instead of erroring
  // (so a bot gets no signal to retry) but never forward it to Discord.
  if (data.website) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = (data.name || '').toString().slice(0, 200);
  const discord = (data.discord || '').toString().slice(0, 200);
  const type = (data.type || '').toString().slice(0, 200);
  const details = (data.details || '').toString().slice(0, 1500);

  if (!name || !discord || !type || !details) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const payload = {
    embeds: [
      {
        title: 'New commission request',
        color: 0x22d3ff,
        fields: [
          { name: 'Name / IGN', value: name, inline: true },
          { name: 'Discord', value: discord, inline: true },
          { name: 'Project type', value: type, inline: true },
          { name: 'Details', value: details },
        ],
        // The "Discord" field above is what staff search by to find this
        // person and open a ticket — see docs/discord-ticket-workflow.md
        // for the manual create-ticket / add-member steps.
        footer: { text: 'Manual workflow: create a ticket and add this person by their Discord tag above.' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!discordRes.ok) {
    // Logged to this Function's Cloudflare logs (Pages project -> your
    // deployment -> Functions -> Real-time Logs / Logs tab) — check here
    // first if submissions are failing silently on the site.
    const discordBody = await discordRes.text().catch(function () { return ''; });
    console.error('Discord webhook rejected the message:', discordRes.status, discordBody);
    return new Response(
      JSON.stringify({ error: 'Discord rejected the message.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
