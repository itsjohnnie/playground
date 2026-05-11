/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Ring
 *
 *    0ms   24 dots painted at full opacity, past hours at 30%
 *  120ms   meeting-filled dots reveal (opacity 0 → 1, scale 0.92 → 1)
 *  340ms   milestone ticks fade in
 *  520ms   now-hour begins gentle pulse (continuous, paused if reduced-motion)
 *
 *  hover dot   → tooltip + line-leads to attendee dots (160ms ease-out)
 *  focus click → arc fills from start to now, eased into render frames
 * ───────────────────────────────────────────────────────── */

import {
  meetings, milestones, meetingAtHour, formatHour
} from "./data.js";

const TIMING = {
  meetingsIn: 120,
  ticksIn: 340,
  pulseBegin: 520,
  hover: 160
};

const HOURS = 24;
const R_OUTER = 92;
const R_INNER = 78;
const R_DOT = 86;

const SVG_NS = "http://www.w3.org/2000/svg";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

const ring = document.getElementById("ring");
const svg = ring.querySelector("svg");
const dotsGroup = svg.querySelector(".dots");
const ticksGroup = svg.querySelector(".ticks");
const nowGroup = svg.querySelector(".now");
const focusGroup = svg.querySelector(".focus");
const leadsGroup = svg.querySelector(".leads");
const tooltip = document.getElementById("ring-tooltip");
const centerBtn = document.getElementById("focus-toggle");

const dotEls = [];
let inited = false;

function angleFor(hour) {
  return (hour / HOURS) * Math.PI * 2 - Math.PI / 2;
}
function xy(r, angle) {
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

function buildDots() {
  const now = new Date();
  const nowHour = now.getHours();
  for (let h = 0; h < HOURS; h++) {
    const angle = angleFor(h);
    const [x, y] = xy(R_DOT, angle);
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 1.4);
    dot.setAttribute("fill", "currentColor");
    dot.dataset.hour = h;
    const meeting = meetingAtHour(h);
    const past = h < nowHour;
    if (meeting) {
      dot.setAttribute("r", 2.6);
      dot.setAttribute("fill-opacity", past ? "0.45" : "1");
      dot.style.cursor = "pointer";
      dot.dataset.meeting = meeting.id;
    } else {
      dot.setAttribute("fill-opacity", past ? "0.22" : "0.55");
    }
    dot.style.transition = `transform ${TIMING.hover}ms var(--ease-out), fill-opacity ${TIMING.hover}ms var(--ease-out)`;
    dot.style.transformBox = "fill-box";
    dot.style.transformOrigin = "center";
    dotsGroup.appendChild(dot);
    dotEls.push(dot);
  }
}

function buildMilestoneTicks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const m of milestones) {
    const d = new Date(m.date);
    const diffDays = Math.floor((d - today) / 86400000);
    if (diffDays !== 0) continue;
    const hour = d.getHours();
    const angle = angleFor(hour);
    const [x1, y1] = xy(R_OUTER + 6, angle);
    const [x2, y2] = xy(R_OUTER + 14, angle);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("opacity", "0");
    line.dataset.milestone = m.id;
    line.style.cursor = "pointer";
    line.style.transition = `opacity ${TIMING.hover}ms var(--ease-out), stroke-width ${TIMING.hover}ms var(--ease-out)`;
    ticksGroup.appendChild(line);
    setTimeout(() => line.setAttribute("opacity", "0.55"), TIMING.ticksIn);
  }
}

function buildNow() {
  const now = new Date();
  const minutes = now.getHours() + now.getMinutes() / 60;
  const angle = angleFor(minutes);
  const [x, y] = xy(R_DOT, angle);
  const c = document.createElementNS(SVG_NS, "circle");
  c.setAttribute("cx", x);
  c.setAttribute("cy", y);
  c.setAttribute("r", 4.4);
  c.setAttribute("fill", "none");
  c.setAttribute("stroke", "currentColor");
  c.setAttribute("stroke-width", "1");
  c.setAttribute("opacity", "0");
  c.classList.add("now-ring");
  nowGroup.appendChild(c);
  setTimeout(() => {
    c.setAttribute("opacity", "0.75");
    if (!prefersReducedMotion.matches) c.classList.add("is-pulsing");
  }, TIMING.pulseBegin);
}

// ── Tooltip + line-leads ──

function findPersonDot(personId) {
  return document.querySelector(`.person[data-id="${personId}"] .dot`);
}

function clearLeads() {
  leadsGroup.replaceChildren();
}

function drawLeads(meeting) {
  clearLeads();
  if (!meeting?.attendeeIds?.length) return;
  const ringRect = ring.getBoundingClientRect();
  const cx = ringRect.left + ringRect.width / 2;
  const cy = ringRect.top + ringRect.height / 2;
  const scale = 220 / ringRect.width;
  const angle = angleFor(meeting.startHour);
  const start = [Math.cos(angle) * R_DOT, Math.sin(angle) * R_DOT];

  const targets = [];
  for (const attendeeId of meeting.attendeeIds) {
    const personDot = findPersonDot(attendeeId);
    if (!personDot) continue;
    const rect = personDot.getBoundingClientRect();
    targets.push({
      personDot,
      end: [(rect.left + rect.width / 2 - cx) * scale, (rect.top + rect.height / 2 - cy) * scale]
    });
  }

  for (const { personDot, end } of targets) {
    const lead = document.createElementNS(SVG_NS, "line");
    lead.setAttribute("x1", start[0]);
    lead.setAttribute("y1", start[1]);
    lead.setAttribute("x2", end[0]);
    lead.setAttribute("y2", end[1]);
    lead.setAttribute("stroke", "currentColor");
    lead.setAttribute("stroke-width", "0.5");
    lead.setAttribute("opacity", "0");
    lead.style.transition = `opacity ${TIMING.hover}ms var(--ease-out)`;
    leadsGroup.appendChild(lead);
    requestAnimationFrame(() => lead.setAttribute("opacity", "0.35"));
    personDot.parentElement.dataset.active = "true";
  }
}

function clearActive() {
  document.querySelectorAll(".person[data-active='true']").forEach((p) => delete p.dataset.active);
}

function showTooltip(text, meta, x, y) {
  tooltip.replaceChildren();
  const title = document.createElement("div");
  title.textContent = text;
  tooltip.appendChild(title);
  if (meta) {
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta;
    tooltip.appendChild(m);
  }
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add("is-visible");
}
function hideTooltip() {
  tooltip.classList.remove("is-visible");
}

ring.addEventListener("mousemove", (e) => {
  const target = e.target;
  if (target?.dataset?.meeting) {
    const meeting = meetings.find((m) => m.id === target.dataset.meeting);
    if (!meeting) return;
    const ringRect = ring.getBoundingClientRect();
    showTooltip(
      meeting.title,
      `${formatHour(meeting.startHour)}–${formatHour(meeting.endHour)}`,
      e.clientX - ringRect.left + 10,
      e.clientY - ringRect.top + 10
    );
    drawLeads(meeting);
  } else if (target?.dataset?.milestone) {
    const m = milestones.find((x) => x.id === target.dataset.milestone);
    if (!m) return;
    const ringRect = ring.getBoundingClientRect();
    showTooltip(m.title, formatMilestone(m), e.clientX - ringRect.left + 10, e.clientY - ringRect.top + 10);
  } else {
    hideTooltip();
    clearLeads();
    clearActive();
  }
});

ring.addEventListener("mouseleave", () => {
  hideTooltip();
  clearLeads();
  clearActive();
  resetCursorScale();
});

// ── Cursor-reactive scale ──
let cursorTimer = null;
let pendingPoint = null;
let pointerRaf = 0;

function applyCursorScale() {
  pointerRaf = 0;
  if (!pendingPoint) return;
  const { clientX, clientY } = pendingPoint;
  const ringRect = ring.getBoundingClientRect();
  const cx = ringRect.left + ringRect.width / 2;
  const cy = ringRect.top + ringRect.height / 2;
  const scaleFactor = ringRect.width / 220;
  for (const dot of dotEls) {
    const hour = Number(dot.dataset.hour);
    const angle = angleFor(hour);
    const dx = Math.cos(angle) * R_DOT * scaleFactor + cx - clientX;
    const dy = Math.sin(angle) * R_DOT * scaleFactor + cy - clientY;
    const dist = Math.hypot(dx, dy);
    const factor = Math.max(0, 1 - dist / 90);
    dot.style.transform = `scale(${1 + factor * 0.7})`;
  }
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(resetCursorScale, 600);
}

function resetCursorScale() {
  for (const dot of dotEls) dot.style.transform = "";
}

ring.addEventListener("pointermove", (e) => {
  if (!hasFinePointer.matches || prefersReducedMotion.matches) return;
  pendingPoint = { clientX: e.clientX, clientY: e.clientY };
  if (!pointerRaf) pointerRaf = requestAnimationFrame(applyCursorScale);
});

// ── Focus session ──

let focusState = null; // { startHour: number, startedAt: ms }

centerBtn.addEventListener("click", () => {
  if (focusState) {
    endFocus();
  } else {
    startFocus();
  }
});

function startFocus() {
  const now = new Date();
  focusState = {
    startHour: now.getHours() + now.getMinutes() / 60,
    startedAt: Date.now()
  };
  centerBtn.setAttribute("aria-label", "End focus session");
  renderFocusArc();
  focusInterval = setInterval(renderFocusArc, 30_000);
}

function endFocus() {
  const sessions = JSON.parse(localStorage.getItem("workos:focus") || "[]");
  sessions.push({
    startedAt: focusState.startedAt,
    endedAt: Date.now()
  });
  localStorage.setItem("workos:focus", JSON.stringify(sessions));
  focusState = null;
  clearInterval(focusInterval);
  focusInterval = 0;
  centerBtn.setAttribute("aria-label", "Start focus session");
  focusGroup.replaceChildren();
  focusPathEl = null;
}

let focusInterval = 0;
let focusPathEl = null;

function renderFocusArc() {
  if (!focusState) {
    focusGroup.replaceChildren();
    focusPathEl = null;
    return;
  }
  const now = new Date();
  const nowHours = now.getHours() + now.getMinutes() / 60;
  const a0 = angleFor(focusState.startHour);
  const a1 = angleFor(nowHours);
  const [x0, y0] = xy(R_INNER, a0);
  const [x1, y1] = xy(R_INNER, a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  const d = `M ${x0} ${y0} A ${R_INNER} ${R_INNER} 0 ${largeArc} 1 ${x1} ${y1}`;
  if (!focusPathEl) {
    focusPathEl = document.createElementNS(SVG_NS, "path");
    focusPathEl.setAttribute("stroke", "currentColor");
    focusPathEl.setAttribute("stroke-width", "1.5");
    focusPathEl.setAttribute("fill", "none");
    focusPathEl.setAttribute("opacity", "0.45");
    focusPathEl.setAttribute("stroke-linecap", "round");
    focusGroup.appendChild(focusPathEl);
  }
  focusPathEl.setAttribute("d", d);
}

function formatMilestone(m) {
  const d = new Date(m.date);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function initRing() {
  if (inited) return;
  inited = true;
  buildDots();
  buildMilestoneTicks();
  setTimeout(buildNow, 0);
  setTimeout(() => {
    for (const dot of dotEls) if (dot.dataset.meeting) dot.style.opacity = "1";
  }, TIMING.meetingsIn);
}
