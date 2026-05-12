// WorkOS — mock data + selectors.
// One source of truth feeding hero, people columns, on-you, ring, footer, palette.

const FIRST_NAMES = [
  "Aisha","Akira","Alejandro","Aliyah","Amara","Amelia","Ananya","Anika","Antoine","Aria",
  "Asher","Astrid","Atticus","August","Aurora","Ayaan","Beatrix","Bodhi","Caleb","Callum",
  "Camille","Cassia","Cedric","Chiara","Cyrus","Dahlia","Damian","Darya","Declan","Delphine",
  "Diego","Eden","Eli","Elias","Elif","Eloise","Emilia","Enzo","Esme","Ezra",
  "Felix","Finn","Fiora","Florence","Gabriel","Gemma","George","Greta","Hana","Harper",
  "Henrik","Hugo","Ibrahim","Imani","Ines","Iris","Isaac","Ivan","Jade","Jasper",
  "Jin","Joaquin","Jude","Junia","Kai","Kaia","Kenji","Kira","Lars","Laszlo",
  "Leila","Leo","Levi","Liam","Linnea","Lior","Luca","Luna","Magnus","Maia",
  "Malik","Marius","Mateo","Maya","Mei","Milo","Mira","Nadia","Nia","Niko",
  "Noor","Octavia","Olivier","Omar","Orla","Oscar","Otis","Paloma","Pia","Quinn",
  "Rafael","Reza","Rhea","Rio","Roman","Rosa","Ruth","Saanvi","Sage","Sami",
  "Saoirse","Sasha","Selene","Shiloh","Silas","Simone","Soren","Stellan","Tariq","Thea",
  "Theo","Tomas","Una","Vera","Vesper","Wells","Wren","Xavi","Yara","Yuki",
  "Zain","Zara","Zephyr","Zoya"
];

const LAST_NAMES = [
  "Abara","Adler","Akin","Almeida","Aoki","Asante","Bach","Bardot","Beaumont","Beckett",
  "Belov","Berg","Bishara","Blackwood","Boutros","Brandt","Bremer","Cabrera","Caldwell","Cao",
  "Cassidy","Chakraborty","Chen","Chowdhury","Cisse","Clemente","Costa","Crowley","Dahl","Darzi",
  "Dasgupta","Delacroix","Devereux","Dimitriou","Doh","Donovan","Dubois","Dvorak","Eames","Eklund",
  "Elhajj","Erdogan","Escher","Evangelista","Faber","Falk","Faraj","Farouk","Felton","Ferrari",
  "Finch","Fontaine","Fox","Frey","Fukuda","Gallego","Garrido","Gerber","Goldfarb","Granger",
  "Grover","Habib","Hadid","Haga","Haru","Hassan","Haupt","Hedlund","Heller","Hirsch",
  "Holm","Howell","Ibarra","Ilic","Iwata","Jabari","Jaffe","Janvier","Jelani","Joon",
  "Kahale","Kamau","Karam","Keane","Kessler","Khalfan","Kim","Kingsbury","Kinski","Kirsch",
  "Koval","Krause","Kuznetsov","Lacroix","Laghari","Lam","Lange","Larsen","Lavoie","Leclerc",
  "Levesque","Lin","Linde","Lobo","Loris","Mackey","Madigan","Mahler","Makhno","Marek",
  "Marlow","Maroun","Marsh","Mascarenhas","Matsuda","Mayer","McAllister","Meier","Mendelsohn","Merced",
  "Michaud","Mikkelsen","Moreau","Morisato","Naidoo","Nakamura","Navarro","Nesbitt","Nguyen","Niemi",
  "Noor","Nyman","Oduya","Okafor","Olin","Otero","Paasonen","Pang","Park","Patel",
  "Pavlovic","Pell","Pereira","Petrova","Pham","Piazza","Pinto","Polanco","Quintero","Rahimi",
  "Ramos","Rao","Rasmussen","Reinhardt","Reyes","Rinaldi","Ritter","Rocha","Roque","Sade",
  "Saito","Salazar","Sandoval","Sayers","Schiff","Schreiber","Sen","Serrano","Shaheen","Shibata",
  "Singh","Slater","Solano","Solberg","Sorensen","Steiner","Stojanovic","Suga","Suzuki","Tahir",
  "Takeda","Tan","Tang","Tate","Tessier","Thapa","Toledo","Torres","Trinh","Tucker",
  "Ueda","Ueno","Vaccaro","Vance","Varga","Vasquez","Vidal","Vogel","Vuong","Walden",
  "Werner","Wickham","Yates","Yi","Yoo","Yusupov","Zahir","Zelaya","Zhao","Ziegler"
];

const WORKING_ON = [
  "Brand 3.0 critique",
  "Enterprise page rewrite",
  "OOH layout for SF",
  "DVQ prep for tomorrow",
  "Pricing tier names",
  "Q2 OKRs",
  "Anthropoll readout",
  "Claude Code page revamp",
  "Startup founders campaign",
  "Manifesto v4",
  "Launch run-of-show",
  "On-site Tuesday",
  "Hiring loop for design",
  "Sales enablement kit",
  "All-hands rehearsal"
];

const TEAMS = [
  "Design", "Brand", "Marketing", "Engineering", "Product",
  "Research", "Sales", "Operations", "People", "Finance",
  "Legal", "Comms", "Partnerships", "Support"
];

// Deterministic pseudo-random so the dataset is stable across reloads (and across days for the noise pool).
let seed = 17;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// — Me —
export const me = { id: "me", name: "Johnnie", greetingStyle: "casual" };

// — Inner / Second / Today circles. These names come from the Figma reference so the
// dashboard mirrors the mock the user is comparing against.
const namedCircles = {
  1: [ // Inner
    { name: "Corey Moen", online: true, workingOn: "Brand 3.0 critique", team: "Brand", joinedYearsAgo: 3.2 },
    { name: "Dexter Callander III", online: true, workingOn: "Enterprise page rewrite", team: "Design", joinedYearsAgo: 2.6 },
    { name: "Jennifer Tan", online: true, workingOn: "Hiring loop for design", team: "Design", joinedYearsAgo: 4.1 },
    { name: "Nikki Makagiansar", online: false, team: "Design", joinedYearsAgo: 1.4 },
    { name: "Meaghan Hendricks", online: false, workingOn: "On-site Tuesday", team: "Operations", joinedYearsAgo: 5.7 },
    { name: "Romello Goodman", online: false, workingOn: "OOH layout for SF", team: "Design", joinedYearsAgo: 2.1 },
    { name: "Skylar Kitchen", online: false, team: "Brand", joinedYearsAgo: 0.8 }
  ],
  2: [ // Second
    { name: "Austin Tan", online: true, workingOn: "Launch run-of-show", team: "Marketing", joinedYearsAgo: 1.9 },
    { name: "Amber Ward", online: true, workingOn: "Manifesto v4", team: "Brand", joinedYearsAgo: 3.5 },
    { name: "Brooke Chambers", online: true, workingOn: "Pricing tier names", team: "Product", joinedYearsAgo: 2.8 },
    { name: "Cat Wu", online: true, workingOn: "Claude Code page revamp", team: "Engineering", joinedYearsAgo: 1.5 },
    { name: "Amanda Matuk", online: true, workingOn: "Q2 OKRs", team: "Research", joinedYearsAgo: 3.0 },
    { name: "Nino Dolce", online: true, workingOn: "DVQ prep for tomorrow", team: "Product", joinedYearsAgo: 2.3 },
    { name: "Trevor Pels", online: true, workingOn: "Sales enablement kit", team: "Sales", joinedYearsAgo: 1.7 },
    { name: "John Egan", online: false, team: "Engineering", joinedYearsAgo: 4.4 },
    { name: "Kacie Jenkins", online: false, team: "People", joinedYearsAgo: 0.6 }
  ],
  3: [ // Today's collaborators (people you don't normally work with but today you do)
    { name: "Priya Iyer", online: true, workingOn: "Anthropoll readout", team: "Research", joinedYearsAgo: 2.0 },
    { name: "Marcus Lin", online: true, workingOn: "Startup founders campaign", team: "Marketing", joinedYearsAgo: 1.2 },
    { name: "Hana Kowalski", online: true, workingOn: "All-hands rehearsal", team: "Comms", joinedYearsAgo: 3.8 }
  ]
};

const circleEntries = [];
let circleSeq = 1;
for (const [circleKey, list] of Object.entries(namedCircles)) {
  const circle = Number(circleKey);
  for (const p of list) {
    circleEntries.push({
      id: `p${circleSeq++}`,
      name: p.name,
      circle,
      online: p.online,
      workingOn: p.workingOn ?? null,
      team: p.team,
      joinedAt: shiftDays(-Math.round(p.joinedYearsAgo * 365.25))
    });
  }
}

// — Noise pool: enough to make the palette feel like a real org. ~2,400 total.
const noisePool = [];
const target = 2400 - circleEntries.length;
const seen = new Set(circleEntries.map((p) => p.name));
while (noisePool.length < target) {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  if (seen.has(name)) continue;
  seen.add(name);
  // Joined sometime between 8 years ago and 2 weeks ago, biased toward more recent.
  const yearsAgo = Math.pow(rand(), 1.6) * 8 + (14 / 365.25);
  noisePool.push({
    id: `n${noisePool.length}`,
    name,
    circle: null,
    online: rand() < 0.42,
    workingOn: rand() < 0.18 ? pick(WORKING_ON) : null,
    team: pick(TEAMS),
    joinedAt: shiftDays(-Math.round(yearsAgo * 365.25))
  });
}

export const people = [...circleEntries, ...noisePool];

const byName = (n) => people.find((p) => p.name === n);
const idOf = (n) => byName(n)?.id ?? null;

// — Meetings (today). Hour-aligned for the Ring.
export const meetings = [
  { id: "m1", startHour: 9, endHour: 10, title: "Design crit · Brand 3.0",
    attendeeIds: [idOf("Corey Moen"), idOf("Romello Goodman"), idOf("Skylar Kitchen")].filter(Boolean) },
  { id: "m2", startHour: 10, endHour: 11, title: "Enterprise page review",
    attendeeIds: [idOf("Dexter Callander III"), idOf("Cat Wu"), idOf("Amber Ward")].filter(Boolean) },
  { id: "m3", startHour: 13, endHour: 14, title: "Pricing tier sync",
    attendeeIds: [idOf("Brooke Chambers"), idOf("Trevor Pels")].filter(Boolean) },
  { id: "m4", startHour: 15, endHour: 16, title: "1:1 · Cat",
    attendeeIds: [idOf("Cat Wu")].filter(Boolean) },
  { id: "m5", startHour: 16, endHour: 17, title: "DVQ rehearsal",
    attendeeIds: [idOf("Nino Dolce"), idOf("Amanda Matuk"), idOf("Jennifer Tan")].filter(Boolean) }
];

// — Tasks (Linear-style).
export const tasks = [
  { id: "t1", title: "Submit Q2 OKRs", dueDate: shiftDays(-1), assigneeId: "me",
    status: "overdue", projectId: "proj-okrs", source: "linear" },
  { id: "t2", title: "Sign off on OOH artwork", dueDate: shiftDays(0), assigneeId: "me",
    status: "open", projectId: "proj-ooh", source: "linear" },
  { id: "t3", title: "Draft launch run-of-show", dueDate: shiftDays(2), assigneeId: "me",
    status: "open", projectId: "proj-cc", source: "linear" },
  { id: "t4", title: "Comment on Manifesto v4", dueDate: shiftDays(1), assigneeId: "me",
    status: "open", projectId: "proj-brand", source: "linear" }
];

// — Reviews (PRs / docs awaiting Johnnie).
export const reviews = [
  { id: "r1", kind: "pr", title: "Add streaming to message handler", authorId: idOf("Cat Wu"),
    awaitingId: "me", openedAt: shiftHours(-26), repo: "anthropic/claude-code", source: "github" },
  { id: "r2", kind: "doc", title: "Brand 3.0 — voice updates", authorId: idOf("Corey Moen"),
    awaitingId: "me", openedAt: shiftHours(-5), docId: "doc-brand-voice", source: "notion" },
  { id: "r3", kind: "pr", title: "Refactor pricing table component", authorId: idOf("Trevor Pels"),
    awaitingId: "me", openedAt: shiftHours(-72), repo: "anthropic/site", source: "github" }
];

// — Threads (Slack-style, deliberately scarce).
export const threads = [
  { id: "th1", lastFrom: idOf("Amber Ward"), snippet: "is this still on track?",
    channelOrDoc: "#brand-3", lastAt: shiftHours(-2), awaitingReply: true, source: "slack" },
  { id: "th2", lastFrom: idOf("Trevor Pels"), snippet: "names that survived the cut",
    channelOrDoc: "DM", lastAt: shiftHours(-4), awaitingReply: true, source: "slack" }
];

// — Docs in progress.
export const docs = [
  { id: "doc-brand-voice", title: "Brand 3.0 — voice updates", lastEditedAt: shiftHours(-2),
    lastEditedBy: "me", collaboratorIds: [idOf("Corey Moen")].filter(Boolean), status: "review" },
  { id: "doc-cc-revamp", title: "Claude Code page revamp", lastEditedAt: shiftHours(-26),
    lastEditedBy: "me", collaboratorIds: [idOf("Cat Wu")].filter(Boolean), status: "draft" },
  { id: "doc-okrs", title: "Q2 OKRs", lastEditedAt: shiftHours(-50),
    lastEditedBy: "me", collaboratorIds: [], status: "draft" }
];

// — Milestones (this week + this month).
export const milestones = [
  { id: "ms1", date: shiftDays(0, 15), title: "DVQ readout", kind: "deadline",
    attendeeIds: [idOf("Nino Dolce"), idOf("Amanda Matuk")].filter(Boolean) },
  { id: "ms2", date: shiftDays(3), title: "Brand 3.0 internal share", kind: "launch",
    attendeeIds: [idOf("Corey Moen"), idOf("Romello Goodman")].filter(Boolean) },
  { id: "ms3", date: shiftDays(5), title: "Enterprise page launch", kind: "launch",
    attendeeIds: [idOf("Dexter Callander III"), idOf("Amber Ward")].filter(Boolean) },
  { id: "ms4", date: shiftDays(7), title: "Jennifer OOO", kind: "ooo",
    attendeeIds: [idOf("Jennifer Tan")].filter(Boolean) },
  { id: "ms5", date: shiftDays(11), title: "Startup Founders campaign live", kind: "launch",
    attendeeIds: [idOf("Marcus Lin")].filter(Boolean) }
];

// — Projects.
export const projects = [
  { id: "proj-enterprise", name: "Enterprise page", status: "on-track", lastActivityAt: shiftHours(-2),
    ownerId: idOf("Dexter Callander III"), milestoneIds: ["ms3"] },
  { id: "proj-startup", name: "Startup Founders campaign", status: "on-track", lastActivityAt: shiftHours(-8),
    ownerId: idOf("Marcus Lin"), milestoneIds: ["ms5"] },
  { id: "proj-ooh", name: "OOH campaign", status: "at-risk", lastActivityAt: shiftHours(-22),
    ownerId: idOf("Romello Goodman"), milestoneIds: [] },
  { id: "proj-brand", name: "Brand guidelines 3.0", status: "on-track", lastActivityAt: shiftHours(-2),
    ownerId: idOf("Corey Moen"), milestoneIds: ["ms2"] },
  { id: "proj-cc", name: "Claude Code page revamp", status: "blocked", lastActivityAt: shiftHours(-30),
    ownerId: idOf("Cat Wu"), milestoneIds: [] },
  { id: "proj-okrs", name: "Q2 OKRs", status: "at-risk", lastActivityAt: shiftHours(-50),
    ownerId: "me", milestoneIds: [] }
];

// — Announcements.
export const announcements = [
  { id: "a1", postedAt: shiftHours(-3), postedBy: idOf("Amanda Matuk"),
    summary: "New DVQ for tomorrow — schema landed in #dvq.", link: null },
  { id: "a2", postedAt: shiftHours(-14), postedBy: idOf("Jennifer Tan"),
    summary: "Anthropoll results are out — read the topline.", link: null }
];

// — Time helpers. Dates are stored as ISO; selectors compute deltas against `now`.
function shiftDays(days, hourOverride) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  if (hourOverride !== undefined) d.setHours(hourOverride, 0, 0, 0);
  return d.toISOString();
}
function shiftHours(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

// — Selectors. Pure functions of (now, data). Everything reactive flows through these.

export function greet(now, name = me.name, style = me.greetingStyle) {
  const hour = now.getHours();
  let band;
  if (hour >= 5 && hour < 9) band = "early";
  else if (hour >= 9 && hour < 12) band = "day";
  else if (hour >= 12 && hour < 18) band = "afternoon";
  else band = "late";

  const matrix = {
    early:     { formal: ["Good morning, ", "."],          casual: ["Morning, ", "."],            playful: ["Rise & shine, ", "."] },
    day:       { formal: ["Welcome back, ", "."],          casual: ["Hey ", ", let’s get to it."],playful: ["Let’s make it count, ", "."] },
    afternoon: { formal: ["Good afternoon, ", "."],        casual: ["Back at it, ", "."],         playful: ["Second wind, ", "?"] },
    late:      { formal: ["Working late, ", "?"],          casual: ["Evening, ", "."],            playful: ["Burning the candle, ", "?"] }
  };
  const [prefix, suffix] = matrix[band][style] ?? matrix[band].casual;
  return `${prefix}${name}${suffix}`;
}

export function stateOfDay(now) {
  const hour = now.getHours();
  const remaining = meetings.filter((m) => m.endHour > hour).length;
  const reviewsOwed = reviews.filter((r) => r.awaitingId === "me").length;
  const overdue = tasks.filter((t) => t.status === "overdue").length;

  const parts = [];
  if (remaining === 0) parts.push("No meetings left today.");
  else if (remaining === 1) {
    const next = meetings.find((m) => m.endHour > hour);
    parts.push(`1 meeting left, at ${formatHour(next.startHour)}.`);
  } else {
    const next = meetings.find((m) => m.startHour >= hour) ?? meetings.find((m) => m.endHour > hour);
    parts.push(`${remaining} meetings ahead, next at ${formatHour(next.startHour)}.`);
  }
  if (overdue > 0) parts.push(`${overdue} overdue.`);
  else if (reviewsOwed > 0) parts.push(`${reviewsOwed} review${reviewsOwed === 1 ? "" : "s"} waiting on you.`);
  return parts.join(" ");
}

// On-you: composes reviews, threads, tasks. Sorted by age × criticality.
export function onYou() {
  const now = new Date();
  const out = [];
  for (const r of reviews) {
    if (r.awaitingId !== "me") continue;
    out.push({
      id: r.id,
      kind: "Review",
      who: nameOf(r.authorId),
      whoId: r.authorId,
      what: r.title,
      ageMs: now - new Date(r.openedAt),
      weight: 0.6
    });
  }
  for (const t of threads) {
    if (!t.awaitingReply) continue;
    out.push({
      id: t.id,
      kind: "Reply",
      who: nameOf(t.lastFrom),
      whoId: t.lastFrom,
      what: `“${t.snippet}”`,
      ageMs: now - new Date(t.lastAt),
      weight: 0.5
    });
  }
  for (const task of tasks) {
    if (task.assigneeId !== "me") continue;
    const dueMs = new Date(task.dueDate) - now;
    if (task.status === "overdue") {
      out.push({ id: task.id, kind: "Overdue", who: null, whoId: null, what: task.title,
        ageMs: -dueMs, weight: 1.0 });
    } else if (dueMs < 24 * 3600 * 1000) {
      out.push({ id: task.id, kind: "Due", who: null, whoId: null, what: task.title,
        ageMs: -dueMs, weight: 0.7 });
    }
  }
  out.sort((a, b) => (b.ageMs * b.weight) - (a.ageMs * a.weight));
  return out;
}

export function nameOf(id) {
  if (!id) return null;
  if (id === "me") return me.name;
  return people.find((p) => p.id === id)?.name ?? null;
}

// In-motion: projects + docs ordered by recent activity.
export function inMotion() {
  const items = [];
  for (const p of projects) items.push({ id: p.id, kind: "project", title: p.name, status: p.status, at: p.lastActivityAt });
  for (const d of docs) items.push({ id: d.id, kind: "doc", title: d.title, status: d.status, at: d.lastEditedAt });
  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  return items.slice(0, 5);
}

// This week: next-3 milestones from now.
export function thisWeek() {
  const now = new Date();
  return milestones
    .map((m) => ({ ...m, at: new Date(m.date) }))
    .filter((m) => m.at >= now)
    .sort((a, b) => a.at - b.at)
    .slice(0, 3);
}

// People grouped by circle for the columns.
export function peopleByCircle() {
  return {
    1: people.filter((p) => p.circle === 1),
    2: people.filter((p) => p.circle === 2),
    3: people.filter((p) => p.circle === 3)
  };
}

export function ageLabel(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function meetingAtHour(hour) {
  return meetings.find((m) => hour >= m.startHour && hour < m.endHour);
}

export function formatHour(h) {
  const meridiem = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${meridiem}`;
}

// Unified notifications feed: reviews + threads + announcements, one row per item,
// sorted by recency. Each entry carries enough metadata for the Notifications surface.
export function notificationsFeed() {
  const items = [];
  for (const r of reviews) {
    items.push({
      id: `r:${r.id}`,
      fromId: r.authorId,
      from: nameOf(r.authorId),
      msg: r.title,
      context: r.kind === "pr" ? "PR review" : "Doc review",
      at: r.openedAt
    });
  }
  for (const t of threads) {
    items.push({
      id: `t:${t.id}`,
      fromId: t.lastFrom,
      from: nameOf(t.lastFrom),
      msg: `“${t.snippet}”`,
      context: t.channelOrDoc,
      at: t.lastAt
    });
  }
  for (const a of announcements) {
    items.push({
      id: `a:${a.id}`,
      fromId: a.postedBy,
      from: nameOf(a.postedBy),
      msg: a.summary,
      context: "Announcement",
      at: a.postedAt
    });
  }
  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  return items;
}

// Apply user circle overrides on top of the mock data, producing a fresh people array.
// `overrides` is { [personId]: 1|2|3|null }.  null = remove from any circle.
export function applyCircleOverrides(overrides) {
  if (!overrides) return people;
  return people.map((p) => {
    if (Object.prototype.hasOwnProperty.call(overrides, p.id)) {
      return { ...p, circle: overrides[p.id] };
    }
    return p;
  });
}

export function groupByCircle(list) {
  return {
    1: list.filter((p) => p.circle === 1),
    2: list.filter((p) => p.circle === 2),
    3: list.filter((p) => p.circle === 3)
  };
}
