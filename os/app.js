/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — surface entry
 *
 *    0ms   route paints, hero and people stagger up (60ms apart)
 *  240ms   on-you panel renders with same easing, no extra stagger
 *  340ms   ring dots, meeting fills, milestone ticks (see ring.js storyboard)
 *  ⌘K      palette opens in 240ms with --ease-drawer
 *  esc     palette closes instantly (no animation — high-frequency dismiss)
 * ───────────────────────────────────────────────────────── */

import {
  me, people, announcements, milestones, onYou, greet, stateOfDay,
  inMotion, thisWeek, ageLabel, nameOf,
  notificationsFeed, applyCircleOverrides, groupByCircle
} from "./data.js";
import { initRing } from "./ring.js";

const TIMING = {
  paletteOpen: 240,
  paletteClose: 0
};

// ─── Settings ───────────────────────────────────────────────
// One source of truth for user-edited state. Other modules subscribe.

const SETTINGS_DEFAULTS = {
  name: me.name,
  greetingStyle: me.greetingStyle,
  theme: "auto",
  reducedMotion: false,
  circleOverrides: {}
};
const SETTINGS_KEY = "workos:settings";
const settingsSubscribers = new Set();

function loadSettings() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch {}
  return { ...SETTINGS_DEFAULTS, ...stored };
}

function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  for (const fn of settingsSubscribers) fn(next);
  return next;
}

function onSettingsChange(fn) { settingsSubscribers.add(fn); }

const state = { tab: "today" };

// Initial application of theme + reduced-motion.
applyTheme(loadSettings().theme);
applyReducedMotion(loadSettings().reducedMotion);
onSettingsChange((s) => {
  applyTheme(s.theme);
  applyReducedMotion(s.reducedMotion);
});

// Whenever settings change, re-render home if it's active.
onSettingsChange(() => {
  if (document.querySelector("[data-route='home']").classList.contains("is-active")) {
    renderHero();
    renderPeople();
  }
});

// ─── Rendering ──────────────────────────────────────────────

function renderHero() {
  const now = new Date();
  const s = loadSettings();
  document.getElementById("greeting").textContent = greet(now, s.name, s.greetingStyle);
  document.getElementById("state-of-day").textContent = stateOfDay(now);
}

function currentPeople() {
  return applyCircleOverrides(loadSettings().circleOverrides);
}

function renderPeople() {
  const grid = document.getElementById("people");
  for (let i = 1; i <= 3; i++) {
    const col = grid.querySelector(`.column[data-circle="${i}"]`);
    [...col.children].forEach((c) => { if (!c.classList.contains("label")) c.remove(); });
  }
  const byCircle = groupByCircle(currentPeople());
  for (const circle of [1, 2, 3]) {
    const col = grid.querySelector(`.column[data-circle="${circle}"]`);
    const list = byCircle[circle];
    for (const p of list.slice(0, 8)) {
      const el = document.createElement("div");
      el.className = "person";
      el.dataset.offline = p.online ? "false" : "true";
      el.dataset.id = p.id;
      el.tabIndex = 0;

      const dot = document.createElement("span");
      dot.className = "dot";
      el.appendChild(dot);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = p.name;
      name.title = p.name;
      el.appendChild(name);

      if (p.workingOn) {
        const working = document.createElement("span");
        working.className = "working";
        working.textContent = p.workingOn;
        el.appendChild(working);
      }
      col.appendChild(el);
    }
    if (list.length > 8) {
      const more = document.createElement("button");
      more.className = "see-more";
      more.textContent = `See ${list.length - 8} more`;
      more.addEventListener("click", openPalette);
      col.appendChild(more);
    }
  }
}

function renderOnYou() {
  const ul = document.getElementById("onyou-list");
  ul.replaceChildren();
  const items = onYou();
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nothing waiting on you. Take a beat.";
    ul.appendChild(li);
    return;
  }
  for (const item of items.slice(0, 6)) {
    const li = document.createElement("li");
    li.dataset.kind = item.kind.toLowerCase();

    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = item.kind;
    li.appendChild(kind);

    const what = document.createElement("span");
    what.className = "what";
    const full = item.who ? `${item.who} · ${item.what}` : item.what;
    what.textContent = full;
    what.title = full;
    li.appendChild(what);

    const age = document.createElement("span");
    age.className = "age";
    age.textContent = ageLabel(item.ageMs);
    li.appendChild(age);
    ul.appendChild(li);
  }
  if (items.length > 6) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = `+${items.length - 6} more`;
    ul.appendChild(li);
  }
}

function renderTitleMetaList(ulId, items, projector) {
  const ul = document.getElementById(ulId);
  ul.replaceChildren();
  for (const item of items) {
    const { title, meta, status } = projector(item);
    const li = document.createElement("li");
    if (status) li.dataset.status = status;
    const t = document.createElement("span");
    t.className = "title";
    t.textContent = title;
    t.title = title;
    li.appendChild(t);
    const m = document.createElement("span");
    m.className = "meta";
    m.textContent = meta;
    li.appendChild(m);
    ul.appendChild(li);
  }
}

function renderInMotion() {
  renderTitleMetaList("in-motion", inMotion(), (item) => ({
    title: item.title,
    meta: ageLabel(Date.now() - new Date(item.at)) + " ago",
    status: item.status
  }));
}

function renderThisWeek() {
  renderTitleMetaList("this-week", thisWeek(), (m) => ({
    title: m.title,
    meta: new Date(m.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
  }));
}

function renderAnnouncements() {
  renderTitleMetaList("announcements", announcements.slice(0, 2), (a) => {
    const author = nameOf(a.postedBy);
    return { title: a.summary, meta: author ? `· ${author.split(" ")[0]}` : "" };
  });
}

// ─── Routing ────────────────────────────────────────────────

function route() {
  const hash = location.hash || "#/";
  const map = {
    "#/": "home",
    "#/notifications": "notifications",
    "#/milestones": "milestones",
    "#/journal": "journal",
    "#/settings": "settings"
  };
  const active = map[hash] || "home";
  document.querySelectorAll("[data-route]").forEach((s) => {
    s.classList.toggle("is-active", s.dataset.route === active);
  });
  document.querySelectorAll(".topbar .links a").forEach((a) => {
    a.classList.toggle("is-active", a.getAttribute("href") === hash);
  });
  switch (active) {
    case "home": renderAll(); break;
    case "notifications": renderNotifications(); break;
    case "milestones": renderMilestones(); break;
    case "journal": renderJournal(); break;
    case "settings": renderSettings(); break;
  }
  window.scrollTo(0, 0);
}

// ─── Time-range dropdown (Today / This week / This month / Coming soon / All) ─

const RANGE_LABELS = { today: "Today", week: "This week", month: "This month", soon: "Coming soon", all: "All" };

function applyRange(tab) {
  state.tab = tab;
  const home = document.querySelector("[data-route='home']");
  document.getElementById("range-label").textContent = RANGE_LABELS[tab] || "Today";
  document.querySelectorAll("#range-menu li").forEach((li) => {
    li.setAttribute("aria-selected", li.dataset.tab === tab ? "true" : "false");
  });
  home.classList.toggle("is-future-tab", tab !== "today");
}

function bindRangeDropdown() {
  const trigger = document.getElementById("range-trigger");
  const menu = document.getElementById("range-menu");
  let openTimer = 0;

  function openMenu() {
    menu.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    clearTimeout(openTimer);
    openTimer = setTimeout(() => {
      document.addEventListener("click", outsideClick);
    }, 0);
  }
  function closeMenu() {
    menu.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", outsideClick);
  }
  function outsideClick(e) {
    if (!menu.contains(e.target) && e.target !== trigger) closeMenu();
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.contains("is-open") ? closeMenu() : openMenu();
  });

  menu.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-tab]");
    if (!li) return;
    e.stopPropagation();
    applyRange(li.dataset.tab);
    closeMenu();
    if (location.hash && location.hash !== "#/") location.hash = "#/";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      closeMenu();
      trigger.focus();
    }
  });
}

// ─── Theme ──────────────────────────────────────────────────

function applyTheme(theme) {
  if (theme === "auto") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

function applyReducedMotion(reduced) {
  document.documentElement.classList.toggle("reduce-motion", !!reduced);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (loadSettings().theme === "auto") applyTheme("auto");
});

// ─── Palette ────────────────────────────────────────────────

const palette = document.getElementById("palette");
const paletteScrim = document.getElementById("palette-scrim");
const paletteInput = document.getElementById("palette-input");
const paletteResults = document.getElementById("palette-results");
let paletteIndex = 0;
let currentResults = [];

function paletteCorpus() {
  const items = [];
  for (const p of people) {
    items.push({ label: "Person", title: p.name, meta: p.workingOn || (p.online ? "online" : "offline"), action: () => focusPerson(p) });
  }
  items.push({ label: "Surface", title: "Home", meta: "", action: () => { location.hash = "#/"; } });
  items.push({ label: "Surface", title: "Notifications", meta: "", action: () => { location.hash = "#/notifications"; } });
  items.push({ label: "Surface", title: "Milestones", meta: "", action: () => { location.hash = "#/milestones"; } });
  items.push({ label: "Surface", title: "Journal", meta: "", action: () => { location.hash = "#/journal"; } });
  items.push({ label: "Surface", title: "Settings", meta: "", action: () => { location.hash = "#/settings"; } });
  items.push({ label: "Action", title: "Switch to light theme", meta: "", action: () => applyTheme("light") });
  items.push({ label: "Action", title: "Switch to dark theme", meta: "", action: () => applyTheme("dark") });
  items.push({ label: "Action", title: "Match system theme", meta: "", action: () => applyTheme("auto") });
  items.push({ label: "Action", title: "Start a focus session", meta: "", action: () => document.getElementById("focus-toggle").click() });
  items.push({ label: "Action", title: "Mark all notifications read", meta: "", action: markAllRead });
  items.push({ label: "Action", title: "Reduce motion", meta: "", action: () => saveSettings({ reducedMotion: true }) });
  items.push({ label: "Action", title: "Allow motion", meta: "", action: () => saveSettings({ reducedMotion: false }) });
  for (const it of items) {
    it._titleLower = it.title.toLowerCase();
    it._haystack = `${it._titleLower} ${(it.meta || "").toLowerCase()}`;
  }
  return items;
}

const corpus = paletteCorpus();

function fuzzy(query, items) {
  if (!query.trim()) return items.slice(0, 30);
  const q = query.toLowerCase();
  const scored = [];
  for (const item of items) {
    if (!item._haystack.includes(q)) continue;
    const pos = item._titleLower.indexOf(q);
    const score = pos === -1 ? 5 : Math.max(0, 4 - pos / 20);
    scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 40).map((s) => s.item);
}

function renderPaletteResults() {
  paletteResults.replaceChildren();
  if (!currentResults.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No matches.";
    paletteResults.appendChild(empty);
    return;
  }
  currentResults.forEach((item, i) => {
    const li = document.createElement("li");
    li.setAttribute("aria-selected", i === paletteIndex ? "true" : "false");
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = item.label;
    li.appendChild(label);
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = item.title;
    title.title = item.title;
    li.appendChild(title);
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = item.meta || "";
    li.appendChild(meta);
    li.addEventListener("click", () => {
      item.action();
      closePalette();
    });
    paletteResults.appendChild(li);
  });
}

function openPalette() {
  palette.classList.add("is-open");
  paletteScrim.classList.add("is-open");
  paletteInput.value = "";
  currentResults = fuzzy("", corpus);
  paletteIndex = 0;
  renderPaletteResults();
  setTimeout(() => paletteInput.focus(), 10);
}

function closePalette() {
  palette.classList.add("is-instant");
  paletteScrim.classList.add("is-instant");
  palette.classList.remove("is-open");
  paletteScrim.classList.remove("is-open");
  requestAnimationFrame(() => {
    palette.classList.remove("is-instant");
    paletteScrim.classList.remove("is-instant");
  });
}

paletteInput.addEventListener("input", () => {
  currentResults = fuzzy(paletteInput.value, corpus);
  paletteIndex = 0;
  renderPaletteResults();
});

paletteInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    paletteIndex = Math.min(paletteIndex + 1, currentResults.length - 1);
    renderPaletteResults();
    scrollSelectedIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    paletteIndex = Math.max(0, paletteIndex - 1);
    renderPaletteResults();
    scrollSelectedIntoView();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const item = currentResults[paletteIndex];
    if (item) {
      item.action();
      closePalette();
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    closePalette();
  }
});

paletteScrim.addEventListener("click", closePalette);

function scrollSelectedIntoView() {
  const el = paletteResults.querySelector("[aria-selected='true']");
  el?.scrollIntoView({ block: "nearest" });
}

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    palette.classList.contains("is-open") ? closePalette() : openPalette();
  }
});

// ─── Person → palette focus (used by "See more" + palette person hits) ───

function focusPerson(person) {
  const existing = document.querySelector(`.person[data-id="${person.id}"]`);
  if (!existing) return;
  existing.dataset.active = "true";
  setTimeout(() => delete existing.dataset.active, 1400);
  existing.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ─── Init ───────────────────────────────────────────────────

function renderAll() {
  renderHero();
  renderPeople();
  renderOnYou();
  renderInMotion();
  renderThisWeek();
  renderAnnouncements();
  initRing();
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  bindRangeDropdown();
  route();
});

let lastTickSignature = "";
setInterval(() => {
  if (!document.querySelector("[data-route='home']").classList.contains("is-active")) return;
  const now = Date.now();
  const sig = onYou().concat(inMotion()).map((it) => `${it.id}:${ageLabel(it.ageMs ?? now - new Date(it.at))}`).join("|");
  if (sig === lastTickSignature) return;
  lastTickSignature = sig;
  renderOnYou();
  renderInMotion();
}, 60_000);

// ─── Notifications surface ─────────────────────────────────

const READ_KEY = "workos:read";
function loadRead() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); }
}
function saveRead(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

function renderNotifications() {
  const ul = document.getElementById("notif-list");
  const empty = document.getElementById("notif-empty");
  ul.replaceChildren();
  const items = notificationsFeed();
  const read = loadRead();
  if (!items.length) { empty.hidden = false; return; }
  empty.hidden = true;

  const peopleNow = currentPeople();
  for (const item of items) {
    const li = document.createElement("li");
    li.dataset.read = read.has(item.id) ? "true" : "false";
    const sender = peopleNow.find((p) => p.id === item.fromId);
    li.dataset.online = sender?.online ? "true" : "false";

    const dot = document.createElement("span");
    dot.className = "dot";
    li.appendChild(dot);

    const from = document.createElement("span");
    from.className = "from";
    from.textContent = item.from || "—";
    from.title = item.from || "";
    li.appendChild(from);

    const msg = document.createElement("span");
    msg.className = "msg";
    msg.textContent = item.msg;
    msg.title = item.msg;
    li.appendChild(msg);

    const ctx = document.createElement("span");
    ctx.className = "context";
    ctx.textContent = item.context;
    li.appendChild(ctx);

    const age = document.createElement("span");
    age.className = "age";
    age.textContent = ageLabel(Date.now() - new Date(item.at));
    li.appendChild(age);

    const button = document.createElement("button");
    button.textContent = read.has(item.id) ? "Unread" : "Read";
    button.title = read.has(item.id) ? "Mark as unread" : "Mark as read";
    button.addEventListener("click", () => {
      const r = loadRead();
      if (r.has(item.id)) r.delete(item.id); else r.add(item.id);
      saveRead(r);
      renderNotifications();
    });
    li.appendChild(button);

    ul.appendChild(li);
  }
}

function markAllRead() {
  const items = notificationsFeed();
  const r = loadRead();
  for (const it of items) r.add(it.id);
  saveRead(r);
  if (document.querySelector("[data-route='notifications']").classList.contains("is-active")) renderNotifications();
}

// ─── Milestones surface ────────────────────────────────────

function renderMilestones() {
  const ol = document.getElementById("milestone-timeline");
  ol.replaceChildren();
  const now = Date.now();
  const sorted = [...milestones].sort((a, b) => new Date(a.date) - new Date(b.date));
  const peopleNow = currentPeople();
  for (const m of sorted) {
    const li = document.createElement("li");
    const at = new Date(m.date);
    li.dataset.past = at < now ? "true" : "false";
    li.dataset.kind = m.kind;

    const date = document.createElement("span");
    date.className = "date";
    date.textContent = at.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    li.appendChild(date);

    const body = document.createElement("div");
    body.className = "body";

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = m.title;
    title.title = m.title;
    body.appendChild(title);

    if (m.attendeeIds?.length) {
      const att = document.createElement("div");
      att.className = "attendees";
      for (const id of m.attendeeIds) {
        const p = peopleNow.find((x) => x.id === id);
        if (!p) continue;
        const pill = document.createElement("span");
        pill.className = "pill";
        const dot = document.createElement("span");
        dot.className = "dot";
        const name = document.createElement("span");
        name.textContent = p.name;
        pill.append(dot, name);
        att.appendChild(pill);
      }
      body.appendChild(att);
    }
    li.appendChild(body);
    ol.appendChild(li);
  }
}

// ─── Journal surface ───────────────────────────────────────

const JOURNAL_KEY = "workos:journal";
function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}"); } catch { return {}; }
}
function saveJournal(map) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(map));
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

let journalSaveTimer = 0;

function renderJournal() {
  const today = todayKey();
  const journal = loadJournal();
  const editor = document.getElementById("journal-editor");
  const dateEl = document.getElementById("journal-today-date");
  const saveState = document.getElementById("journal-save");
  const past = document.getElementById("journal-past");

  dateEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });

  editor.textContent = journal[today] || "";
  editor.dataset.empty = editor.textContent ? "false" : "true";
  saveState.textContent = "";

  editor.oninput = () => {
    editor.dataset.empty = editor.textContent.trim() ? "false" : "true";
    saveState.textContent = "Saving…";
    clearTimeout(journalSaveTimer);
    journalSaveTimer = setTimeout(() => {
      const j = loadJournal();
      j[today] = editor.textContent;
      saveJournal(j);
      saveState.textContent = "Saved";
      setTimeout(() => { saveState.textContent = ""; }, 1200);
    }, 600);
  };
  editor.onkeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      const j = loadJournal();
      j[today] = editor.textContent;
      saveJournal(j);
      saveState.textContent = "Saved";
      setTimeout(() => { saveState.textContent = ""; }, 1200);
    }
  };

  past.replaceChildren();
  const keys = Object.keys(journal).filter((k) => k !== today && journal[k]?.trim()).sort().reverse();
  if (!keys.length) return;

  const byWeek = new Map();
  for (const key of keys) {
    const date = isoToDate(key);
    const start = startOfWeek(date);
    const weekKey = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, { start, items: [] });
    byWeek.get(weekKey).items.push({ key, date, text: journal[key] });
  }

  for (const { start, items } of byWeek.values()) {
    const section = document.createElement("section");
    const head = document.createElement("h3");
    head.className = "journal-week-head";
    const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const endStr = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    head.textContent = `Week of ${startStr} – ${endStr}`;
    section.appendChild(head);

    for (const it of items) {
      const day = document.createElement("div");
      day.className = "day";
      const d = document.createElement("span");
      d.className = "date";
      d.textContent = it.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      day.appendChild(d);
      const text = document.createElement("div");
      text.className = "text";
      text.textContent = it.text;
      day.appendChild(text);
      section.appendChild(day);
    }
    past.appendChild(section);
  }
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Settings surface ──────────────────────────────────────

let settingsBound = false;
function renderSettings() {
  const s = loadSettings();
  document.getElementById("set-name").value = s.name;
  setSegmented("set-tone", s.greetingStyle);
  setSegmented("set-theme", s.theme);
  document.getElementById("set-reduced-motion").checked = !!s.reducedMotion;
  updateGreetingPreview();
  renderCirclesEditor();
  if (settingsBound) return;
  settingsBound = true;
  bindSettingsControls();
}

function setSegmented(id, value) {
  document.querySelectorAll(`#${id} button`).forEach((b) => {
    b.setAttribute("aria-checked", b.dataset.value === value ? "true" : "false");
  });
}

function bindSettingsControls() {
  document.getElementById("set-name").addEventListener("input", (e) => {
    saveSettings({ name: e.target.value.trim() || SETTINGS_DEFAULTS.name });
    updateGreetingPreview();
  });
  document.querySelectorAll("#set-tone button").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveSettings({ greetingStyle: btn.dataset.value });
      setSegmented("set-tone", btn.dataset.value);
      updateGreetingPreview();
    });
  });
  document.querySelectorAll("#set-theme button").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveSettings({ theme: btn.dataset.value });
      setSegmented("set-theme", btn.dataset.value);
    });
  });
  document.getElementById("set-reduced-motion").addEventListener("change", (e) => {
    saveSettings({ reducedMotion: e.target.checked });
  });
  document.getElementById("set-reset").addEventListener("click", () => {
    if (!confirm("Reset all settings, custom circles, journal, focus history, and read state?")) return;
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(JOURNAL_KEY);
    localStorage.removeItem(READ_KEY);
    localStorage.removeItem("workos:focus");
    location.reload();
  });
  bindCirclesEditor();
}

function updateGreetingPreview() {
  const s = loadSettings();
  document.getElementById("set-greeting-preview").textContent = greet(new Date(), s.name, s.greetingStyle);
}

function renderCirclesEditor() {
  const peopleNow = currentPeople();
  for (const circle of [1, 2, 3]) {
    const section = document.querySelector(`.settings-circles section[data-circle="${circle}"]`);
    const ul = section.querySelector("ul");
    ul.replaceChildren();
    const members = peopleNow.filter((p) => p.circle === circle);
    for (const p of members) {
      ul.appendChild(circleRow(p));
    }
  }
}

function circleRow(p) {
  const li = document.createElement("li");
  li.dataset.id = p.id;
  li.dataset.offline = p.online ? "false" : "true";
  li.draggable = true;
  const dot = document.createElement("span");
  dot.className = "dot";
  li.appendChild(dot);
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = p.name;
  name.title = p.name;
  li.appendChild(name);
  const x = document.createElement("button");
  x.textContent = "✕";
  x.title = "Remove from circle";
  x.addEventListener("click", () => {
    const s = loadSettings();
    saveSettings({ circleOverrides: { ...s.circleOverrides, [p.id]: null } });
    renderCirclesEditor();
  });
  li.appendChild(x);
  li.addEventListener("dragstart", (e) => {
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", p.id);
  });
  li.addEventListener("dragend", () => li.classList.remove("dragging"));
  return li;
}

function bindCirclesEditor() {
  document.querySelectorAll(".settings-circles section").forEach((section) => {
    const circle = Number(section.dataset.circle);
    section.addEventListener("dragover", (e) => {
      e.preventDefault();
      section.classList.add("drop-target");
    });
    section.addEventListener("dragleave", () => section.classList.remove("drop-target"));
    section.addEventListener("drop", (e) => {
      e.preventDefault();
      section.classList.remove("drop-target");
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const s = loadSettings();
      saveSettings({ circleOverrides: { ...s.circleOverrides, [id]: circle } });
      renderCirclesEditor();
    });
  });

  const input = document.getElementById("set-add-input");
  const results = document.getElementById("set-add-results");
  let addResults = [];
  let addIndex = 0;

  function refreshAddResults() {
    results.replaceChildren();
    if (!addResults.length) {
      results.classList.remove("is-open");
      return;
    }
    results.classList.add("is-open");
    addResults.forEach((p, i) => {
      const li = document.createElement("li");
      li.setAttribute("aria-selected", i === addIndex ? "true" : "false");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = p.name;
      name.title = p.name;
      li.appendChild(name);
      for (const c of [1, 2, 3]) {
        const btn = document.createElement("span");
        btn.className = "pick";
        btn.textContent = c === 1 ? "INNER" : c === 2 ? "SECOND" : "TODAY";
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const s = loadSettings();
          saveSettings({ circleOverrides: { ...s.circleOverrides, [p.id]: c } });
          input.value = "";
          addResults = [];
          refreshAddResults();
          renderCirclesEditor();
        });
        li.appendChild(btn);
      }
      results.appendChild(li);
    });
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { addResults = []; refreshAddResults(); return; }
    addResults = people
      .filter((p) => p.name.toLowerCase().includes(q))
      .filter((p) => p.circle == null)
      .slice(0, 8);
    addIndex = 0;
    refreshAddResults();
  });
  input.addEventListener("blur", () => {
    setTimeout(() => results.classList.remove("is-open"), 120);
  });
}

// React when settings change (e.g., palette toggles theme): refresh active surface.
onSettingsChange(() => {
  const active = document.querySelector("[data-route].is-active")?.dataset.route;
  if (active === "settings") renderSettings();
  if (active === "notifications") renderNotifications();
  if (active === "milestones") renderMilestones();
});
