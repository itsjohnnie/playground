#!/usr/bin/env python3
"""The darkroom bot: develops raw plates the CMS commits.

Uploading a negative through /admin (Trips collection) drops the
original photo into johnnie/public/trips/plates and a manifest entry
into johnnie/public/trips/manifests. This script runs in the deploy
workflow BEFORE the build, so production never serves a raw plate:

  1. any plate carrying EXIF (or larger than 1920px) is developed —
     the capture data is extracted FIRST, then the file is re-encoded
     at 1920px long edge with the metadata stripped;
  2. the GPS is reverse-geocoded against OpenStreetMap for the place;
  3. manifest entries pointing at a developed plate get their EMPTY
     meta fields filled in the house format (existing text is never
     overwritten — the CMS user's words win).

The workflow commits whatever changed back to main; the build then
continues from the developed working tree.
"""

import io
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests
from PIL import Image, ImageOps
from PIL.ExifTags import GPSTAGS, TAGS

ROOT = Path(__file__).resolve().parent.parent
PLATES = ROOT / "johnnie/public/trips/plates"
MANIFESTS = ROOT / "johnnie/public/trips/manifests"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
WINDS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"]
META_KEYS = ["place", "time", "date", "gps", "spec", "lens", "film", "iso", "ev", "alt", "dir"]


def flatten(s: str) -> str:
    """The house style drops diacritics: GRÀCIA -> GRACIA, Ç -> C."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def geocode(lat: float, lon: float) -> dict:
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "zoom": 16},
            headers={"User-Agent": "johnnies-life-darkroom-bot/1.0"},
            timeout=20,
        )
        return r.json().get("address", {})
    except Exception as e:  # geocode failures leave the place blank, never fail the build
        print(f"  geocode failed: {e}")
        return {}


def extract(path: Path) -> dict | None:
    """Full EXIF read in the house format. None = plate is already clean."""
    im = Image.open(path)
    ex = im.getexif()
    sub = ex.get_ifd(0x8769)
    gps = ex.get_ifd(0x8825)
    oriented = ImageOps.exif_transpose(im)
    raw = len(ex) > 0 or max(im.size) > 1920
    if not raw:
        return None

    tags = {TAGS.get(k, k): v for k, v in list(ex.items()) + list(sub.items())}
    g = {GPSTAGS.get(k, k): v for k, v in gps.items()}
    meta = {k: "" for k in META_KEYS}
    out = {"meta": meta, "title": "", "year": None, "image": oriented}

    dt = tags.get("DateTimeOriginal") or tags.get("DateTime")
    if dt:
        m = re.match(r"(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})", str(dt))
        if m:
            y, mo, d, hh, mm = m.groups()
            out["year"] = int(y)
            meta["time"] = f"{hh}:{mm}"
            meta["date"] = f"{MONTHS[int(mo) - 1]} {d}\n{hh}:{mm}"

    fn = tags.get("FNumber")
    exp = tags.get("ExposureTime")
    if fn and exp:
        meta["spec"] = f"F {round(float(fn) * 10) / 10:g} · 1/{round(1 / float(exp))}"
    if tags.get("FocalLengthIn35mmFilm"):
        meta["lens"] = f"{tags['FocalLengthIn35mmFilm']}MM"
    if tags.get("ISOSpeedRatings"):
        iso = tags["ISOSpeedRatings"]
        meta["iso"] = f"ISO {iso[0] if isinstance(iso, (tuple, list)) else iso}"
    ev = tags.get("ExposureBiasValue")
    if ev is not None:
        v = round(float(ev) * 10) / 10
        meta["ev"] = "EV 0" if v == 0 else f"EV {'+' if v > 0 else '−'}{abs(v):g}"
    model = str(tags.get("Model") or "").strip()
    if model:
        meta["film"] = flatten(model.upper())

    if "GPSLatitude" in g and "GPSLongitude" in g:
        def dms(t, ref):
            v = float(t[0]) + float(t[1]) / 60 + float(t[2]) / 3600
            return -v if ref in "SW" else v

        lat = dms(g["GPSLatitude"], g.get("GPSLatitudeRef", "N"))
        lon = dms(g["GPSLongitude"], g.get("GPSLongitudeRef", "E"))
        ns, ew = ("N" if lat >= 0 else "S"), ("E" if lon >= 0 else "W")
        meta["gps"] = f"{abs(lat):.4f}° {ns}\n{abs(lon):.4f}° {ew}"
        if "GPSAltitude" in g:
            meta["alt"] = f"ALT {round(float(g['GPSAltitude']))}M"
        if "GPSImgDirection" in g:
            deg = float(g["GPSImgDirection"])
            meta["dir"] = f"{round(deg)}° {WINDS[round(deg / 45)]}"
        addr = geocode(lat, lon)
        place = addr.get("neighbourhood") or addr.get("quarter") or addr.get("suburb") \
            or addr.get("village") or addr.get("town") or addr.get("city") or ""
        meta["place"] = flatten(place.upper())
        city = addr.get("city") or addr.get("town") or addr.get("village") or ""
        suffix = "BCN" if city == "Barcelona" else flatten(city.upper())
        if meta["place"]:
            out["title"] = f"{meta['place']}, {suffix}" if suffix and suffix != meta["place"] else meta["place"]
        time.sleep(1)  # be a polite Nominatim citizen when several plates land at once

    return out


def develop(path: Path, image: Image.Image) -> None:
    """1920px long edge, re-encoded clean — the strip happens by construction."""
    im = image
    im.thumbnail((1920, 1920), Image.LANCZOS)
    if im.mode != "RGB":
        im = im.convert("RGB")
    clean = Image.new("RGB", im.size)
    clean.paste(im)
    clean.save(path, "JPEG", quality=85, optimize=True)


def main() -> None:
    developed: dict[str, dict] = {}
    if PLATES.is_dir():
        for path in sorted(PLATES.iterdir()):
            if path.suffix.lower() not in (".jpg", ".jpeg"):
                continue
            info = extract(path)
            if info is None:
                continue
            print(f"developing {path.name}")
            develop(path, info["image"])
            developed[f"/trips/plates/{path.name}"] = info

    if not developed:
        print("nothing to develop")
        return

    for mpath in sorted(MANIFESTS.glob("*.json")):
        doc = json.loads(mpath.read_text(encoding="utf-8"))
        changed = False
        for entry in doc.get("negatives", []):
            info = developed.get(entry.get("src", ""))
            if not info:
                continue
            entry.setdefault("author", "JOHNNIE")
            entry.setdefault("lic", "OWN ARCHIVE")
            entry.setdefault("page", "https://johnnies.life")
            if not entry.get("title") or entry.get("title") == "UNTITLED":
                if info["title"]:
                    entry["title"] = info["title"]
            if not entry.get("year") and info["year"]:
                entry["year"] = info["year"]
            meta = entry.setdefault("meta", {})
            for key in META_KEYS:
                if not meta.get(key) and info["meta"][key]:
                    meta[key] = info["meta"][key]
            changed = True
        if changed:
            mpath.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"manifest filled: {mpath.name}")

    print(f"developed {len(developed)} plate(s)")


if __name__ == "__main__":
    sys.exit(main())
