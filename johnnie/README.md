# Johnnie's Life — Next.js

[johnnies.life](https://johnnies.life), a code-based **Next.js** app with a
free, Git-based **CMS**. Built to deploy for free on **Cloudflare Pages** (or
any static host) and to be edited via Claude Code or a point-and-click admin.

## What's here

```
johnnie/
├─ app/
│  ├─ layout.tsx     # <head>, fonts, favicons, global styles
│  ├─ page.tsx       # the full homepage markup (renders content below)
│  ├─ scripts.tsx    # color-cycling bg, scroll-reveal nav, lightbox — all native JS
│  └─ music/         # A Song a Day® — the index, /music/[slug]/, and its CSS
├─ content/
│  ├─ projects/*.md  # the "Work" grid — one file per project (CMS-managed)
│  ├─ features/*.md  # the "Features & Appearances" list (CMS-managed)
│  └─ music/*.md     # one file per song in A Song a Day® (CMS-managed)
├─ lib/content.ts    # reads the markdown front-matter at build time
└─ public/
   ├─ site.css       # the site's stylesheet (fonts localized)
   ├─ images/ icons/ videos/ fonts/   # every asset, self-hosted
   ├─ music/         # album art, self-hosted (was on Webflow's CDN)
   └─ admin/         # Sveltia CMS (config.yml + index.html)
```

### Approach

Everything is hand-written, native code — no page-builder runtime, no jQuery,
no third-party animation library. The interactions:

- **Color-cycling background** + `--bg` variable + live `theme-color` — `app/scripts.tsx`
- **Scroll-reveal nav + hamburger menu** — `app/site-nav.tsx`
- **Marquee, hamburger icon, mobile menu, footer spin, lightbox, smooth scroll** — CSS in `app/layout.tsx`

All assets are self-hosted in `public/`, so the site has no external runtime
dependencies at all.

Fonts: **Inconsolata** (Google Fonts) + an **Adobe Fonts / Typekit** kit
(`uqs5mpm` — Eckmann, Program Narrow, Franklin Gothic) loaded from their font
services exactly as the original did, plus a self-hosted **Henrietta** webfont.

## Develop

```bash
cd johnnie
npm install
npm run dev            # http://localhost:3000
```

## Build (static export)

```bash
npm run build          # outputs a static site to ./out
npm run serve          # preview the exported ./out locally
```

`next.config.mjs` uses `output: "export"`, so `out/` is a plain static site.

## Edit content

**Projects**, **Features** and **A Song a Day** are markdown files with
front-matter in `content/`. Two ways to edit:

1. **Claude Code / any editor** — edit the `.md` files directly. Add a project
   by dropping an image in `public/images/` and creating a new file in
   `content/projects/` (copy an existing one; `order` controls position).
2. **Admin UI (Sveltia CMS)** — visit `/admin/` on the deployed site. It commits
   changes and uploaded images straight to GitHub. To edit locally without auth:
   ```bash
   npx @sveltia/cms-server      # then open http://localhost:3000/admin/
   ```
   For the hosted admin, set up a GitHub OAuth app and point `/admin/config.yml`
   at it (see Sveltia docs). `repo`/`branch` are configured in that file.

## A Song a Day® (`/music`)

Migrated off [a-song-a-day.webflow.io](https://a-song-a-day.webflow.io) — the
design is the same, hand-written instead of Webflow-generated, and the album
art is self-hosted under `public/music/` rather than served from Webflow's CDN.

- **Index** — `app/music/page.tsx`, the grid, newest song first.
- **Song page** — `app/music/[slug]/page.tsx`, one static HTML file per song
  (`generateStaticParams`), on its own accent colour.
- **Styles** — `app/music/music.css`, ported by hand from the Webflow
  stylesheet; scoped under `.asad` so it can't touch the rest of the site.

Adding a song in the CMS ("A Song a Day" collection) is all it takes: the grid,
the prev/next arrows, the "All songs" panel and the song's own page all follow
from the one entry. The fields worth knowing:

| Field | Notes |
|-------|-------|
| `order` | The song's number in the run. Highest shows first — a new song is the next number up. |
| `color` | The song page's background. Pick it out of the artwork. |
| `youtube` | Just the video id (`g8sX6wZHhD0`), not the whole URL. Plays behind the page. |
| `note` | Optional. Replaces the automatic "a song by X, featured in the album Y." line. |
| `slug` | Optional URL override. Blank = derived from the title. |

Songs kept their Webflow slugs, and `/song/<slug>` 301s to `/music/<slug>/`
(`public/_redirects`), so old links still land.

One thing browsers changed since the original: unmuted autoplay is refused
everywhere now, so the song page ships a **Play the video** button next to the
Spotify one. It drives the same embed through YouTube's postMessage API, and
its label follows the player's real state rather than what we asked for.

## Hosting / base path

The app supports being served from a subdirectory via the `PAGES_BASE_PATH`
build-time env var (empty = domain root). All asset URLs are prefixed
accordingly (`lib/asset.ts`).

- Root host (Cloudflare, `johnnies.life`): leave `PAGES_BASE_PATH` unset.
- GitHub Pages project site (`/playground/johnnie/`): build with
  `PAGES_BASE_PATH=/playground/johnnie`.

## Deploy free on GitHub Pages (already wired)

This repo already deploys to GitHub Pages via `.github/workflows/deploy.yml` on
every push to `main`. `johnnie` is built there with
`PAGES_BASE_PATH=/playground/johnnie` and published at
**https://itsjohnnie.github.io/playground/johnnie/**. Merge to `main` to update it.

## Deploy free on Cloudflare Pages

1. Push this repo to GitHub (already at `itsjohnnie/playground`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   connect the repo.
3. Build settings:
   - **Build command:** `cd johnnie && npm install && npm run build`
   - **Output directory:** `johnnie/out`
4. Add your domain `johnnies.life` under the project's **Custom domains**.

Cloudflare Pages' free tier covers this entirely (static hosting + global CDN).

## Contact form (Cloudflare Email Routing)

The form posts JSON to `POST /api/contact`, handled by the Cloudflare Worker in
`../worker/index.js`, which emails it to you via **Cloudflare Email Routing**
(no third party). Spam is filtered with a honeypot field; header values are
sanitized. Success/error states are rendered in `app/contact-form.tsx`.

One-time Cloudflare setup:

1. Make sure the site is deployed as a **Worker** (the repo `wrangler.toml`
   already sets `main = worker/index.js` + the `[assets]` and `[[send_email]]`
   bindings).
2. In the Cloudflare dashboard for **johnnies.life**: **Email → Email Routing →
   Enable**.
3. **Email Routing → Destination addresses → Add** `johnnie@hey.com` and click
   the verification link Cloudflare emails there.
4. (Optional) change the inbox / from-address via the `CONTACT_TO` /
   `CONTACT_FROM` vars in `wrangler.toml`.
5. Redeploy. The form now delivers to your inbox; replies go straight to the
   sender (Reply-To is set to their address).

Note: `/api/contact` only exists on the Cloudflare deployment. On the GitHub
Pages mirror the form renders but can't send (no Worker).
