# Negatives — sources and rights

All photographs in this folder are Johnnie's own frames, all rights
reserved ("OWN ARCHIVE" on the sheet). Served files are stripped of
embedded EXIF; the real capture data lives in the `meta` field of
the trip manifest at `../manifests/barcelona.json` (editable in the
CMS at /admin → Trips) and drives the factual micro-copy for each
deal.
Extract EVERYTHING the file offers: place (reverse-geocoded), time
and date, GPS, aperture, shutter, ISO, 35mm-equivalent focal length,
exposure bias (EV), GPS altitude, and compass bearing.

| File | Work |
|---|---|
| `johnnie-tossa-2026.jpg` | Tossa de Mar, Jul 18 2026 |
| `johnnie-futadera-2026.jpg` | Cala Futadera, Jul 18 2026 |
| `johnnie-giverola-1-2026.jpg` | Cala Giverola I, Jul 18 2026 |
| `johnnie-giverola-2-2026.jpg` | Cala Giverola II, Jul 18 2026 |
| `johnnie-eixample-2026.jpg` | Eixample, Barcelona, Jul 23 2026 |
| `johnnie-giverola-3-2026.jpg` | Cala Giverola III, Jul 18 2026 |
| `johnnie-camironda-1-2026.jpg` | Camí de Ronda I, Jul 18 2026 |
| `johnnie-camironda-2-2026.jpg` | Camí de Ronda II, Jul 18 2026 |
| `johnnie-gotic-2026.jpg` | El Gòtic, Barcelona, Jul 17 2026 |
| `johnnie-futadera-2-2026.jpg` | Cala Futadera II, Jul 18 2026 |
| `johnnie-sagrada-1-2026.jpg` | Sagrada Família I, Jul 24 2026 |
| `johnnie-sagrada-2-2026.jpg` | Sagrada Família II, Jul 24 2026 |
| `johnnie-sagrada-3-2026.jpg` | Sagrada Família III, Jul 24 2026 |
| `johnnie-sagrada-4-2026.jpg` | Sagrada Família IV, Jul 24 2026 |
| `johnnie-sagrada-5-2026.jpg` | Sagrada Família V, Jul 24 2026 |
| `johnnie-santgervasi-2026.jpg` | Sant Gervasi, Barcelona, Jul 21 2026 |
| `johnnie-balmes-1-2026.jpg` | Ultramarinos I (Carrer de Balmes), Jul 25 2026 |
| `johnnie-balmes-2-2026.jpg` | Ultramarinos II (Carrer de Balmes), Jul 25 2026 |
| `johnnie-satuna-2026.jpg` | Sa Tuna, Begur, Jul 25 2026 |
| `johnnie-canuda-2026.jpg` | Carrer de la Canuda, Barcelona, Jul 26 2026 |
| `johnnie-placanova-2026.jpg` | Plaça Nova, Barcelona, Jul 26 2026 |
| `johnnie-lesaigues-2026.jpg` | Carretera de les Aigües, Barcelona, Jul 26 2026 |

## Adding new negatives

The easy way: drop the original into `/admin/darkroom/` — it reads
the EXIF, reverse-geocodes the place, resizes to 1920px, strips the
metadata, and commits the plate plus the manifest entry in one go.
Manually: process to ~1920px long edge, strip EXIF, then add the
entry in the CMS (/admin → Trips) or edit `../manifests/<slug>.json`
directly (src, author, title, year, lic, page, meta). Only add photographs you
own or have written permission to use; third-party work additionally
needs a license that permits cropping (the clippings are derivatives).
