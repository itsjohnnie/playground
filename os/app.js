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
  me, people, announcements, peopleByCircle, onYou, greet, stateOfDay,
  inMotion, thisWeek, ageLabel, nameOf
} from "./data.js";
import { initRing } from "./ring.js";

const TIMING = {
  paletteOpen: 240,
  paletteClose: 0
};

// ─── State ──────────────────────────────────────────────────

const state = {
  tab: "today",
  theme: localStorage.getItem("workos:theme") || "auto"
};

applyTheme(state.theme);

// ─── Rendering ──────────────────────────────────────────────

function renderHero() {
  const now = new Date();
  document.getElementById("greeting").textContent = greet(now, me.name, me.greetingStyle);
  document.getElementById("state-of-day").textContent = stateOfDay(now);
}

function renderPeople() {
  const grid = document.getElementById("people");
  for (let i = 1; i <= 3; i++) {
    const col = grid.querySelector(`.column[data-circle="${i}"]`);
    [...col.children].forEach((c) => { if (!c.classList.contains("label")) c.remove(); });
  }
  const byCircle = peopleByCircle();
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
  if (active === "home") renderAll();
}

// ─── Tabs (Today / This week / Coming soon) ─────────────────

function bindTabs() {
  const tabs = document.querySelectorAll(".tabs button");
  const home = document.querySelector("[data-route='home']");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      state.tab = tab;
      tabs.forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab ? "true" : "false"));
      home.classList.toggle("is-future-tab", tab !== "today");
    });
  });
}

// ─── Theme ──────────────────────────────────────────────────

function applyTheme(theme) {
  state.theme = theme;
  if (theme === "auto") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } else {
    document.documentElement.dataset.theme = theme;
  }
  localStorage.setItem("workos:theme", theme);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.theme === "auto") applyTheme("auto");
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
  bindTabs();
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
