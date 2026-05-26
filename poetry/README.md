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

### Three flavors of run

| Command          | What it does                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `npm start`      | Plain `node server.js`. No restart on file changes.                                          |
| `npm run dev`    | `node --watch server.js`. Restarts when `server.js` changes (frontend hot-reloads via no-store headers). |
| `npm run sync`   | Same as `dev`, **plus** polls `origin` every 5s and `git pull --ff-only`s when behind. Useful when changes are being pushed from another machine. |

The frontend is plain HTML/CSS/JS in `public/` — no build step.

## Files

```
poetry/
├── server.js         Express server + /api/poem proxy + /api/health
├── package.json      deps (express, dotenv) and start / dev scripts
├── .env.example      template for the key
├── public/
│   ├── index.html    UI
│   ├── styles.css    styles
│   └── script.js     frontend logic, prompts, modes, demo mode
└── README.md         this file
```

Static frontend is served from `public/` by `express.static`; everything else
is the API. No build step.

## Endpoints

- `GET  /api/health` → `{ ok, hasKey }` — used by the settings panel
  to show whether the key is loaded.
- `POST /api/poem`   → forwarded verbatim to
  `https://api.anthropic.com/v1/messages`.

## Keyboard

- ⌘/Ctrl+Enter — capture
- Esc — close settings
