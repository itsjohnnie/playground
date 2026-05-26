# poetry camera / previewer

A local previewer for [poetry.camera](https://poetry.camera) — upload an
image, edit the per-mode prompts, print a poem.

Five modes: `haiku`, `free verse`, `limerick`, `alliteration`, `receipt`.
Each has its own editable system prompt that persists per-browser. A "demo"
toggle prints a canned poem per mode so you can exercise the UI with no key.

## Why it's a Node app

A pure-browser version exists too, but Anthropic's API blocks direct
browser calls unless the org enables it. This Node version sidesteps that:
the API key lives in `.env` on the server, the browser calls `/api/poem`,
and the server forwards to Anthropic. Same origin, no CORS.

## Run it

```sh
cd poetry
npm install
cp .env.example .env      # then paste your sk-ant-... key
npm start                 # → http://localhost:3000
```

`npm run dev` does the same with `node --watch` so the server restarts on
edit. The frontend is plain HTML/CSS/JS in this folder — no build step.

## Files

- `server.js`         Express server + `/api/poem` proxy + `/api/health`
- `index.html`        UI
- `styles.css`        styles
- `script.js`         frontend logic, prompts, modes, demo mode, server-status check
- `package.json`      deps (`express`, `dotenv`) and `start` / `dev` scripts
- `.env.example`      template for the key

## Endpoints

- `GET  /api/health` → `{ ok, hasKey }` — used by the settings panel
  to show whether the key is loaded.
- `POST /api/poem`   → forwarded verbatim to
  `https://api.anthropic.com/v1/messages`.

## Keyboard

- ⌘/Ctrl+Enter — capture
- Esc — close settings
