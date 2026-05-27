// poetry camera / previewer
// State and per-mode prompts live in localStorage. The image and prompt go
// to /api/poem (the local express server), which forwards to Anthropic
// server-to-server. The 37-char-per-line rule is the printer's invariant.

const STORAGE_KEY = "poetry-camera-prompts";
const MODEL_STORAGE = "poetry-camera-model";
const ACTIVE_MODE_STORAGE = "poetry-camera-active-mode";
const BORDER_TOP_STORAGE = "poetry-camera-border-top";
const BORDER_BOTTOM_STORAGE = "poetry-camera-border-bottom";
const FOOTER_STORAGE = "poetry-camera-footer";

// ─── modes & per-mode default prompts ─────────────────────────────────────
// One canonical printer rule shared by every mode: thermal paper is 37
// characters wide, no markdown, ASCII only. This is the same set of
// constraints Poetry Camera uses internally — the model needs both the
// rule AND a concrete example to honor it consistently.

const PRINTER_RULE = `Output plain ASCII only (characters 32-126: space through tilde). No Unicode: no box-drawing, blocks, arrows, bullets, moon symbols, or fancy quotes. Every line must be 37 characters or fewer — count each character including leading spaces. Preserve all internal whitespace. Do not wrap in markdown or code blocks.

Output ONLY the poem itself — no title, no preamble, no commentary like "Here is your poem:".`;

const DEFAULT_PROMPTS = {
  haiku:
`Write one haiku about this photograph (5-7-5 syllable structure). Three lines, nothing else.

${PRINTER_RULE}`,

  receipt:
`Write an itemized receipt about this photograph. Tone: sarcastic, dry, deadpan. 5-7 line items. Use dollar amounts to comical effect.

FORMAT — copy this exactly. EVERY LINE IS EXACTLY 37 CHARACTERS WIDE. The price is right-aligned to column 37; periods fill the gap between the item name (UPPERCASE) and the price.

WINDOW LIGHT....................$0.00
ONE CUP, CERAMIC................$1.25
EXISTENTIAL DREAD................FREE
SUBTOTAL........................$1.25
TAX (TIME PASSING)..............$0.30
TOTAL...........................$1.55

HARD CONSTRAINT: keep item names SHORT so the full line — name + dots + $price — fits in 37 characters. If a name would overflow, ABBREVIATE it before you write it. Examples:
  "NATURAL LIGHTING (PURCHASED)" → "BOUGHT LIGHT"
  "CONFIDENCE THAT SCREAMS HIRE ME" → "HIRE-ME ENERGY"
  "STRATEGICALLY PLACED PLANTS" → "STAGED PLANTS"
Never break a single item across two lines. Never let dots or a price spill to a second line.

End with one short, wry note (also <= 37 chars per line).

STRICT OUTPUT RULES:
- Every line MUST be 37 characters wide or less. Count carefully.
- ASCII only. NO markdown of any kind: no # headers, no *italic*, no
  **bold**, no \`code\`, no --- separators, no > quotes, no bullets.
- Output ONLY the poem text. No title, no preamble, no commentary,
  no "Here is your poem:" — just the poem itself.
- Use straight quotes (") not curly ("). Use straight apostrophes (').`,

  limerick:
`Write one limerick about this photograph. AABBA rhyme. 5 lines.

${PRINTER_RULE}`,

  sonnet:
`Write one modern sonnet about this photograph. Plain modern English (no thee/thou). 14 lines, iambic pentameter, ABAB CDCD EFEF GG rhyme.

${PRINTER_RULE}`,

  alliteration:
`Write a short alliteration poem about this photograph. Every meaningful word starts with the same letter. Up to 4 lines.

${PRINTER_RULE}`,

  portrait:
`Write a portrait-mode poem about this photograph. Prose poem with line breaks at meaningful points. Focus on the person: who they might be, what they're feeling in this moment. Up to 12 lines.

${PRINTER_RULE}`,

  "free verse":
`Write a highly unusual, experimental free-verse poem about this photograph. Use fragments, unusual punctuation, artful spacing. No more than 12 spaces in a single run. Up to 12 lines.

${PRINTER_RULE}`,

  constellation:
`invent a new constellation based on the photo. exactly 37 chars wide per line. lines 1-7: each line is exactly 37 characters of spaces with 1-2 "." dots placed at varied column positions to suggest a scattered star field. NEVER let a line exceed 37 chars — count the trailing spaces too, or simply let lines end naturally (no trailing spaces past the last dot is also fine). then one blank line. then "THE [INVENTED NAME]" in caps, indented to roughly center — the name should be specific to the photo and slightly mundane. then 3-4 lowercase lines describing the myth or first sighting, max 35 chars each line, quiet and melancholy.

${PRINTER_RULE}`,

  "periodic element":
`a new element discovered in the photo. exactly 37 chars wide. structure exactly as follows:
line 1: 4 spaces, then "+" then 22 "-" then "+" (= 28 chars total)
line 2: 4 spaces, then "| " then atomic number (pad to 3 chars left-aligned) then 12 spaces then atomic mass like "284.7" (5 chars right-aligned) then " |" (= 28 chars)
line 3: 4 spaces, then "|" then 22 spaces then "|"
line 4: 4 spaces, then "|" then 10 spaces then 2-letter Symbol then 10 spaces then "|"
line 5: 4 spaces, then "|" then 22 spaces then "|"
line 6: 4 spaces, then "|" then center an invented lowercase one-word name in 22 spaces then "|"
line 7: 4 spaces, then "+" then 22 "-" then "+"
then one blank line. then 4-5 lowercase lines (max 30 chars each) listing properties, half-life, and what it reacts with. scientific but melancholy.

${PRINTER_RULE}`,

  dictionary:
`invent a single new word that names the exact feeling, mood, or scene in the photo. format as a real dictionary entry, each on its own line, in this order: headword in all caps; pronunciation guide between forward slashes; part of speech abbreviated and lowercase ("n.", "v.", "adj."); a numbered definition (one sentence). then one blank line. then one example sentence in quotation marks using the word naturally. do not write anything except the entry.

Sample output (photo of a dog watching its owner leave for work):

GLINTLORN
/ˈɡlɪnt.lɔːrn/
n.
1. the small, helpless ache of being watched by something you must leave behind.

"she felt the glintlorn in the rearview mirror long after the house was out of sight."

CRITICAL — DO NOT PREAMBLE:
The very FIRST character of your response must be the first letter of the HEADWORD. Do NOT write "Here's the entry:", "I appreciate your interest", "Let me create...", or any acknowledgment. Do NOT explain that you're following instructions. Just produce the entry.

NOTES:
- The pronunciation guide between forward slashes is the ONE exception to the ASCII rule — use IPA Unicode characters there (e.g. /ˈɡlɪnt.lɔːrn/). Headword, definition, and example use plain ASCII only.
- The definition and example sentence may be longer than 37 characters — they wrap naturally on the paper.
- No markdown, no code blocks.`,
};

const MODES = ["haiku", "receipt", "limerick", "sonnet", "alliteration", "portrait", "free verse", "constellation", "periodic element", "dictionary"];

// ─── printer defaults: borders + footer ───────────────────────────────────
// Verbatim from the camera. ≤37 chars per line. Whitespace is significant.

const DEFAULT_BORDER_TOP =
"`'. .'`'. .'`'. .'`'. .'`'. .'`\n   `     `     `     `     `";

const DEFAULT_BORDER_BOTTOM =
"   .     .     .     .     .   \n_.` `._.` `._.` `._.` `._.` `._";

const DEFAULT_FOOTER = "poetry.camera";

// ─── canned poems for demo mode — each ≤37 chars per line ─────────────────
const DEMO_POEMS = {
  haiku:
`morning at the sill —
the cup forgets to be warm,
remembers the light`,

  receipt:
`POETRY CAMERA - MORNING NO. 047
-------------------------------------
WINDOW LIGHT....................$0.00
ONE CUP, CERAMIC................$1.25
STEAM, RISING...................$0.40
A FAINT ROOFTOP.................$0.75
ONE PIGEON, OFFSTAGE............$0.10
SILENCE, GENEROUS...............$0.00
-------------------------------------
SUBTOTAL........................$2.50
TAX (TIME PASSING)..............$0.30
TOTAL...........................$2.80`,

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
the city - wakes,
   the window keeps
  one audience:
   one cup. one rim
        of steam.

a pigeon practices.
        practices.
   one word
        i almost
   - remember.`,

  constellation:
`   .
              .
                       .
        .       .
                  .
   .
                          .

   THE TWO LIARS

   first sighted on a wednesday
   in someone's backyard, when
   the joke was not actually
   that funny.`,

  "periodic element":
`    +----------------------+
    | 119            284.7 |
    |                      |
    |          Hm          |
    |                      |
    |       homesium       |
    +----------------------+

  silvery, stable in absence.
  half-life equal to one
  childhood bedroom. reacts
  violently with photographs.
  do not store near mothers.`,

  dictionary:
`GLINTLORN
/ˈɡlɪnt.lɔːrn/
n.
1. the small, helpless ache of being watched by something you must leave behind.

"she felt the glintlorn in the rearview mirror long after the house was out of sight."`,
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
  modeSelectName: document.getElementById("mode-select-name"),
  modeSelectTag: document.getElementById("mode-select-tag"),
  modeMenu: document.getElementById("mode-menu"),
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

// Sentence case: capitalize first letter of the whole label only.
// "free verse" → "Free verse"; "periodic element" → "Periodic element".
function displayMode(mode) {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function renderModes() {
  // Update the trigger button (current selection + edited tag)
  el.modeSelectName.textContent = displayMode(state.mode);
  el.modeSelectTag.hidden = !isEdited(state.mode);

  // Rebuild the popover menu
  el.modeMenu.innerHTML = "";
  for (const mode of MODES) {
    const item = document.createElement("button");
    item.type = "button";
    item.role = "option";
    item.className = "mode-menu-item";
    item.dataset.mode = mode;
    if (mode === state.mode) {
      item.classList.add("active");
      item.setAttribute("aria-selected", "true");
    } else {
      item.setAttribute("aria-selected", "false");
    }

    const name = document.createElement("span");
    name.className = "mode-menu-item-name";
    name.textContent = displayMode(mode);
    item.appendChild(name);

    if (isEdited(mode)) {
      const tag = document.createElement("span");
      tag.className = "mode-menu-item-tag";
      tag.textContent = "(edited)";
      item.appendChild(tag);
    }

    item.addEventListener("click", () => {
      setMode(mode);
      closeModeMenu();
    });
    el.modeMenu.appendChild(item);
  }
}

function openModeMenu() {
  el.modeMenu.hidden = false;
  el.modeSelect.setAttribute("aria-expanded", "true");
}

function closeModeMenu() {
  el.modeMenu.hidden = true;
  el.modeSelect.setAttribute("aria-expanded", "false");
}

function toggleModeMenu() {
  if (el.modeMenu.hidden) openModeMenu();
  else closeModeMenu();
}

el.modeSelect.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleModeMenu();
});

// Outside click closes the menu. Clicks on the trigger or inside the
// menu are handled by their own listeners, so this only fires for
// genuine outside clicks.
document.addEventListener("click", (e) => {
  if (el.modeMenu.hidden) return;
  if (el.modeSelect.contains(e.target) || el.modeMenu.contains(e.target)) return;
  closeModeMenu();
});

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
  el.promptModeLabel.textContent = displayMode(state.mode);
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
            // Generic trigger. The actual task lives in the system prompt;
            // anything specific here (e.g. "write a poem") makes the model
            // preamble when the system asks for non-poem output like a
            // receipt or a dictionary entry.
            { type: "text", text: "This photograph. Apply your instructions above. Output ONLY the result — no preamble, no explanation, no acknowledgment. Your first character is the first character of the output." },
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

  let cleanText = sanitizeOutput(text);
  if (mode === "receipt") cleanText = alignReceiptLines(cleanText);

  const now = new Date();
  const art = buildPrintArticle(cleanText, { demo, mode, model, now });
  // Prepend: new paper emerges from the slot at the top of the strip,
  // shoving older prints down — same as a real thermal printer.
  el.paper.prepend(art);
  tickOut(art);
}

// Visual width of the paper in Courier Prime characters at the current
// .print-body font-size. Matches .paper max-width: 324px with
// .print-inner padding: 18px each side. If you change the paper width,
// update this so dot-leader alignment in receipt mode tracks it.
const RECEIPT_PAPER_CHARS = 37;

// For receipt mode only — any line that's NAME....$PRICE gets its dot
// leader recomputed so the whole line ends exactly at the right edge
// of the paper. The model produces leaders of varying length; this
// makes every price land in a clean right column.
function alignReceiptLines(text) {
  return text.split("\n").map((line) => {
    // $-prefixed numeric price ($0.00, $1,234.56, etc.)
    let m = line.match(/^(.*?)\.+(\$[\d,]+(?:\.\d+)?)\s*$/);
    if (m) {
      const [, name, price] = m;
      const need = RECEIPT_PAPER_CHARS - name.length - price.length;
      if (need >= 2) return name + ".".repeat(need) + price;
    }
    // Uppercase word value (FREE, PRICELESS, $PRICELESS, etc.)
    m = line.match(/^(.*?)\.+(\$?[A-Z]{3,})\s*$/);
    if (m) {
      const [, name, value] = m;
      const need = RECEIPT_PAPER_CHARS - name.length - value.length;
      if (need >= 2) return name + ".".repeat(need) + value;
    }
    return line;
  }).join("\n");
}

// Strip any markdown the model might leak even with a "no markdown"
// instruction — defense-in-depth alongside the prompt. The receipt
// surface only renders plain text + ASCII.
function sanitizeOutput(text) {
  return String(text)
    .replace(/^#{1,6}\s+/gm, "")            // # headers
    .replace(/^-{3,}\s*$/gm, "")            // --- separators
    .replace(/^\*{3,}\s*$/gm, "")           // *** separators
    .replace(/^>\s+/gm, "")                 // > quotes
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")    // **bold**
    .replace(/\*([^*\n]+)\*/g, "$1")        // *italic*
    .replace(/`+([^`\n]+)`+/g, "$1")        // `code`
    .replace(/\n{3,}/g, "\n\n")             // collapse runs of blanks
    .trim();
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
  modeSpan.textContent = displayMode(mode);
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

  // Everything that's visible-text lives in .print-inner so we can
  // translateY it during the print animation.
  const inner = document.createElement("div");
  inner.className = "print-inner";
  inner.append(head, borderTop, body, borderBottom, foot);
  art.append(inner);
  return art;
}

// Thermal-printer mechanics — text moves WITH the paper.
//
// One tick = paper advances by one line-height + print head fires once.
// Both the OUTER (paper extending downward via max-height) and the
// INNER (text translating downward via translateY) animate in lock-step
// with the same `steps(N, end)` timing. Result: each tick reveals a new
// line at the TOP of the visible strip (just under the slot) and shoves
// every previously-printed line down by one line-height. The text is
// physically attached to the paper.
//
// Pace: ~8 ticks/sec (120ms per tick) — real thermal printers run
// around 6–10 lines/sec.

let activePrintCount = 0;

function tickOut(art) {
  const inner = art.querySelector(".print-inner");

  // Measure the natural height of the content (inner is in flow, so the
  // outer's scrollHeight equals the inner's height).
  art.style.maxHeight = "none";
  art.style.overflow = "visible";
  inner.style.transform = "none";
  inner.style.transition = "none";
  art.style.transition = "none";

  void art.offsetHeight;
  const target = art.scrollHeight;

  // Collapse to initial state. Inner is translated UP by its full
  // height so its BOTTOM aligns with the outer's BOTTOM (which is at
  // y=0 since max-height=0). Outer clips everything.
  art.style.overflow = "hidden";
  art.style.maxHeight = "0px";
  inner.style.transform = `translateY(-${target}px)`;

  void art.offsetHeight;

  // One tick advances the box by the body's line-height — that's what
  // gives "one tick = one line of text" alignment.
  const body = art.querySelector(".print-body");
  const lh = parseFloat(getComputedStyle(body).lineHeight) || 22;
  const stepCount = Math.max(8, Math.ceil(target / lh));
  const stepDurMs = 120;
  const totalMs = stepCount * stepDurMs;

  // Mark the strip as printing so the zigzag tear is hidden and the
  // print-head hairline shows. Removed when all in-flight ticks finish.
  activePrintCount++;
  el.paper.classList.add("printing");

  requestAnimationFrame(() => {
    const timing = `${totalMs}ms steps(${stepCount}, end)`;
    art.style.transition = `max-height ${timing}`;
    inner.style.transition = `transform ${timing}`;
    art.style.maxHeight = target + "px";
    inner.style.transform = "translateY(0)";
    autoScrollWhilePrinting(totalMs);
  });

  setTimeout(() => {
    // Clean up so future layout isn't constrained.
    art.style.maxHeight = "";
    art.style.transition = "";
    art.style.overflow = "";
    inner.style.transform = "";
    inner.style.transition = "";

    activePrintCount = Math.max(0, activePrintCount - 1);
    if (activePrintCount === 0) el.paper.classList.remove("printing");
  }, totalMs + 120);
}

// Pin the paper-stage scroll to the TOP for the duration of the print,
// so the user is always watching the slot — where the newest paper is
// emerging. They can scroll down freely afterward to see older prints.
function autoScrollWhilePrinting(durMs) {
  const start = performance.now();
  function frame(t) {
    el.paperStage.scrollTop = 0;
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
  if (e.key === "Escape") {
    if (!el.modeMenu.hidden) closeModeMenu();
    else if (!el.settingsModal.hidden) closeSettings();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !state.loading) capture();
});
