# Johnnie's Life — Next.js

A 1:1 migration of [johnnies.life](https://johnnies.life) from Webflow to a
code-based **Next.js** app with a free, Git-based **CMS**. Built to deploy for
free on **Cloudflare Pages** (or any static host) and to be edited via Claude
Code or a point-and-click admin.

## What's here

```
johnnie/
├─ app/
│  ├─ layout.tsx     # <head>, fonts, favicons, global styles, data-wf attrs
│  ├─ page.tsx       # the full homepage markup (renders content below)
│  └─ scripts.tsx    # loads jQuery + Webflow IX2 runtime + Three.js smoke
├─ content/
│  ├─ projects/*.md  # the "Work" grid — one file per project (CMS-managed)
│  └─ features/*.md  # the "Features & Appearances" list (CMS-managed)
├─ lib/content.ts    # reads the markdown front-matter at build time
└─ public/
   ├─ webflow.css    # the exact published Webflow stylesheet (fonts localized)
   ├─ js/            # vendored Webflow IX2 chunks (animations/interactions)
   ├─ vendor/        # jQuery, three.js, smoke texture
   ├─ images/ icons/ videos/ fonts/ lottie/   # every asset, self-hosted
   └─ admin/         # Sveltia CMS (config.yml + index.html)
```

### Fidelity approach

To guarantee the look/feel is identical, the migration **reuses Webflow's exact
CSS and its IX2 interaction runtime** (the `data-w-id` attributes in the markup
plus the vendored `public/js/webflow.*.js` chunks). That keeps every animation,
the marquee, the lottie hamburger, the scroll-reveal nav, the blob, and the
Three.js smoke field byte-for-byte faithful. All assets are downloaded from the
Webflow CDN into `public/`, so the site no longer depends on Webflow.

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

**Projects** and **Features** are markdown files with front-matter in
`content/`. Two ways to edit:

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

## Deploy free on Cloudflare Pages

1. Push this repo to GitHub (already at `itsjohnnie/playground`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   connect the repo.
3. Build settings:
   - **Build command:** `cd johnnie && npm install && npm run build`
   - **Output directory:** `johnnie/out`
4. Add your domain `johnnies.life` under the project's **Custom domains**.

Cloudflare Pages' free tier covers this entirely (static hosting + global CDN).

## Notes

- The contact form preserves the original Webflow markup/styling. Webflow's form
  backend is gone, so wire the `<form>` to a free endpoint (Cloudflare Pages
  Functions, Formspree, etc.) when you want submissions delivered.
