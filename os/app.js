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
  me, people, announcements, milestones, meetings, reviews, threads, tasks, docs, peopleByCircle, weekMeetingGrid,
  onYou, greet, stateOfDay,
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
    renderHours();
    renderWeekstrip();
  }
});

// ─── Rendering ──────────────────────────────────────────────

function renderHero() {
  const now = new Date();
  const s = loadSettings();
  document.getElementById("greeting").textContent = greet(now, s.name, s.greetingStyle);
  document.getElementById("state-of-day").textContent = stateOfDay(now);

  const counts = peopleByCircle();
  const inner = counts[1].length, second = counts[2].length, today = counts[3].length;
  document.getElementById("me-meta").textContent =
    `${inner} inner · ${second} second · ${today} today`;
}

function renderWeekstrip() {
  const svg = document.querySelector("#weekstrip .weekstrip-svg");
  const axis = document.getElementById("weekstrip-axis");
  const meta = document.getElementById("weekstrip-meta");
  if (!svg || !axis) return;

  const grid = weekMeetingGrid();
  const W = 280, H = 64;
  const cols = 7, rows = 3;
  const gapX = 4, gapY = 4;
  const cellW = (W - gapX * (cols - 1)) / cols;
  const cellH = (H - gapY * (rows - 1)) / rows;

  svg.replaceChildren();
  const now = new Date();
  const todayIdx = grid.findIndex((d) => d.isToday);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cell = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      cell.setAttribute("x", c * (cellW + gapX));
      cell.setAttribute("y", r * (cellH + gapY));
      cell.setAttribute("width", cellW);
      cell.setAttribute("height", cellH);
      cell.setAttribute("rx", 1.5);
      cell.classList.add("cell");
      const load = grid[c].bands[r];
      cell.dataset.load = String(Math.min(4, load));
      svg.appendChild(cell);
    }
  }
  if (todayIdx >= 0) {
    const x = todayIdx * (cellW + gapX) - 2;
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    marker.setAttribute("x", x);
    marker.setAttribute("y", -2);
    marker.setAttribute("width", cellW + 4);
    marker.setAttribute("height", H + 4);
    marker.setAttribute("rx", 3);
    marker.classList.add("col-today");
    svg.appendChild(marker);
  }

  axis.replaceChildren();
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  for (const d of grid) {
    const span = document.createElement("span");
    span.textContent = fmt.format(d.date).slice(0, 3);
    if (d.isToday) span.dataset.today = "true";
    axis.appendChild(span);
  }

  const totalLoad = grid.reduce((sum, d) => sum + d.bands.reduce((a, b) => a + b, 0), 0);
  meta.textContent = `${totalLoad} blocks · 7 days`;
}

// Only set `title` when the element is actually truncated — avoids native-tooltip noise.
function maybeTitle(el, full) {
  requestAnimationFrame(() => {
    if (el.scrollWidth > el.clientWidth + 1) el.title = full;
    else el.removeAttribute("title");
  });
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
      el.addEventListener("click", () => openPersonDrawer(p));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") openPersonDrawer(p); });

      const dot = document.createElement("span");
      dot.className = "dot";
      el.appendChild(dot);

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = p.name;
      el.appendChild(name);
      maybeTitle(name, p.name);

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
    li.addEventListener("click", () => openOnYouDrawer(item));

    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = item.kind;
    li.appendChild(kind);

    const what = document.createElement("span");
    what.className = "what";
    const full = item.who ? `${item.who} · ${item.what}` : item.what;
    what.textContent = full;
    li.appendChild(what);
    maybeTitle(what, full);

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
    li.appendChild(t);
    const m = document.createElement("span");
    m.className = "meta";
    m.textContent = meta;
    li.appendChild(m);
    ul.appendChild(li);
    maybeTitle(t, title);
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
    "#/team": "team",
    "#/notifications": "notifications",
    "#/milestones": "milestones",
    "#/journal": "journal",
    "#/settings": "settings"
  };
  const active = map[hash] || "home";

  // Crossfade: brief opacity dip on the outgoing surface, then swap, then fade in.
  // Short and ease-out per the WorkOS motion budget — under 300ms total.
  const prev = document.querySelector("[data-route].is-active");
  const next = document.querySelector(`[data-route="${active}"]`);
  if (prev && next && prev !== next) {
    prev.classList.add("is-leaving");
  }
  const swap = () => {
    document.querySelectorAll("[data-route]").forEach((s) => {
      s.classList.toggle("is-active", s === next);
      s.classList.remove("is-leaving");
    });
    document.querySelectorAll(".topbar .links a").forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("href") === hash);
    });
    switch (active) {
      case "home": renderAll(); break;
      case "team": renderTeam(); break;
      case "notifications": renderNotifications(); break;
      case "milestones": renderMilestones(); break;
      case "journal": renderJournal(); break;
      case "settings": renderSettings(); break;
    }
    window.scrollTo(0, 0);
    next.classList.add("is-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("is-entering")));
  };

  if (prev && next && prev !== next) setTimeout(swap, 120);
  else swap();
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
  items.push({ label: "Surface", title: "Team", meta: "", action: () => { location.hash = "#/team"; } });
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
  renderHours();
  renderWeekstrip();
  initRing();
}

function renderHours() {
  const svg = document.querySelector(".hours-svg");
  const axis = document.getElementById("hours-axis");
  const meta = document.getElementById("hours-meta");
  if (!svg || !axis) return;

  const startHour = 7, endHour = 21;
  const span = endHour - startHour;
  const W = 1200, H = 96;
  const padX = 6;
  const innerW = W - padX * 2;
  const hourW = innerW / span;
  const laneY = 14, laneH = 68;
  const NS = "http://www.w3.org/2000/svg";

  svg.replaceChildren();
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;

  // 3-hour grid ticks
  for (let h = startHour; h <= endHour; h++) {
    if (h % 3 !== 0) continue;
    const x = padX + (h - startHour) * hourW;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", x); line.setAttribute("x2", x);
    line.setAttribute("y1", laneY); line.setAttribute("y2", laneY + laneH);
    line.classList.add("tick");
    svg.appendChild(line);
  }

  // Meeting blocks
  for (const m of meetings) {
    if (m.endHour <= startHour || m.startHour >= endHour) continue;
    const sh = Math.max(m.startHour, startHour);
    const eh = Math.min(m.endHour, endHour);
    const x = padX + (sh - startHour) * hourW;
    const w = Math.max(3, (eh - sh) * hourW);
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", x + 2); rect.setAttribute("y", laneY);
    rect.setAttribute("width", Math.max(2, w - 4)); rect.setAttribute("height", laneH);
    rect.setAttribute("rx", 3);
    rect.classList.add("meeting");
    if (m.endHour <= nowH) rect.classList.add("meeting-past");
    svg.appendChild(rect);

    if (w > 70) {
      const text = document.createElementNS(NS, "text");
      text.setAttribute("x", x + 10); text.setAttribute("y", laneY + 24);
      text.classList.add("meeting-label");
      text.textContent = m.title;
      svg.appendChild(text);

      const time = document.createElementNS(NS, "text");
      time.setAttribute("x", x + 10); time.setAttribute("y", laneY + 42);
      time.classList.add("meeting-time");
      time.textContent = `${formatHour(sh)} – ${formatHour(eh)}`;
      svg.appendChild(time);
    }
  }

  // Now indicator
  if (nowH >= startHour && nowH <= endHour) {
    const x = padX + (nowH - startHour) * hourW;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", x); line.setAttribute("x2", x);
    line.setAttribute("y1", laneY - 6); line.setAttribute("y2", laneY + laneH + 6);
    line.classList.add("now-line");
    svg.appendChild(line);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", x); dot.setAttribute("cy", laneY - 6);
    dot.setAttribute("r", 2.5);
    dot.classList.add("now-dot");
    svg.appendChild(dot);
  }

  // Axis labels every 3 hours
  axis.replaceChildren();
  for (let h = startHour; h <= endHour; h += 3) {
    const span = document.createElement("span");
    span.textContent = formatHour(h);
    if (h <= nowH && nowH < h + 3) span.dataset.now = "true";
    axis.appendChild(span);
  }

  const ahead = meetings.filter((m) => m.endHour > nowH);
  const aheadHours = ahead.reduce((sum, m) => sum + Math.max(0, m.endHour - Math.max(m.startHour, nowH)), 0);
  meta.textContent = aheadHours > 0
    ? `${ahead.length} meeting${ahead.length === 1 ? "" : "s"} ahead · ${aheadHours.toFixed(1)}h scheduled`
    : `${meetings.length} meetings done · clear from here`;
}

function formatHour(h) {
  const hh = h % 12 || 12;
  return `${hh}${h < 12 || h === 24 ? "a" : "p"}`;
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
  renderHours();
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
    li.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      openNotificationDrawer(item);
    });

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
  if (active === "team") renderTeam();
});

// ─── Team surface ──────────────────────────────────────────

let teamBound = false;
const teamState = { scope: "all", query: "" };
const CIRCLE_NAME = { 1: "Inner", 2: "Second", 3: "Today" };
const JOINED_FMT = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });
function formatJoined(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.valueOf()) ? "—" : JOINED_FMT.format(d);
}
function slugEmail(name) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "") + "@example.com";
}

function renderTeam() {
  const list = currentPeople();
  let scoped = list;
  if (teamState.scope === "inner") scoped = scoped.filter((p) => p.circle === 1);
  else if (teamState.scope === "second") scoped = scoped.filter((p) => p.circle === 2);
  else if (teamState.scope === "today") scoped = scoped.filter((p) => p.circle === 3);
  else if (teamState.scope === "online") scoped = scoped.filter((p) => p.online);

  const q = teamState.query.trim().toLowerCase();
  if (q) scoped = scoped.filter((p) => p.name.toLowerCase().includes(q) || (p.workingOn || "").toLowerCase().includes(q));

  const onlineCount = scoped.filter((p) => p.online).length;
  document.getElementById("team-meta").textContent = `${scoped.length.toLocaleString()} people · ${onlineCount.toLocaleString()} online`;

  const body = document.getElementById("team-body");
  const empty = document.getElementById("team-empty");
  body.replaceChildren();
  if (!scoped.length) { empty.hidden = false; return; }
  empty.hidden = true;

  const CAP = 200;
  const shown = scoped.slice(0, CAP);
  for (const p of shown) {
    const tr = document.createElement("tr");
    tr.dataset.online = p.online ? "true" : "false";
    tr.addEventListener("click", (e) => {
      if (e.target.closest("button, a")) return;
      openPersonDrawer(p);
    });

    const st = document.createElement("td");
    st.className = "t-status";
    const dot = document.createElement("span"); dot.className = "dot";
    st.appendChild(dot);
    tr.appendChild(st);

    const nm = document.createElement("td");
    nm.className = "t-name";
    nm.textContent = p.name;
    tr.appendChild(nm);
    maybeTitle(nm, p.name);

    const tm = document.createElement("td");
    tm.className = "t-team";
    tm.textContent = p.team || "—";
    tr.appendChild(tm);
    if (p.team) maybeTitle(tm, p.team);

    const ci = document.createElement("td");
    ci.className = "t-circle";
    if (p.circle) ci.dataset.c = String(p.circle);
    ci.textContent = p.circle ? CIRCLE_NAME[p.circle] : "—";
    tr.appendChild(ci);

    const wk = document.createElement("td");
    wk.className = "t-working";
    wk.textContent = p.workingOn || "";
    tr.appendChild(wk);
    if (p.workingOn) maybeTitle(wk, p.workingOn);

    const jd = document.createElement("td");
    jd.className = "t-joined";
    jd.textContent = p.joinedAt ? formatJoined(p.joinedAt) : "—";
    tr.appendChild(jd);

    const ac = document.createElement("td");
    ac.className = "t-actions";
    const acWrap = document.createElement("span");
    acWrap.className = "row-actions";

    const contact = document.createElement("a");
    contact.className = "row-action";
    contact.textContent = "Contact";
    contact.href = `mailto:${slugEmail(p.name)}`;
    contact.title = `Email ${p.name}`;
    acWrap.appendChild(contact);

    const inInner = p.circle === 1;
    const innerBtn = document.createElement("button");
    innerBtn.className = "row-icon";
    innerBtn.dataset.state = inInner ? "in" : "out";
    innerBtn.textContent = inInner ? "✓" : "+";
    innerBtn.setAttribute("aria-label", inInner ? `Remove ${p.name} from Inner circle` : `Add ${p.name} to Inner circle`);
    innerBtn.title = inInner ? "In Inner — click to remove" : "Add to Inner";
    innerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const s = loadSettings();
      saveSettings({ circleOverrides: { ...s.circleOverrides, [p.id]: inInner ? null : 1 } });
      renderTeam();
    });
    acWrap.appendChild(innerBtn);

    ac.appendChild(acWrap);
    tr.appendChild(ac);

    body.appendChild(tr);
  }
  if (scoped.length > CAP) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.style.color = "var(--ink-50)";
    td.style.fontStyle = "italic";
    td.style.padding = "0.6rem 0.8rem";
    td.textContent = `+${(scoped.length - CAP).toLocaleString()} more — refine the search to narrow.`;
    tr.appendChild(td);
    body.appendChild(tr);
  }

  if (teamBound) return;
  teamBound = true;
  document.getElementById("team-search").addEventListener("input", (e) => {
    teamState.query = e.target.value;
    renderTeam();
  });
  document.querySelectorAll(".team-chips button").forEach((btn) => {
    btn.addEventListener("click", () => {
      teamState.scope = btn.dataset.scope;
      document.querySelectorAll(".team-chips button").forEach((b) => b.setAttribute("aria-checked", b === btn ? "true" : "false"));
      renderTeam();
    });
  });
}

// ─── Detail drawer ─────────────────────────────────────────

const drawer = document.getElementById("drawer");
const drawerScrim = document.getElementById("drawer-scrim");
const drawerBody = document.getElementById("drawer-body");
const drawerKind = document.getElementById("drawer-kind");

function openDrawer(kind, builder) {
  drawerKind.textContent = kind;
  drawerBody.replaceChildren();
  builder(drawerBody);
  drawer.classList.add("is-open");
  drawerScrim.classList.add("is-open");
}
function closeDrawer() {
  drawer.classList.remove("is-open");
  drawerScrim.classList.remove("is-open");
}
document.getElementById("drawer-close").addEventListener("click", closeDrawer);
drawerScrim.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
});

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}
function field(label, value, opts = {}) {
  const f = el("div", { className: "field" });
  f.appendChild(el("span", { className: "field-label", text: label }));
  const v = el("div", { className: "field-value" + (opts.muted ? " muted" : "") });
  if (typeof value === "string") v.textContent = value;
  else if (value) v.appendChild(value);
  else { v.textContent = "—"; v.classList.add("muted"); }
  f.appendChild(v);
  return f;
}

function openPersonDrawer(p) {
  openDrawer("Person", (b) => {
    b.appendChild(el("h2", { text: p.name }));
    const sub = p.online ? "Online now" : "Offline";
    const subEl = el("div", { className: "subtitle" });
    subEl.textContent = sub + (p.circle ? ` · ${CIRCLE_NAME[p.circle]} circle` : "");
    b.appendChild(subEl);

    b.appendChild(field("Working on", p.workingOn || "Nothing posted"));
    b.appendChild(field("Circle", p.circle ? CIRCLE_NAME[p.circle] : "Not in your circles"));

    const personMeetings = meetings.filter((m) => m.attendeeIds.includes(p.id));
    if (personMeetings.length) {
      const list = el("div", { className: "list" });
      for (const m of personMeetings) {
        const row = el("div", { className: "row" });
        row.appendChild(el("span", { className: "title", text: m.title }));
        row.appendChild(el("span", { className: "meta", text: `${fmtHourLocal(m.startHour)}–${fmtHourLocal(m.endHour)}` }));
        list.appendChild(row);
      }
      b.appendChild(field("Meetings today", list));
    } else {
      b.appendChild(field("Meetings today", "None"));
    }

    const personReviews = reviews.filter((r) => r.authorId === p.id || r.awaitingId === p.id);
    if (personReviews.length) {
      const list = el("div", { className: "list" });
      for (const r of personReviews) {
        const row = el("div", { className: "row" });
        row.appendChild(el("span", { className: "title", text: r.title }));
        row.appendChild(el("span", { className: "meta", text: ageLabel(Date.now() - new Date(r.openedAt)) }));
        list.appendChild(row);
      }
      b.appendChild(field("Open reviews", list));
    }

    const sharedDocs = docs.filter((d) => d.collaboratorIds?.includes(p.id));
    if (sharedDocs.length) {
      const list = el("div", { className: "list" });
      for (const d of sharedDocs) {
        const row = el("div", { className: "row" });
        row.appendChild(el("span", { className: "title", text: d.title }));
        row.appendChild(el("span", { className: "meta", text: ageLabel(Date.now() - new Date(d.lastEditedAt)) + " ago" }));
        list.appendChild(row);
      }
      b.appendChild(field("Shared docs", list));
    }
  });
}

function fmtHourLocal(h) {
  const meridiem = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${meridiem}`;
}

function openOnYouDrawer(item) {
  openDrawer(item.kind, (b) => {
    b.appendChild(el("h2", { text: item.what.replace(/^["]|["]$/g, "") }));
    const sub = el("div", { className: "subtitle" });
    sub.textContent = item.who ? `From ${item.who} · ${ageLabel(item.ageMs)} ago` : `${ageLabel(item.ageMs)} ago`;
    b.appendChild(sub);

    b.appendChild(field("Kind", item.kind));
    if (item.who) b.appendChild(field("From", item.who));

    let source = null;
    if (item.id.startsWith("r")) {
      source = reviews.find((r) => r.id === item.id);
      if (source) {
        b.appendChild(field("Type", source.kind === "pr" ? "Pull request" : "Doc review"));
        b.appendChild(field("Location", source.repo || source.docId || "—"));
        b.appendChild(field("Opened", new Date(source.openedAt).toLocaleString()));
      }
    } else if (item.id.startsWith("t") && tasks.find((t) => t.id === item.id)) {
      source = tasks.find((t) => t.id === item.id);
      b.appendChild(field("Due", new Date(source.dueDate).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })));
      b.appendChild(field("Status", source.status));
      b.appendChild(field("Source", source.source));
    } else if (item.id.startsWith("th")) {
      source = threads.find((t) => t.id === item.id);
      if (source) {
        b.appendChild(field("Channel", source.channelOrDoc));
        b.appendChild(field("Last activity", new Date(source.lastAt).toLocaleString()));
        b.appendChild(field("Source", source.source));
      }
    }
  });
}

function openNotificationDrawer(item) {
  openDrawer(item.context || "Notification", (b) => {
    b.appendChild(el("h2", { text: item.msg.replace(/^["]|["]$/g, "") }));
    const sub = el("div", { className: "subtitle" });
    sub.textContent = `From ${item.from || "—"} · ${ageLabel(Date.now() - new Date(item.at))} ago`;
    b.appendChild(sub);
    b.appendChild(field("Context", item.context));
    if (item.from) b.appendChild(field("Sender", item.from));
    b.appendChild(field("Received", new Date(item.at).toLocaleString()));

    const read = loadRead();
    const toggle = el("button", { className: "drawer-close" });
    toggle.textContent = read.has(item.id) ? "Mark unread" : "Mark read";
    toggle.style.marginTop = "1rem";
    toggle.style.padding = "0.5rem 0.85rem";
    toggle.style.border = "1px solid var(--rule)";
    toggle.style.borderRadius = "4px";
    toggle.style.color = "var(--ink-70)";
    toggle.style.fontSize = "12.5px";
    toggle.addEventListener("click", () => {
      const r = loadRead();
      if (r.has(item.id)) r.delete(item.id); else r.add(item.id);
      saveRead(r);
      renderNotifications();
      closeDrawer();
    });
    b.appendChild(toggle);
  });
}
