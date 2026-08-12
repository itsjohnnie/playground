---
name: verify
description: Build-and-drive recipe for verifying changes to the johnnies.life site (Next.js app in johnnie/, static admin CMS, Cloudflare Worker).
---

# Verifying johnnies.life changes

The production site is a Cloudflare Worker (`wrangler.toml`, worker/index.js)
serving the static Next.js export from `johnnie/out`, with custom domains
johnnies.life + www.johnnies.life. The workers.dev subdomain is DEAD (disabled
by the custom-domain routes) — never test against playground.johnnie-885.workers.dev.

## Static pages and the /admin CMS

No build needed for anything under `johnnie/public` (served verbatim). Serve it
directly and drive it in the browser pane:

- `.claude/launch.json` has an `admin-static` config: python3 http.server on
  port 8917 with `--directory johnnie/public`. Start with preview_start, then
  navigate to http://localhost:8917/admin/.
- Sveltia CMS loads `/admin/config.yml` fresh on each page load (cache-busted).
- The GitHub sign-in button opens a popup via `window.open`; the pane does NOT
  track popup windows in tabs_context or network logs. To capture the popup
  URL, install a spy before clicking:
  `window.__openedUrls=[]; const o=window.open.bind(window); window.open=(u,...r)=>{window.__openedUrls.push(String(u)); return o(u,...r)}`
- Sveltia's a11y tree is sometimes empty right after load (read_page returns
  "(empty page)", viewport 0x0) even though the page renders. Screenshot and
  click by coordinates instead; screenshot coordinate space is 800x450 (the
  returned image is 2x).

## The OAuth chain (admin login)

Full chain, verifiable without signing in:
1. CMS popup → `https://johnnies.life/auth?provider=github...` (from
   `base_url` + `auth_endpoint` in johnnie/public/admin/config.yml)
2. Worker /auth → 302 to github.com/login/oauth/authorize with
   `redirect_uri=https://johnnies.life/callback`
3. GitHub renders the authorize prompt ("Johnnie's Life CMS") — a
   redirect_uri mismatch would show an error page here instead.
WebFetch reports cross-host 302s with their Location — use it for steps 2-3.
Stop before actually authorizing (credentials).

## Next.js app changes

App lives in `johnnie/`; static export outputs to `johnnie/out`. For app-code
changes run the dev server from `johnnie/` (`npm run dev`) via a launch.json
entry rather than serving public/.

## Playground pages (repo root → itsjohnnie.github.io/playground)

Everything at the repo root (`index.html`, `piggies/`, `ascii/`, ...) is
GitHub Pages static — no build. `.claude/launch.json` has a
`playground-static` config: python3 http.server on port 8923 with
`--directory .`. Start with preview_start, navigate to
http://localhost:8923/<project>/.

Canvas/scroll experiences (ascii, piggies) pause their rAF loop when the
preview pane is hidden (`document.hidden`), and screenshots of a hidden pane
come back black. To verify headlessly: piggies exposes an opt-in debug hook —
load `/?debug`, then `window.__step(scrollY, timeSeconds)` renders exactly one
frame synchronously and returns `{scene, t}`; export the canvas with
`toDataURL` and POST it to a throwaway local receiver (see
scratchpad/frame_server.py pattern: python http server on 8924 that decodes
base64 PNG bodies to files), then Read the PNGs as images. After an emulated
resize, dispatch `new Event('resize')` and wait ~400ms so the engine
re-measures its act spacers before stepping.
