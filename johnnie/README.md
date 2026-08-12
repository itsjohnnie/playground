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
│  └─ songs/        # A Song a Day® — the index, /songs/[slug]/, and its CSS
├─ content/
│  ├─ projects/*.md  # the "Work" grid — one file per project (CMS-managed)
│  ├─ features/*.md  # the "Features & Appearances" list (CMS-managed)
│  └─ songs/*.md     # one file per song in A Song a Day® (CMS-managed)
├─ lib/content.ts    # reads the markdown front-matter at build time
└─ public/
   ├─ site.css       # the site's stylesheet (fonts localized)
   ├─ images/ icons/ videos/ fonts/   # every asset, self-hosted
   ├─ songs/         # the artist photos, self-hosted
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

(The **Badges** case at `/badge/` is CMS-managed too — see below.)

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

## Badges (`/badge`)

A case of numbered hard-enamel animal badges, struck in 3D from emoji. The
roster is one file — `public/badge/badges.json`, a list of `{emoji, label}` —
and the page (`public/badge/index.html`) fetches it at boot.

**Adding a badge:** open `/admin/` → **Badges**, append an entry (paste the
emoji, name it), publish. That's it — the deploy's badge bot
(`scripts/fetch-badge-glyphs.mjs`, run by the Cloudflare workflow and by
`npm run build`'s prebuild) downloads the Twemoji SVG the pin is struck from
(pinned release, self-hosted under `public/badge/lib/twemoji/`) and commits
it back. Or edit the JSON by hand and run `npm run badges:glyphs`.

Two rules, because each badge's number on the back is its position in the
list: **append at the end, never reorder, never delete.** An entry whose
emoji has no Twemoji glyph (a typo, or text that isn't an emoji) doesn't
break anything — the build warns and the page quietly skips it.

## A Song a Day® (`/songs`)

A playlist page: one song, one page, one photo, one colour.

- **Index** — `app/songs/page.tsx`. Every song, newest first, monochrome, with
  a search box that filters the list already on the page (no second copy of
  the data is shipped to do it).
- **Song page** — `app/songs/[slug]/page.tsx`, one static HTML file per song,
  on its own accent colour with the photo in full colour.
- **Styles** — `app/songs/songs.css`, scoped under `.sad` so it can't touch
  the rest of the site, or be touched by it.

### Adding a song

Tell Claude Code: *"I love this song."* The `add-song` skill
(`.claude/skills/add-song/`) drives `scripts/add-song.mjs`, which works out the
number, the slug, the date, the preview clip and the accent colour, and asks
you for the one thing it must not invent — the photo.

By hand, it's the same script:

```bash
npm run songs:add -- "Woods" "Mac Miller" \
  --album "Circles" \
  --spotify "https://open.spotify.com/track/3Qa944OTMZkg8DHjET8JQv" \
  --image ~/Desktop/mac.jpg --credit "Photo: Ryan Muir"
```

Or add it in `/admin/` ("A Song a Day"), or write the markdown file yourself.
All three end up in the same place.

### Playing the song

Each song carries a `preview`: a 30-second clip from Apple's public iTunes
Search endpoint. No account, no API key, no login — it plays for everyone,
which is the point. `npm run songs:previews` fills the field in for any song
that hasn't got one; 33 of the first 42 matched.

It only accepts a clip it is confident about — both title *and* artist have to
line up, and karaoke/tribute/instrumental impostors are rejected outright. A
loose search for "Wonderful Day" by CjayQ & glibs cheerfully returns O.A.R.,
and thirty seconds of the wrong song is worse than none. Songs with no match
show a "Play on Spotify" button instead.

**On autoplay:** no browser lets a page make noise before the visitor has
interacted with it — that rule is why the old "invisible autoplaying YouTube
video" approach had quietly stopped working. So the first song you open shows
a Play button; that one tap is remembered for the session, and every song you
open afterwards starts on its own. Browsing plays automatically. Only the
first page of a visit asks. (Paging with the arrows is a client-side
navigation for exactly this reason: a full page load would throw the
permission away.)

### Fields

| Field | Notes |
|-------|-------|
| `order` | The song's number in the run. Highest shows first. Never reuse one. |
| `color` | The page background. Text flips to black or white automatically, and the colour is nudged if neither would clear contrast — so a dark photo gives a dark page with light text, on purpose. |
| `image` | A photo of the artist. Not the album cover. |
| `credit` | Where the photo came from. Worth filling in. |
| `preview` | 30-second clip. `npm run songs:previews` fills it. |
| `spotify` | Link to the full track. |
| `note` | Optional. Replaces the automatic "a song by X…" line. |
| `slug` | Optional URL override. Blank = derived from the title. |

Old links still work: `/song/<slug>` and `/music/<slug>` both 301 to
`/songs/<slug>/` (`public/_redirects`).

### How big can it get

Measured, on a 4×-throttled phone, with the index fully server-rendered:

| songs | HTML | gzip | parse | LCP | search keystroke |
|-------|------|------|-------|-----|------------------|
| 42 | 92 KB | 19 KB | 308 ms | 268 ms | 8 ms |
| 300 | 408 KB | 45 KB | 852 ms | 328 ms | 44 ms |
| 1000 | 1.3 MB | 113 KB | 1.55 s | 380 ms | 6 ms |

A thousand songs is fine. LCP barely moves because `content-visibility: auto`
means the browser only lays out the cards you can actually see, and the pages
are static files, so serving a thousand costs what serving forty does. A
1000-song build takes about 50 seconds.

The one thing that *did* degrade was search — at a thousand cards, re-reading
every card's `data-find` attribute on each keystroke cost ~70 ms, which you
can feel. The strings are now read once into an array on mount, which takes it
to 6 ms. If the list ever gets far beyond a thousand, the next move is to
server-render the first couple of hundred and append the rest from a static
JSON index; nothing else needs to change.

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
