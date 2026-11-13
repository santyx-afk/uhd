// Vercel serverless function: receives the contact form and forwards it.
// Configure in Vercel → Project → Settings → Environment Variables:
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  → message to a Telegram chat/group
//   CRM_WEBHOOK_URL                        → JSON POST to a CRM webhook
// Either one (or both) may be set.

const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  // Honeypot: bots fill the hidden field. Pretend success.
  if (b.website) return res.status(200).json({ ok: true });

  const lead = {
    company: clean(b.company, 120),
    contact: clean(b.contact, 120),
    trucks: clean(b.trucks, 20),
    lang: clean(b.lang, 5),
    at: new Date().toISOString()
  };
  if (!lead.company || !lead.contact) return res.status(400).json({ ok: false, error: 'missing_fields' });

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, CRM_WEBHOOK_URL } = process.env;
  const jobs = [];

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const text = [
      'New request — unitedhub site',
      'Company: ' + lead.company,
      'Contact: ' + lead.contact,
      'Trucks: ' + lead.trucks,
      'Language: ' + lead.lang
    ].join('\n');
    jobs.push(fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
    }).then(r => r.ok));
  }
  if (CRM_WEBHOOK_URL) {
    jobs.push(fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    }).then(r => r.ok));
  }

  if (!jobs.length) return res.status(503).json({ ok: false, error: 'not_configured' });
  const results = await Promise.all(jobs.map(j => j.catch(() => false)));
  if (results.some(Boolean)) return res.status(200).json({ ok: true });
  return res.status(502).json({ ok: false, error: 'delivery_failed' });
};
