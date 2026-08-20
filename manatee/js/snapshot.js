/* Rasterizes #hero-capture into a high-res canvas via SVG foreignObject.
   The SVG viewport matches the live CSS viewport width so media queries and
   vw units resolve identically; scaling happens at drawImage time (SVG is
   vector, so the raster comes out crisp at any scale). */

window.Snapshot = (() => {
  const FONTS = [
    { family: "Styrene A", weight: 500, style: "normal", url: "fonts/StyreneA-Medium-Web.woff2" },
    { family: "Styrene B", weight: 400, style: "normal", url: "fonts/StyreneB-Regular-Web.woff2" },
    { family: "Styrene B", weight: 500, style: "normal", url: "fonts/StyreneB-Medium-Web.woff2" },
    { family: "Tiempos Text", weight: 400, style: "normal", url: "fonts/TiemposText-Regular.woff2" },
    { family: "Tiempos Text", weight: 400, style: "italic", url: "fonts/TiemposText-RegularItalic.woff2" },
    { family: "Tiempos Text", weight: 500, style: "normal", url: "fonts/TiemposText-Medium.woff2" },
  ];

  let fontCssPromise = null;
  let pageCssPromise = null;

  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function loadFontCss() {
    if (!fontCssPromise) {
      fontCssPromise = Promise.all(
        FONTS.map(async (f) => {
          const buf = await fetch(f.url).then((r) => r.arrayBuffer());
          return `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.style};` +
                 `src:url(data:font/woff2;base64,${toBase64(buf)}) format("woff2");}`;
        })
      ).then((rules) => rules.join("\n"));
    }
    return fontCssPromise;
  }

  function loadPageCss() {
    if (!pageCssPromise) {
      pageCssPromise = fetch("css/page.css").then((r) => r.text());
    }
    return pageCssPromise;
  }

  async function capture() {
    const node = document.getElementById("hero-capture");
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    if (!w || !h || !window.innerWidth) throw new Error("zero-size capture");

    const [fontCss, pageCss] = await Promise.all([loadFontCss(), loadPageCss(), document.fonts.ready]);

    const clone = node.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    const markup = new XMLSerializer().serializeToString(clone);

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<foreignObject width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" class="snap-root" style="width:${w}px;height:${h}px;overflow:hidden;">` +
      `<style>${fontCss}\n${pageCss}</style>` +
      markup +
      `</div></foreignObject></svg>`;

    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(2.2, 4096 / w, 4096 / h, Math.max(1.4, dpr * 1.1));

    const out = document.createElement("canvas");
    out.width = Math.round(w * scale);
    out.height = Math.round(h * scale);
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#faf9f5";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(img, 0, 0, out.width, out.height);

    return { canvas: out, cssWidth: w, cssHeight: h, scale };
  }

  return { capture };
})();
