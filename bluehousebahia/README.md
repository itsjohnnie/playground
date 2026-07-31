# bluehousebahia.com

A byte-for-byte static export of the Webflow site at bluehousebahia.com,
deployed as a Cloudflare Worker with static assets (no server-side logic
needed — same free-tier approach used for johnnies.life at the repo root).

## What's here

The live Webflow site currently serves two distinct pages, both replicated
exactly (markup, copy, CSS, fonts, images, responsive breakpoints, and the
mobile nav toggle behavior):

- `public/index.html` — the current homepage: a "Bluehouse" wordmark, email,
  and address on a solid blue background.
- `public/old-home/index.html` — the fuller original design, still reachable
  in Webflow's sitemap at `/old-home`: nav, hero, full-bleed photo, room
  listings (Casa Coral, Casa Marina), an amenities grid, and a CTA section,
  in Portuguese.

All `assets.website-files.com` assets referenced by both pages (Webflow's own
CSS/JS runtime, the self-hosted "Sandrina" font, every photo at every
`srcset` size, and every icon) were downloaded and are now self-hosted under
`public/css`, `public/js`, `public/fonts`, `public/images`, and
`public/icons` — nothing depends on Webflow's CDN anymore, so the site keeps
working after the Webflow project is deleted.

Two things intentionally still point off-site, both correct choices, not
leftovers:
- **Adobe Fonts (Typekit)** — `use.typekit.net/zst7kvh.js` serves the
  `ivypresto-headline` and `presicav` faces used for headings/buttons. Adobe
  Fonts kits are licensed per-kit, not per-host, so this keeps working
  unchanged after the domain moves off Webflow.
- **Google Fonts** — DM Sans and Lora are loaded via a standard
  `fonts.googleapis.com` `<link>` instead of Webflow's `webfont.js` loader.
  Same fonts, same rendering, one less script dependency.

## One-time Cloudflare setup

1. Make sure bluehousebahia.com's nameservers point at Cloudflare (add the
   zone in the Cloudflare dashboard if it isn't there yet).
2. In the Cloudflare dashboard, **delete the existing Webflow DNS records**
   for the domain — the apex `A` record and the `www` `CNAME` pointing at
   Webflow's proxy. `wrangler deploy` will fail to attach the custom domains
   otherwise ("hostname already has externally managed DNS records").
3. Deploy: `cd bluehousebahia && npx wrangler deploy` (or push to `main` —
   see `.github/workflows/deploy-bluehousebahia.yml`, which reuses the same
   `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repo secrets as the
   johnnies.life deploy). Cloudflare attaches the `bluehousebahia.com` and
   `www.bluehousebahia.com` custom domains automatically on first deploy.
4. Once DNS has propagated, cancel the Webflow hosting plan / remove the
   custom domain from the Webflow project.

## Local preview

```
cd bluehousebahia/public && npx serve .
```

or `npx wrangler dev` from `bluehousebahia/` to preview through the Worker
itself.
