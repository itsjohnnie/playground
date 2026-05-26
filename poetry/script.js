// poetry camera / previewer
// All state is in-browser. The image and the user's API key never leave the
// page except for a single call to api.anthropic.com when "capture" runs.

const STORAGE_KEY = "poetry-camera-prompts";
const API_KEY_STORAGE = "poetry-camera-api-key";
const MODEL_STORAGE = "poetry-camera-model";
const ACTIVE_MODE_STORAGE = "poetry-camera-active-mode";

const DEFAULT_PROMPTS = {
  haiku: `You are a poet looking through a camera viewfinder.

Write a single haiku (3 lines, 5–7–5 syllables) about this photograph.
Use one concrete sensory image. Let the third line be a small turn.
No title, no quotes, no commentary. Just the haiku.`,

  "free verse": `You are a contemplative poet looking through a camera viewfinder.

Write a short free-verse poem (8–14 lines) about this photograph.
Lean on specific, sensory detail over abstraction. Vary line lengths.
Let one image carry the weight. End on a line that lingers.
No title, no quotes, no commentary. Just the poem.`,

  limerick: `You are a witty poet looking through a camera viewfinder.

Write a single limerick about this photograph: 5 lines, AABBA rhyme,
anapestic meter, a small joke or twist by line five.
No title, no quotes, no commentary. Just the limerick.`,

  alliteration: `You are a poet obsessed with sound looking through a camera viewfinder.

Write a short alliterative poem (6–10 lines) about this photograph.
Pick a consonant sound that fits the scene (soft "s" for water, hard "k"
for stone, etc.) and let most stressed words in each line begin with it.
Keep the imagery concrete.
No title, no quotes, no commentary. Just the poem.`,

  receipt: `You are a deadpan poet who prints receipts about moments.

Write a "receipt" itemizing what is in this photograph, as if a tiny
thermal printer were tallying the scene. Format like a real receipt:

  - ALL CAPS for headers
  - line items as: ITEM NAME .......... $price
  - 2–8 items
  - a SUBTOTAL, a wry TAX line, and a TOTAL
  - a one-line printed "thank you" note at the bottom

Use a fixed line width of ~32 characters. Use dots to fill between the
item name and the price. No title, no quotes, no commentary outside the
receipt body. Just the receipt.`,
};

const MODES = Object.keys(DEFAULT_PROMPTS);

// Canned poems used when "demo" is on or no API key is set. These exist so
// the previewer can be exercised end-to-end without any network access.
const DEMO_POEMS = {
  haiku: `morning at the sill —
the cup forgets to be warm,
remembers the light`,

  "free verse": `Before the city wakes,
the window keeps a small audience:
one cup, one rim of steam,
a rooftop softening into wheat.

The radiator ticks like a second hand
that nobody wound. Outside,
a pigeon practices the same low note
until it sounds like a word
I almost remember.

The cup cools without complaint.
The light insists, anyway,
on staying.`,

  limerick: `A cup on a sill in the morning
gave the rooftops a quiet adorning.
   It steamed at the view,
   said "I'm nearly through —
the day is no longer in mourning."`,

  alliteration: `Soft sun on a sill, a slow surrender —
steam slips, settles, signs the silent glass.
Somewhere a sparrow stitches sentences.
The cup, still warm, says less and less.
Streetlights surrender to a softer source.
A whole city, slowly, starts to sigh awake.`,

  receipt: `         POETRY CAMERA
       — ONE QUIET MORNING —
================================
WINDOW LIGHT ............. $0.00
ONE CUP, CERAMIC ......... $1.25
STEAM, RISING ............ $0.40
DISTANT ROOFTOPS ......... $0.75
ONE PIGEON, OFFSTAGE ..... $0.10
SILENCE, GENEROUS ........ $0.00
--------------------------------
SUBTOTAL ................. $2.50
TAX (TIME PASSING) ....... $0.30
================================
TOTAL .................... $2.80

   THANK YOU FOR NOTICING.`,
};

// A small inline SVG, base64-encoded as image/svg+xml, used by "try a sample
// image" so demo mode has something to look at. The poem isn't generated
// from this image — it's just a placeholder so the dropzone isn't empty.
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
  image: null, // { dataUrl, mediaType, base64 }
  mode: localStorage.getItem(ACTIVE_MODE_STORAGE) || "haiku",
  model: localStorage.getItem(MODEL_STORAGE) || "claude-sonnet-4-6",
  prompts: loadPrompts(),
  loading: false,
};

if (!MODES.includes(state.mode)) state.mode = "haiku";

// ─── elements ─────────────────────────────────────────────────────────────
const el = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  preview: document.getElementById("preview"),
  clearBtn: document.getElementById("clear-btn"),
  modes: document.getElementById("modes"),
  prompt: document.getElementById("prompt"),
  promptModeLabel: document.getElementById("prompt-mode-label"),
  promptStatus: document.getElementById("prompt-status"),
  promptChars: document.getElementById("prompt-chars"),
  resetPrompt: document.getElementById("reset-prompt"),
  model: document.getElementById("model"),
  capture: document.getElementById("capture"),
  demoToggle: document.getElementById("demo-toggle"),
  sampleBtn: document.getElementById("sample-btn"),
  receipt: document.getElementById("receipt"),
  receiptEmpty: document.getElementById("receipt-empty"),
  receiptContent: document.getElementById("receipt-content"),
  receiptBody: document.getElementById("receipt-body"),
  receiptSub: document.getElementById("receipt-sub"),
  receiptMode: document.getElementById("receipt-mode"),
  receiptModel: document.getElementById("receipt-model"),
  receiptTime: document.getElementById("receipt-time"),
  receiptError: document.getElementById("receipt-error"),
  settingsBtn: document.getElementById("settings-btn"),
  settingsModal: document.getElementById("settings-modal"),
  settingsClose: document.getElementById("settings-close"),
  apiKey: document.getElementById("api-key"),
  apiKeySave: document.getElementById("api-key-save"),
  apiKeyClear: document.getElementById("api-key-clear"),
  resetAll: document.getElementById("reset-all"),
};

// ─── init ─────────────────────────────────────────────────────────────────
renderModes();
syncPrompt();
el.model.value = state.model;
updateCaptureLabel();

// ─── prompts storage ──────────────────────────────────────────────────────
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

// ─── modes ────────────────────────────────────────────────────────────────
function renderModes() {
  el.modes.innerHTML = "";
  for (const mode of MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "radio";
    btn.className = "mode";
    btn.textContent = mode;
    btn.dataset.mode = mode;
    if (mode === state.mode) btn.classList.add("active");
    if (isEdited(mode)) btn.classList.add("edited");
    btn.setAttribute("aria-checked", mode === state.mode);
    btn.addEventListener("click", () => setMode(mode));
    el.modes.appendChild(btn);
  }
}

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

// ─── model select ─────────────────────────────────────────────────────────
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
  const base64 = btoa(SAMPLE_SVG);
  const mediaType = "image/svg+xml";
  const dataUrl = `data:${mediaType};base64,${base64}`;
  state.image = { dataUrl, base64, mediaType, isSample: true };
  el.preview.src = dataUrl;
  el.dropzone.classList.add("has-image");
  el.capture.disabled = false;
}

function loadImage(file) {
  if (file.size > 8 * 1024 * 1024) {
    showError(
      "image is over 8MB — anthropic's per-image limit. try a smaller one."
    );
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

// ─── capture / api call ───────────────────────────────────────────────────
el.capture.addEventListener("click", capture);
el.demoToggle.addEventListener("change", updateCaptureLabel);

function updateCaptureLabel() {
  const label = el.capture.querySelector(".capture-label");
  if (state.loading) return;
  label.textContent = el.demoToggle.checked ? "print demo" : "capture";
}

async function capture() {
  if (!state.image || state.loading) return;
  const demo = el.demoToggle.checked;
  const apiKey = localStorage.getItem(API_KEY_STORAGE);

  if (!demo && !apiKey) {
    openSettings();
    showError(
      "no api key set. add one in settings, or flip the demo toggle to test the printout with a canned poem."
    );
    return;
  }

  setLoading(true);
  hideError();

  try {
    let poem;
    if (demo) {
      await sleep(450 + Math.random() * 350); // pretend to think
      poem = DEMO_POEMS[state.mode];
    } else {
      poem = await callClaude({
        apiKey,
        model: state.model,
        system: state.prompts[state.mode],
        image: state.image,
      });
    }
    printPoem(poem, { demo });
  } catch (err) {
    console.error(err);
    showError(err.message || String(err));
  } finally {
    setLoading(false);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function callClaude({ apiKey, model, system, image }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.base64,
              },
            },
            {
              type: "text",
              text: "Write the poem.",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`anthropic api ${res.status}: ${detail}`);
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

// ─── printout ─────────────────────────────────────────────────────────────
function printPoem(text, { demo = false } = {}) {
  el.receiptEmpty.hidden = true;
  el.receiptContent.hidden = false;

  const now = new Date();
  el.receiptSub.textContent = formatStamp(now) + (demo ? " · DEMO" : "");
  el.receiptMode.textContent = state.mode;
  el.receiptModel.textContent = demo ? "demo" : state.model.replace("claude-", "");
  el.receiptTime.textContent = now
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // mono layout for receipt mode (it relies on fixed-width alignment)
  el.receiptBody.classList.toggle("mono", state.mode === "receipt");

  // animate line-by-line
  el.receiptBody.innerHTML = "";
  el.receipt.classList.remove("feeding");
  void el.receipt.offsetWidth; // restart animation
  el.receipt.classList.add("feeding");

  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const span = document.createElement("span");
    span.className = "line";
    span.textContent = line.length ? line : " ";
    span.style.animationDelay = `${i * 0.09}s`;
    el.receiptBody.appendChild(span);
  });
}

function formatStamp(d) {
  return d
    .toISOString()
    .replace("T", " · ")
    .replace(/\..+/, "");
}

function showError(msg) {
  el.receiptError.hidden = false;
  el.receiptError.textContent = msg;
}

function hideError() {
  el.receiptError.hidden = true;
  el.receiptError.textContent = "";
}

// ─── settings modal ───────────────────────────────────────────────────────
function openSettings() {
  el.settingsModal.hidden = false;
  el.apiKey.value = localStorage.getItem(API_KEY_STORAGE) || "";
  setTimeout(() => el.apiKey.focus(), 0);
}

function closeSettings() {
  el.settingsModal.hidden = true;
}

el.settingsBtn.addEventListener("click", openSettings);
el.settingsClose.addEventListener("click", closeSettings);
el.settingsModal.addEventListener("click", (e) => {
  if (e.target === el.settingsModal) closeSettings();
});

el.apiKeySave.addEventListener("click", () => {
  const v = el.apiKey.value.trim();
  if (v) localStorage.setItem(API_KEY_STORAGE, v);
  closeSettings();
});

el.apiKeyClear.addEventListener("click", () => {
  localStorage.removeItem(API_KEY_STORAGE);
  el.apiKey.value = "";
});

el.resetAll.addEventListener("click", () => {
  state.prompts = { ...DEFAULT_PROMPTS };
  savePrompts();
  syncPrompt();
  renderModes();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !el.settingsModal.hidden) closeSettings();
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !state.loading) {
    capture();
  }
});
