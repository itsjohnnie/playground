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
  "https://staging.johnnies.life",
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

// RFC 2047 encoded-word (UTF-8, base64) so emoji/accents in the Subject render
// correctly in every mail client (and it stays pure ASCII in the header).
const encodeSubject = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
};

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
    `Subject: ${encodeSubject(clean(`📨 ${env.ENVIRONMENT === "staging" ? "[staging] " : ""}${name} via johnnies.life: ${subject}`))}`,
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

// ---------------------------------------------------------------------------
// GitHub OAuth for the Sveltia/Decap CMS admin (/admin). Replaces Netlify's
// default OAuth proxy. Needs env.GITHUB_CLIENT_ID + env.GITHUB_CLIENT_SECRET
// (set as Worker secrets). Only the origins below may receive the token.
// ---------------------------------------------------------------------------
const CMS_ORIGINS = [
  "https://johnnies.life",
  "https://www.johnnies.life",
  "https://itsjohnnie.github.io",
];
const originAllowed = (o) =>
  !!o && (CMS_ORIGINS.includes(o) || o.endsWith(".workers.dev"));

function handleAuthStart(url, env) {
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID || "");
  authorize.searchParams.set("redirect_uri", `${url.origin}/callback`);
  authorize.searchParams.set("scope", "repo,user");
  authorize.searchParams.set("state", crypto.randomUUID());
  // No CSRF cookie: mobile Safari often drops it in the OAuth popup, which would
  // break the round-trip. Low risk for a single-user CMS that writes to one repo.
  return new Response(null, { status: 302, headers: { Location: authorize.toString() } });
}

function authResultPage(status, payload) {
  // Standard Decap/Sveltia OAuth handshake; only posts the token to an allowed
  // opener origin.
  const allow = JSON.stringify(CMS_ORIGINS);
  return new Response(
    `<!doctype html><html><body><script>
(function(){
  var allow=${allow};
  function ok(o){return o&&(allow.indexOf(o)>-1||/\\.workers\\.dev$/.test(new URL(o).host));}
  var msg='authorization:github:${status}:'+JSON.stringify(${JSON.stringify(payload)});
  function recv(e){ if(!ok(e.origin))return; window.opener.postMessage(msg,e.origin); window.removeEventListener('message',recv); }
  window.addEventListener('message',recv,false);
  if(window.opener){ window.opener.postMessage('authorizing:github','*'); } else { document.body.textContent='You can close this window.'; }
})();
</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "csrf=; Max-Age=0; Path=/" } },
  );
}

async function handleAuthCallback(request, url, env) {
  const code = url.searchParams.get("code");
  if (!code) {
    return authResultPage("error", { message: "Missing authorization code." });
  }
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/callback`,
      }),
    });
    const data = await res.json();
    if (!data.access_token) {
      return authResultPage("error", { message: data.error_description || "No token returned." });
    }
    return authResultPage("success", { token: data.access_token, provider: "github" });
  } catch (e) {
    return authResultPage("error", { message: String(e) });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Staging (playground-staging → staging.johnnies.life) serves the same
    // assets but must stay out of search engines: disallow-all robots.txt and
    // a noindex header on everything. Production is untouched.
    const staging = env.ENVIRONMENT === "staging";

    if (url.pathname === "/api/contact") {
      const origin = request.headers.get("Origin");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      if (request.method !== "POST")
        return json({ ok: false, error: "method_not_allowed" }, 405, origin);
      return handleContact(request, env);
    }

    // CMS GitHub OAuth
    if (url.pathname === "/auth") return handleAuthStart(url, env);
    if (url.pathname === "/callback") return handleAuthCallback(request, url, env);

    // The Barcelona sheet moved from /gomis to /trips/barcelona. The old
    // path no longer matches an asset, so these requests reach the worker;
    // send them home permanently.
    if (url.pathname === "/gomis" || url.pathname.startsWith("/gomis/")) {
      const rest = url.pathname.slice("/gomis".length) || "/";
      return Response.redirect(`${url.origin}/trips/barcelona${rest}${url.search}`, 301);
    }

    if (staging && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Everything else: static assets.
    const res = await env.ASSETS.fetch(request);
    if (!staging) return res;
    const tagged = new Response(res.body, res);
    tagged.headers.set("X-Robots-Tag", "noindex, nofollow");
    return tagged;
  },
};

// Keep the linter happy about the helper used only in the inline page template.
void originAllowed;
