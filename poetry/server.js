// poetry camera / previewer — local server.
//
// Serves the static frontend in this folder and exposes POST /api/poem,
// which forwards the request to the Anthropic API using a key from the
// server environment. The browser never sees the key, and the call to
// Anthropic happens server-to-server so the org-level CORS policy does
// not apply.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠  ANTHROPIC_API_KEY is not set.\n" +
      "   copy .env.example to .env and paste your key, then restart.\n" +
      "   (the demo toggle still works without one.)\n"
  );
}

app.use(express.json({ limit: "12mb" }));

// Local-dev tool — never let the browser cache HTML/CSS/JS. Without this,
// edits during a session can be invisible until a hard refresh.
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    setHeaders(res) {
      res.set("Cache-Control", "no-store, max-age=0");
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

app.post("/api/poem", async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res
      .status(500)
      .json({ error: { message: "server has no ANTHROPIC_API_KEY set" } });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const body = await upstream.text();
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
  console.log(`\npoetry camera previewer → http://localhost:${PORT}/\n`);
});
