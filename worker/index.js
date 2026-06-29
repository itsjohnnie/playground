// Cloudflare Worker for johnnie: serves the static site (johnnie/out) and
// handles the contact form at POST /api/contact, delivering the message to the
// configured inbox via Cloudflare Email Routing (the send_email binding).
//
// Bindings/vars (see wrangler.toml):
//   env.ASSETS         - static assets (johnnie/out)
//   env.CONTACT_EMAIL  - send_email binding (Email Routing)
//   env.CONTACT_TO     - destination inbox (must be a verified Email Routing destination)
//   env.CONTACT_FROM   - From address on your Cloudflare domain (e.g. contact@johnnies.life)

import { EmailMessage } from "cloudflare:email";

const ALLOWED_ORIGINS = [
  "https://johnnies.life",
  "https://www.johnnies.life",
  "https://itsjohnnie.github.io",
];

function corsHeaders(origin) {
  const allow =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".workers.dev"))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });

// Strip CR/LF so header values can't be used for header injection.
const clean = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

async function handleContact(request, env) {
  const origin = request.headers.get("Origin");
  let data;
  try {
    data = await readBody(request);
  } catch {
    return json({ ok: false, error: "bad_request" }, 400, origin);
  }

  // Honeypot: real users never fill this hidden field. Pretend success.
  if (clean(data.company)) return json({ ok: true }, 200, origin);

  const firstName = clean(data.firstName || data["First-name"]);
  const lastName = clean(data.lastName || data["Last-name"]);
  const email = clean(data.email);
  const subject = clean(data.subject || data.Why) || "New message from johnnies.life";
  const message = String(data.message || data.Message || "").trim();

  if (!email || !message) {
    return json({ ok: false, error: "missing_fields" }, 422, origin);
  }

  const to = env.CONTACT_TO || "johnnie@hey.com";
  const from = env.CONTACT_FROM || "contact@johnnies.life";
  const name = [firstName, lastName].filter(Boolean).join(" ") || "Website visitor";

  const body =
    `New message from your website contact form:\n\n` +
    `Name:    ${name}\n` +
    `Email:   ${email}\n` +
    `Subject: ${subject}\n\n` +
    `${message}\n`;

  const raw = [
    `From: Johnnie's Life <${from}>`,
    `To: ${to}`,
    `Reply-To: ${name} <${email}>`,
    `Subject: ${clean(`[johnnies.life] ${subject}`)}`,
    `Message-ID: <${crypto.randomUUID()}@johnnies.life>`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="utf-8"`,
    ``,
    body,
  ].join("\r\n");

  try {
    const msg = new EmailMessage(from, to, raw);
    await env.CONTACT_EMAIL.send(msg);
    return json({ ok: true }, 200, origin);
  } catch (err) {
    return json({ ok: false, error: "send_failed", detail: String(err) }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      const origin = request.headers.get("Origin");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      if (request.method !== "POST")
        return json({ ok: false, error: "method_not_allowed" }, 405, origin);
      return handleContact(request, env);
    }
    // Everything else: static assets.
    return env.ASSETS.fetch(request);
  },
};
