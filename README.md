# United ELD Hub — website

Static site (no build step) with one serverless function for the contact form. Built for Vercel.

```
index.html            page markup (English text lives here)
assets/styles.css     styles, dark + light theme tokens
assets/i18n.js        Russian and Uzbek translations (keys = data-t attributes)
assets/app.js         theme, language, globes, contact form, CONTACT details
assets/scene.js       particle scroll scene (truck → clock → globe)
assets/logo.png       original logo · logo-mark.svg is the redrawn mark
api/lead.js           contact form → Telegram and/or CRM webhook
```

## Deploy on Vercel

1. vercel.com → Add New → Project → import this repository. Framework preset: **Other**, no build command.
2. Settings → Environment Variables (then redeploy):
   - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` — requests go to that Telegram chat, and/or
   - `CRM_WEBHOOK_URL` — requests are POSTed as JSON `{company, contact, trucks, lang, at}`.
3. Settings → Domains → add the domain.

Until one of the variables is set, the form shows an error with a link to Telegram.

## Still to fill in

- Phone, email, address: `CONTACT` at the top of `assets/app.js` (empty values stay hidden).
- Plan contents and prices: the `#plans` section in `index.html` plus the `p1…p3` keys in `assets/i18n.js`.
- After the domain is known: make `og:image` in `index.html` an absolute URL and add a canonical link.

## Local preview

Any static server works for the page (`npx serve .`); the form needs `vercel dev`.
