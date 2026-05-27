// poetry camera / previewer
// State and per-mode prompts live in localStorage. The image and prompt go
// to /api/poem (the local express server), which forwards to Anthropic
// server-to-server. The 32-char-per-line rule is the printer's invariant.

const STORAGE_KEY = "poetry-camera-prompts";
const MODEL_STORAGE = "poetry-camera-model";
const ACTIVE_MODE_STORAGE = "poetry-camera-active-mode";
const BORDER_TOP_STORAGE = "poetry-camera-border-top";
const BORDER_BOTTOM_STORAGE = "poetry-camera-border-bottom";
const FOOTER_STORAGE = "poetry-camera-footer";

// ─── modes & per-mode default prompts ─────────────────────────────────────
// One canonical printer rule shared by every mode: thermal paper is 32
// characters wide. Keep prompts close to the camera's actual wording.

const PRINTER_RULE =
  "Each line must be no more than 32 characters wide. Output only the poem.";

const DEFAULT_PROMPTS = {
  haiku:
`haiku (5-7-5 syllable structure). Only write the one haiku, and nothing else.

${PRINTER_RULE}`,

  receipt:
`itemized receipt, sarcastic and dry tone, 5-7 items. Be concise. Use dollar amounts to comical effect. Each receipt line is 32 letters wide, so pad any dollar amounts with the appropriate number of periods beforehand.`,

  limerick:
`limerick (AABBA rhyme scheme)

${PRINTER_RULE}`,

  sonnet:
`modern sonnet. do not use old english. 14 lines, iambic pentameter, ABAB CDCD EFEF GG rhyme scheme.

${PRINTER_RULE}`,

  alliteration:
`alliteration poem where each word starts with the same letter. Up to 4 lines total.

${PRINTER_RULE}`,

  portrait:
`portrait mode poem: prose poem, with line breaks at meaningful points, focusing on the person in the photo. what type of person might they be? what are they feeling in this moment? poem length should not exceed 12 lines.

${PRINTER_RULE}`,

  "free verse":
`highly unusual and experimental free verse poem that uses fragments of phrases, unusual punctuation, artful spacing, etc. spaces should not exceed 12 spaces. poem length should not exceed 12 lines. do not write anything except the poem.

Each line must be no more than 32 characters wide.`,
};

const MODES = ["haiku", "receipt", "limerick", "sonnet", "alliteration", "portrait", "free verse"];

// ─── printer defaults: borders + footer ───────────────────────────────────
// Verbatim from the camera. ≤32 chars per line. Whitespace is significant.

const DEFAULT_BORDER_TOP =
"`'. .'`'. .'`'. .'`'. .'`'. .'`\n   `     `     `     `     `";

const DEFAULT_BORDER_BOTTOM =
"   .     .     .     .     .   \n_.` `._.` `._.` `._.` `._.` `._";

const DEFAULT_FOOTER = "poetry.camera";

// ─── canned poems for demo mode — each ≤32 chars per line ─────────────────
const DEMO_POEMS = {
  haiku:
`morning at the sill —
the cup forgets to be warm,
remembers the light`,

  receipt:
`POETRY CAMERA · MORNING #047
--------------------------------
WINDOW LIGHT ............. $0.00
ONE CUP, CERAMIC ......... $1.25
STEAM, RISING ............ $0.40
A FAINT ROOFTOP .......... $0.75
ONE PIGEON, OFFSTAGE ..... $0.10
SILENCE, GENEROUS ........ $0.00
--------------------------------
SUBTOTAL ................. $2.50
TAX (TIME PASSING) ....... $0.30
TOTAL .................... $2.80`,

  limerick:
`A cup on a sill in the morn
left rooftops both quiet and worn.
   It steamed at the view,
   said "I'm nearly through —
the day is no longer forlorn."`,

  sonnet:
`The morning lays its hand across
the cup, the sill, the patient floor,
and counts the steam as private cost
of keeping silent one more hour.

A pigeon practices its note,
a small refrain it half-forgets,
the city clears its hidden throat
and pays its quiet morning debts.

I have no errand to perform.
The light arranges what it sees:
the chair, the page, the gentle storm
of small things settling by degrees.

   The window keeps me, plain and true.
   The poem is the morning's view.`,

  alliteration:
`soft sun settles, slow surrender —
sparrows stitch a still suburban sky,
steam slips skyward, sweet and slender,
silence sings, the city sighs.`,

  portrait:
`he sits with his hands in pause,
each finger a careful clause.

there is light enough to see
he is mostly remembering.

he looks past the room
the way a person looks
when something inside them
is still arriving.`,

  "free verse":
`     before
the city — wakes,
   the window keeps
  one audience:
   one cup. one rim
        of steam.

a pigeon practices.
        practices.
   one word
        i almost
   — remember.`,
};

// ─── sample SVG (used by "try a sample" so demo has something to look at) ─
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#efe0c2"/>
      <stop offset="0.6" stop-color="#d9b88e"/>
      <stop offset="1" stop-color="#a67a52"/>
    </linearGradient>
    <linearGradient id="sill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a7158"/>
      <stop offset="1" stop-color="#5a4636"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="#1f1a14"/>
  <rect x="44" y="30" width="312" height="220" fill="url(#sky)"/>
  <g stroke="#1f1a14" stroke-width="4" fill="none">
    <rect x="44" y="30" width="312" height="220"/>
    <line x1="200" y1="30" x2="200" y2="250"/>
    <line x1="44" y1="150" x2="356" y2="150"/>
  </g>
  <g fill="#3b2e22" opacity="0.7">
    <polygon points="44,200 90,170 130,200 170,175 200,200 44,200"/>
    <polygon points="200,200 240,180 280,205 320,178 356,200 200,200"/>
    <rect x="78" y="178" width="6" height="14"/>
    <rect x="148" y="180" width="6" height="12"/>
    <rect x="258" y="186" width="6" height="12"/>
  </g>
  <rect x="44" y="250" width="312" height="20" fill="url(#sill)"/>
  <ellipse cx="170" cy="262" rx="34" ry="6" fill="#1f1a14" opacity="0.4"/>
  <path d="M142 258 L148 286 Q170 294 192 286 L198 258 Z" fill="#eadcc0" stroke="#1f1a14" stroke-width="2"/>
  <ellipse cx="170" cy="258" rx="28" ry="5" fill="#5a3a22"/>
  <path d="M196 266 Q214 266 214 276 Q214 286 196 286" fill="none" stroke="#1f1a14" stroke-width="2"/>
  <g stroke="#f7f4ee" stroke-width="2" fill="none" opacity="0.55">
    <path d="M156 252 Q150 240 158 228 Q166 216 158 204"/>
    <path d="M172 252 Q180 242 172 230 Q164 218 172 206"/>
    <path d="M188 252 Q182 244 188 232 Q194 220 188 208"/>
  </g>
</svg>`;

// ─── state ────────────────────────────────────────────────────────────────
let state = {
  image: null,
  mode: localStorage.getItem(ACTIVE_MODE_STORAGE) || "haiku",
  model: localStorage.getItem(MODEL_STORAGE) || "claude-sonnet-4-6",
  prompts: loadPrompts(),
  borderTop: localStorage.getItem(BORDER_TOP_STORAGE) ?? DEFAULT_BORDER_TOP,
  borderBottom: localStorage.getItem(BORDER_BOTTOM_STORAGE) ?? DEFAULT_BORDER_BOTTOM,
  footer: localStorage.getItem(FOOTER_STORAGE) ?? DEFAULT_FOOTER,
  loading: false,
};

if (!MODES.includes(state.mode)) state.mode = "haiku";

// ─── element refs ─────────────────────────────────────────────────────────
const el = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  preview: document.getElementById("preview"),
  clearBtn: document.getElementById("clear-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  modeSelect: document.getElementById("mode-select"),
  prompt: document.getElementById("prompt"),
  promptModeLabel: document.getElementById("prompt-mode-label"),
  promptStatus: document.getElementById("prompt-status"),
  promptChars: document.getElementById("prompt-chars"),
  resetPrompt: document.getElementById("reset-prompt"),
  model: document.getElementById("model"),
  demoToggle: document.getElementById("demo-toggle"),
  capture: document.getElementById("capture"),
  paper: document.getElementById("paper"),
  paperStage: document.getElementById("paper-stage"),
  paperReady: document.getElementById("paper-ready"),
  receiptError: document.getElementById("receipt-error"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsModal: document.getElementById("settings-modal"),
  settingsClose: document.getElementById("settings-close"),
  statusDot: document.getElementById("status-dot"),
  statusText: document.getElementById("status-text"),
  statusPillDot: document.getElementById("status-pill-dot"),
  statusPillText: document.getElementById("status-pill-text"),
  borderTopInput: document.getElementById("border-top-input"),
  borderBottomInput: document.getElementById("border-bottom-input"),
  footerInput: document.getElementById("footer-input"),
  printerReset: document.getElementById("printer-reset"),
  resetAll: document.getElementById("reset-all"),
};

// ─── init ─────────────────────────────────────────────────────────────────
renderModes();
syncPrompt();
el.model.value = state.model;
el.borderTopInput.value = state.borderTop;
el.borderBottomInput.value = state.borderBottom;
el.footerInput.value = state.footer;
updateCaptureLabel();
checkServer();
tryLoadDefaultImage();

// ─── prompts ──────────────────────────────────────────────────────────────
function loadPrompts() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const out = {};
    for (const m of MODES) out[m] = stored[m] ?? DEFAULT_PROMPTS[m];
    return out;
  } catch {
    return { ...DEFAULT_PROMPTS };
  }
}

function savePrompts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.prompts));
}

function isEdited(mode) {
  return state.prompts[mode] !== DEFAULT_PROMPTS[mode];
}

// ─── modes (full-width dropdown) ──────────────────────────────────────────
function renderModes() {
  el.modeSelect.innerHTML = "";
  for (const mode of MODES) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = mode + (isEdited(mode) ? "  ·  edited" : "");
    if (mode === state.mode) opt.selected = true;
    el.modeSelect.appendChild(opt);
  }
}

el.modeSelect.addEventListener("change", () => setMode(el.modeSelect.value));

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem(ACTIVE_MODE_STORAGE, mode);
  renderModes();
  syncPrompt();
}

// ─── prompt textarea ──────────────────────────────────────────────────────
function syncPrompt() {
  const text = state.prompts[state.mode];
  el.prompt.value = text;
  el.promptModeLabel.textContent = state.mode;
  el.promptChars.textContent = text.length;
  el.promptStatus.textContent = isEdited(state.mode) ? "edited" : "default";
}

el.prompt.addEventListener("input", () => {
  state.prompts[state.mode] = el.prompt.value;
  el.promptChars.textContent = el.prompt.value.length;
  el.promptStatus.textContent = isEdited(state.mode) ? "edited" : "default";
  savePrompts();
  renderModes();
});

el.resetPrompt.addEventListener("click", () => {
  state.prompts[state.mode] = DEFAULT_PROMPTS[state.mode];
  savePrompts();
  syncPrompt();
  renderModes();
});

// ─── model ────────────────────────────────────────────────────────────────
el.model.addEventListener("change", () => {
  state.model = el.model.value;
  localStorage.setItem(MODEL_STORAGE, state.model);
});

// ─── image input ──────────────────────────────────────────────────────────
el.fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) loadImage(file);
});

el.dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  el.dropzone.classList.add("dragover");
});

el.dropzone.addEventListener("dragleave", () => {
  el.dropzone.classList.remove("dragover");
});

el.dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  el.dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file && file.type.startsWith("image/")) loadImage(file);
});

window.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) =>
    i.type.startsWith("image/")
  );
  if (item) {
    const file = item.getAsFile();
    if (file) loadImage(file);
  }
});

el.clearBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  clearImage();
});

el.sampleBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  loadSampleImage();
});

function loadSampleImage() {
  // Prefer the real sample.jpg sitting in public/ if it exists; fall back
  // to the inline SVG so something always shows up.
  fetch("/sample.jpg", { cache: "no-store" })
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then(blobToImage)
    .catch(() => useInlineSampleSvg());
}

function useInlineSampleSvg() {
  const base64 = btoa(SAMPLE_SVG);
  const mediaType = "image/svg+xml";
  const dataUrl = `data:${mediaType};base64,${base64}`;
  state.image = { dataUrl, base64, mediaType, isSample: true };
  el.preview.src = dataUrl;
  el.dropzone.classList.add("has-image");
  el.capture.disabled = false;
}

function blobToImage(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const [meta, base64] = dataUrl.split(",");
      state.image = {
        dataUrl,
        base64,
        mediaType: blob.type || "image/jpeg",
        isSample: true,
      };
      el.preview.src = dataUrl;
      el.dropzone.classList.add("has-image");
      el.capture.disabled = false;
      resolve();
    };
    reader.readAsDataURL(blob);
  });
}

// On page load, if public/sample.jpg exists, drop it into the dropzone so
// the previewer has something to look at from the first paint. Silent on
// missing — the dropzone just stays empty.
async function tryLoadDefaultImage() {
  if (state.image) return;
  try {
    const r = await fetch("/sample.jpg", { cache: "no-store" });
    if (!r.ok) return;
    const blob = await r.blob();
    await blobToImage(blob);
  } catch {}
}

function loadImage(file) {
  if (file.size > 8 * 1024 * 1024) {
    showError("image is over 8MB. try a smaller one.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const [meta, base64] = dataUrl.split(",");
    const mediaType = meta.match(/data:([^;]+);/)?.[1] || file.type;
    state.image = { dataUrl, base64, mediaType };
    el.preview.src = dataUrl;
    el.dropzone.classList.add("has-image");
    el.capture.disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  state.image = null;
  el.preview.src = "";
  el.fileInput.value = "";
  el.dropzone.classList.remove("has-image");
  el.capture.disabled = true;
}

// ─── capture ──────────────────────────────────────────────────────────────
el.capture.addEventListener("click", capture);
el.demoToggle.addEventListener("change", updateCaptureLabel);

function updateCaptureLabel() {
  if (state.loading) return;
  const label = el.capture.querySelector(".capture-label");
  label.textContent = el.demoToggle.checked ? "print demo" : "capture";
}

async function capture() {
  if (!state.image || state.loading) return;
  const demo = el.demoToggle.checked;

  setLoading(true);
  hideError();

  try {
    let poem;
    if (demo) {
      await sleep(420 + Math.random() * 320);
      poem = DEMO_POEMS[state.mode] || "(no demo for this mode yet)";
    } else {
      poem = await callClaude({
        model: state.model,
        system: state.prompts[state.mode],
        image: state.image,
      });
    }
    appendPrint(poem, { demo, mode: state.mode, model: state.model });
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  } finally {
    setLoading(false);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function setLoading(loading) {
  state.loading = loading;
  el.capture.classList.toggle("loading", loading);
  el.capture.disabled = loading || !state.image;
  if (loading) {
    el.capture.querySelector(".capture-label").textContent = "printing";
  } else {
    updateCaptureLabel();
  }
}

async function callClaude({ model, system, image }) {
  let res;
  try {
    res = await fetch("/api/poem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
            { type: "text", text: "Write the poem about this photograph." },
          ],
        }],
      }),
    });
  } catch (e) {
    throw new Error("couldn't reach the local server. is `npm start` running? (or flip demo on.)");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${res.status}: ${detail}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("empty response from claude.");
  return text;
}

// ─── server status ────────────────────────────────────────────────────────
async function checkServer() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    if (data.hasKey) setStatus("ok", "ready");
    else setStatus("warn", "no key in .env");
  } catch {
    setStatus("error", "no server");
  }
}

function setStatus(level, text) {
  if (el.statusDot) el.statusDot.className = "status-dot " + level;
  if (el.statusText) el.statusText.textContent = text;
  if (el.statusPillDot) el.statusPillDot.className = "status-pill-dot " + level;
  if (el.statusPillText) el.statusPillText.textContent = text;
}

// ─── print ────────────────────────────────────────────────────────────────
function appendPrint(text, { demo = false, mode, model } = {}) {
  // Hide the dim "ready" hint that lives in the dark area. From now on,
  // the printer panel shows paper.
  el.paperReady.hidden = true;

  const now = new Date();
  const art = buildPrintArticle(text, { demo, mode, model, now });
  el.paper.appendChild(art);
  tickOut(art);
}

function buildPrintArticle(text, { demo, mode, model, now }) {
  const art = document.createElement("article");
  art.className = "print";

  const head = document.createElement("header");
  head.className = "print-head";
  const title = document.createElement("div");
  title.className = "print-title";
  title.textContent = "POETRY CAMERA";
  const sub = document.createElement("div");
  sub.className = "print-sub";
  sub.textContent = formatStamp(now) + (demo ? " · DEMO" : "");
  head.append(title, sub);

  const borderTop = document.createElement("pre");
  borderTop.className = "print-border";
  borderTop.textContent = state.borderTop;

  const body = document.createElement("pre");
  body.className = "print-body" + (mode === "receipt" ? " mono" : "");
  body.textContent = text;

  const borderBottom = document.createElement("pre");
  borderBottom.className = "print-border";
  borderBottom.textContent = state.borderBottom;

  const foot = document.createElement("footer");
  foot.className = "print-foot";
  const meta = document.createElement("div");
  meta.className = "print-meta";
  const modeSpan = document.createElement("span");
  modeSpan.textContent = mode;
  const sep1 = document.createElement("span");
  sep1.className = "meta-sep";
  sep1.textContent = "·";
  const modelSpan = document.createElement("span");
  modelSpan.textContent = demo ? "demo" : model.replace("claude-", "");
  const sep2 = document.createElement("span");
  sep2.className = "meta-sep";
  sep2.textContent = "·";
  const timeSpan = document.createElement("span");
  timeSpan.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  meta.append(modeSpan, sep1, modelSpan, sep2, timeSpan);
  const printedFooter = document.createElement("div");
  printedFooter.className = "print-printed-footer";
  printedFooter.textContent = state.footer;
  foot.append(meta, printedFooter);

  art.append(head, borderTop, body, borderBottom, foot);
  return art;
}

// Thermal-printer mechanics:
//   one tick = paper advances by one line-height + print head fires once.
//   the text on that newly-revealed line is already on the paper; the
//   container just exposes it. No easing — discrete steps. Between ticks,
//   nothing moves.
//
//   pace: ~8 ticks/sec (120ms per tick) — real thermal printers run
//   around 6–10 lines/sec.
function tickOut(art) {
  art.style.overflow = "hidden";
  art.style.maxHeight = "0px";
  art.style.transition = "none";

  // force reflow so the collapsed state commits before we measure
  void art.offsetHeight;
  const target = art.scrollHeight;

  // one tick advances the box by the body's line-height — that's what
  // gives "one tick = one line of text" alignment.
  const body = art.querySelector(".print-body");
  const lh = parseFloat(getComputedStyle(body).lineHeight) || 22;
  const stepCount = Math.max(8, Math.ceil(target / lh));
  const stepDurMs = 120;
  const totalMs = stepCount * stepDurMs;

  requestAnimationFrame(() => {
    art.style.transition = `max-height ${totalMs}ms steps(${stepCount}, end)`;
    art.style.maxHeight = target + "px";
    autoScrollWhilePrinting(totalMs);
  });

  setTimeout(() => {
    art.style.maxHeight = "";
    art.style.transition = "";
    art.style.overflow = "";
  }, totalMs + 120);
}

// Pin the paper-stage scroll to the bottom for the duration of the print,
// so the user watches the most recently-emerged line. They can scroll up
// freely afterward.
function autoScrollWhilePrinting(durMs) {
  const start = performance.now();
  function frame(t) {
    el.paperStage.scrollTop = el.paperStage.scrollHeight;
    if (t - start < durMs) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function formatStamp(d) {
  return d.toISOString().replace("T", " · ").replace(/\..+/, "");
}

function showError(msg) {
  el.receiptError.hidden = false;
  el.receiptError.textContent = msg;
}

function hideError() {
  el.receiptError.hidden = true;
  el.receiptError.textContent = "";
}

// ─── printer settings (top/bottom border + footer) ────────────────────────
el.borderTopInput.addEventListener("input", () => {
  state.borderTop = el.borderTopInput.value;
  localStorage.setItem(BORDER_TOP_STORAGE, state.borderTop);
});

el.borderBottomInput.addEventListener("input", () => {
  state.borderBottom = el.borderBottomInput.value;
  localStorage.setItem(BORDER_BOTTOM_STORAGE, state.borderBottom);
});

el.footerInput.addEventListener("input", () => {
  state.footer = el.footerInput.value;
  localStorage.setItem(FOOTER_STORAGE, state.footer);
});

el.printerReset.addEventListener("click", () => {
  state.borderTop = DEFAULT_BORDER_TOP;
  state.borderBottom = DEFAULT_BORDER_BOTTOM;
  state.footer = DEFAULT_FOOTER;
  localStorage.removeItem(BORDER_TOP_STORAGE);
  localStorage.removeItem(BORDER_BOTTOM_STORAGE);
  localStorage.removeItem(FOOTER_STORAGE);
  el.borderTopInput.value = DEFAULT_BORDER_TOP;
  el.borderBottomInput.value = DEFAULT_BORDER_BOTTOM;
  el.footerInput.value = DEFAULT_FOOTER;
});

// ─── settings modal ───────────────────────────────────────────────────────
function openSettings() {
  el.settingsModal.hidden = false;
  checkServer();
}

function closeSettings() {
  el.settingsModal.hidden = true;
}

el.settingsBtn.addEventListener("click", openSettings);
el.settingsClose.addEventListener("click", closeSettings);
el.settingsModal.addEventListener("click", (e) => {
  if (e.target === el.settingsModal) closeSettings();
});

el.resetAll.addEventListener("click", () => {
  state.prompts = { ...DEFAULT_PROMPTS };
  savePrompts();
  syncPrompt();
  renderModes();
});

// ─── keyboard ─────────────────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !el.settingsModal.hidden) closeSettings();
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !state.loading) capture();
});
