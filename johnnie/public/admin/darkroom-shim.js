/* The darkroom shim: bakes the negative pipeline into the CMS itself.
   Loaded BEFORE Sveltia, it intercepts every image on its way into the
   uploader — file inputs, drag-and-drop, and the File System Access
   picker — and develops JPEGs in the browser: EXIF read, GPS
   reverse-geocoded, the plate re-encoded at 1920px with metadata
   stripped. The curated capture data rides along as a JPEG comment
   (the same fields the site publishes, nothing more); the darkroom bot
   in the deploy workflow reads that comment into the manifest and
   removes it. The raw original never reaches the repo. */

(() => {
  "use strict";

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const WINDS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const flatten = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const isJpeg = (f) => /^image\/jpe?g$/.test(f.type) || /\.jpe?g$/i.test(f.name);

  async function buildMeta(ex) {
    const meta = { place: "", time: "", date: "", gps: "", spec: "", lens: "", film: "", iso: "", ev: "", alt: "", dir: "" };
    let title = "", year = null;
    const dt = ex.DateTimeOriginal instanceof Date ? ex.DateTimeOriginal : null;
    if (dt) {
      year = dt.getFullYear();
      meta.time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      meta.date = `${MONTHS[dt.getMonth()]} ${String(dt.getDate()).padStart(2, "0")}\n${meta.time}`;
    }
    if (ex.FNumber && ex.ExposureTime)
      meta.spec = `F ${Math.round(ex.FNumber * 10) / 10} · 1/${Math.round(1 / ex.ExposureTime)}`;
    if (ex.FocalLengthIn35mmFormat) meta.lens = `${ex.FocalLengthIn35mmFormat}MM`;
    if (ex.ISO) meta.iso = `ISO ${ex.ISO}`;
    const ev = typeof ex.ExposureCompensation === "number" ? Math.round(ex.ExposureCompensation * 10) / 10 : 0;
    meta.ev = ev ? `EV ${ev > 0 ? "+" : "−"}${Math.abs(ev)}` : "EV 0";
    if (ex.Model) meta.film = flatten(String(ex.Model).toUpperCase().trim());
    if (typeof ex.latitude === "number") {
      const ns = ex.latitude >= 0 ? "N" : "S", ew = ex.longitude >= 0 ? "E" : "W";
      meta.gps = `${Math.abs(ex.latitude).toFixed(4)}° ${ns}\n${Math.abs(ex.longitude).toFixed(4)}° ${ew}`;
      if (typeof ex.GPSAltitude === "number") meta.alt = `ALT ${Math.round(ex.GPSAltitude)}M`;
      if (typeof ex.GPSImgDirection === "number")
        meta.dir = `${Math.round(ex.GPSImgDirection)}° ${WINDS[Math.round(ex.GPSImgDirection / 45)]}`;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${ex.latitude}&lon=${ex.longitude}&format=json&zoom=16`);
        const a = (await r.json()).address || {};
        meta.place = flatten((a.neighbourhood || a.quarter || a.suburb || a.village || a.town || a.city || "").toUpperCase());
        const city = a.city || a.town || a.village || "";
        const suffix = city === "Barcelona" ? "BCN" : flatten(city.toUpperCase());
        if (meta.place) title = suffix && suffix !== meta.place ? `${meta.place}, ${suffix}` : meta.place;
      } catch {}
    }
    return { title, year, meta };
  }

  // the curated capture data rides in a JPEG COM segment after SOI
  function withComment(buf, json) {
    const payload = new TextEncoder().encode(json);
    const out = new Uint8Array(buf.byteLength + payload.length + 4);
    const src = new Uint8Array(buf);
    out.set(src.subarray(0, 2), 0); // SOI
    out[2] = 0xff; out[3] = 0xfe;
    const len = payload.length + 2;
    out[4] = (len >> 8) & 0xff; out[5] = len & 0xff;
    out.set(payload, 6);
    out.set(src.subarray(2), 6 + payload.length);
    return out.buffer;
  }

  async function develop(file) {
    try {
      if (!isJpeg(file) || !window.exifr) return file;
      const ex = await exifr.parse(file, { gps: true, translateValues: true }).catch(() => null);
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const oversized = Math.max(bmp.width, bmp.height) > 1920;
      if (!ex && !oversized) { bmp.close(); return file; } // already a clean plate
      const info = await buildMeta(ex || {});
      const s = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s);
      c.height = Math.round(bmp.height * s);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close();
      const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
      const tagged = withComment(await blob.arrayBuffer(), JSON.stringify({ darkroom: 1, ...info }));
      const name = file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
      console.info(`[darkroom] developed ${file.name} → ${name} (${c.width}×${c.height}, EXIF stripped)`);
      return new File([tagged], name, { type: "image/jpeg" });
    } catch (e) {
      console.warn("[darkroom] develop failed, passing original through; the deploy bot will catch it", e);
      return file;
    }
  }

  async function developAll(files) {
    const out = [];
    for (const f of files) out.push(await develop(f));
    return out;
  }
  const needsWork = (files) => [...files].some((f) => isJpeg(f));

  // ————— interception: inputs, drops, and the FS Access picker —————

  document.addEventListener("change", (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
    if (!input.files || !input.files.length || !needsWork(input.files)) return;
    if (input.dataset.darkroomDone === "1") { delete input.dataset.darkroomDone; return; }
    e.stopImmediatePropagation();
    developAll(input.files).then((files) => {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      input.files = dt.files;
      input.dataset.darkroomDone = "1";
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }, true);

  let redropping = false;
  document.addEventListener("drop", (e) => {
    if (redropping) return;
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length || !needsWork(files)) return;
    const target = e.target;
    e.preventDefault();
    e.stopImmediatePropagation();
    developAll(files).then((developed) => {
      const dt = new DataTransfer();
      developed.forEach((f) => dt.items.add(f));
      redropping = true;
      target.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
      redropping = false;
    });
  }, true);

  if (window.showOpenFilePicker) {
    const native = window.showOpenFilePicker.bind(window);
    window.showOpenFilePicker = async (...args) => {
      const handles = await native(...args);
      return handles.map((h) => new Proxy(h, {
        get: (t, prop) =>
          prop === "getFile" ? async () => develop(await t.getFile()) :
          typeof t[prop] === "function" ? t[prop].bind(t) : t[prop],
      }));
    };
  }
})();
