// poetry camera / previewer — local server.
//
// Serves the static frontend in /public/ and exposes:
//   GET  /api/health  — basic alive check + whether a key is loaded
//   GET  /api/whoami  — fingerprint of the loaded key (safe to share)
//   POST /api/poem    — proxies to Anthropic with the key from .env
// The browser never sees the key, and the call to Anthropic happens
// server-to-server so the org-level CORS policy does not apply.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── key diagnostics at startup ───────────────────────────────────────────
// A surprising number of 401s come from invisible junk in .env: a trailing
// newline, a stray space, surrounding quotes that dotenv left intact, or
// the key from a different org. Print a sanitized fingerprint so the
// failure mode is "wrong key" rather than "blind 401".

function keyFingerprint(k) {
  if (!k) return null;
  const trimmed = k.trim();
  return {
    prefix: trimmed.slice(0, 10),
    suffix: trimmed.slice(-4),
    length: trimmed.length,
    hadWhitespace: trimmed !== k,
    looksValid: /^sk-ant-[a-z0-9-]{10,}/i.test(trimmed),
  };
}

const rawKey = process.env.ANTHROPIC_API_KEY;
const fp = keyFingerprint(rawKey);

if (!rawKey) {
  console.warn(
    "\n⚠  ANTHROPIC_API_KEY is not set.\n" +
      "   copy .env.example to .env and paste your key, then restart.\n" +
      "   (the demo toggle still works without one.)\n"
  );
} else {
  console.log(
    `\n🔑  ANTHROPIC_API_KEY loaded: ${fp.prefix}…${fp.suffix} (length ${fp.length})`
  );
  if (fp.hadWhitespace) {
    console.warn(
      "⚠  the key had surrounding whitespace in .env — using the trimmed value.\n" +
        "   tip: make sure the line in .env is exactly:\n" +
        "        ANTHROPIC_API_KEY=sk-ant-...\n" +
        "   no spaces, no quotes.\n"
    );
  }
  if (!fp.looksValid) {
    console.warn(
      "⚠  the key doesn't match the expected `sk-ant-...` shape. it may still\n" +
        "   work, but if you see a 401, regenerate the key in Anthropic Console.\n"
    );
  }
}

// the trimmed key is what we actually use
const KEY = rawKey ? rawKey.trim() : null;

// ─── middleware ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "12mb" }));

// Local-dev tool — never let the browser cache HTML/CSS/JS.
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    setHeaders(res) {
      res.set("Cache-Control", "no-store, max-age=0");
    },
  })
);

// ─── endpoints ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(KEY) });
});

// Safe to share — no actual key material. Lets you sanity-check from the
// browser (or curl) which key the server is using right now.
app.get("/api/whoami", (_req, res) => {
  if (!KEY) return res.json({ key: null });
  res.json({ key: fp });
});

app.post("/api/poem", async (req, res) => {
  if (!KEY) {
    return res
      .status(500)
      .json({ error: { message: "server has no ANTHROPIC_API_KEY set" } });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const body = await upstream.text();

    // Annotate Anthropic's 401 with the loaded fingerprint so the
    // browser surfaces an actually-useful message.
    if (upstream.status === 401) {
      let parsed = {};
      try { parsed = JSON.parse(body); } catch {}
      const msg = parsed?.error?.message || "invalid x-api-key";
      return res.status(401).json({
        error: {
          message:
            `${msg}\n\n` +
            `the server is using key  ${fp.prefix}…${fp.suffix}  (length ${fp.length}).\n\n` +
            `the key string is well-formed, so anthropic is rejecting the value itself.\n` +
            `open console.anthropic.com/settings/keys, find the key ending in ${fp.suffix},\n` +
            `and either reactivate it or generate a new one. paste the new key into .env\n` +
            `— if you're running \`npm run sync\` / \`npm run dev\`, the server will\n` +
            `auto-restart when .env changes.`,
        },
      });
    }

    res
      .status(upstream.status)
      .type(upstream.headers.get("content-type") || "application/json")
      .send(body);
  } catch (err) {
    res
      .status(502)
      .json({ error: { message: `proxy failed: ${err.message || err}` } });
  }
});

app.listen(PORT, () => {
  console.log(`poetry camera previewer → http://localhost:${PORT}/\n`);
});
