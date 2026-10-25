// DOM screens and the broadcast-style HUD.
const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.screens = {};
    for (const id of ['boot', 'title', 'menu', 'select', 'ladder', 'versus', 'hud', 'pause', 'howto', 'results']) this.screens[id] = $(id);
    this.big = $('big');
    this.countEl = $('count');
    this.flashEl = $('flash');
    this.hp = [$('h1'), $('h2')];
    this.ghost = [$('hg1'), $('hg2')];
    this.sp = [$('s1'), $('s2')];
    this.names = [$('n1'), $('n2')];
    this.pips = [$('pips1'), $('pips2')];
    this.combo = [$('combo1'), $('combo2')];
    this.timer = $('timer');
    this.roundLabel = $('round-label');
    this.lt = $('lower-third');
    this.focusIdx = 0;
    this.handlers = {};
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) { this.handlers.action?.(b.dataset.action, b); }
    });
  }

  show(id, on = true) { this.screens[id].classList.toggle('show', on); }
  only(...ids) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('show', ids.includes(k));
    this.refocus();
  }
  isShown(id) { return this.screens[id].classList.contains('show'); }

  // Keyboard/gamepad focus within the top-most visible menu.
  activeMenu() {
    for (const id of ['howto', 'pause', 'results', 'menu', 'ladder', 'title']) {
      if (this.isShown(id)) return this.screens[id];
    }
    return null;
  }
  focusables() {
    const m = this.activeMenu();
    if (!m) return [];
    return [...m.querySelectorAll('button, .row')].filter((b) => b.offsetParent !== null);
  }
  refocus() { this.focusIdx = 0; this.paintFocus(); }
  paintFocus() {
    document.querySelectorAll('.focus').forEach((e) => e.classList.remove('focus'));
    const f = this.focusables();
    if (!f.length) return;
    this.focusIdx = (this.focusIdx + f.length) % f.length;
    f[this.focusIdx].classList.add('focus');
  }
  moveFocus(d) { this.focusIdx += d; this.paintFocus(); }
  focused() { return this.focusables()[this.focusIdx]; }

  // ---------------------------------------------------------------- HUD
  setNames(a, b) { this.names[0].textContent = a; this.names[1].textContent = b; }
  setRound(n, wins, needed) {
    this.roundLabel.textContent = `ROUND ${n}`;
    this.pips.forEach((el, i) => {
      el.innerHTML = '';
      for (let k = 0; k < needed; k++) { const p = document.createElement('i'); if (k < wins[i]) p.className = 'won'; el.appendChild(p); }
    });
  }
  updateBars(fs) {
    fs.forEach((f, i) => {
      const k = Math.max(0, f.hp / f.maxHp);
      this.hp[i].style.transform = `scaleX(${k})`;
      this.ghost[i].style.transform = `scaleX(${k})`;
      this.hp[i].classList.toggle('low', k < 0.25);
      this.sp[i].style.transform = `scaleX(${f.meter / 100})`;
      this.sp[i].classList.toggle('half', f.meter >= 50);
    });
  }
  setTimer(t) {
    const s = Math.max(0, Math.ceil(t));
    if (this.timer.textContent !== String(s)) this.timer.textContent = s;
    this.timer.classList.toggle('hurry', s <= 10);
  }
  showCombo(i, n) {
    const el = this.combo[i];
    if (n < 2) { el.classList.remove('show'); return; }
    el.innerHTML = `${n} HITS<small>${n >= 5 ? 'CLAYTASTIC!' : n >= 3 ? 'COMBO!' : ''}</small>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this['ct' + i]);
    this['ct' + i] = setTimeout(() => el.classList.remove('show'), 1200);
  }

  banner(text, sub = '', dur = 1.2, kind = '') {
    const b = this.big;
    clearTimeout(this.bigT);
    b.className = 'big-text';
    b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    void b.offsetWidth;
    b.className = 'big-text show ' + kind;
    if (dur > 0) this.bigT = setTimeout(() => { b.className = 'big-text hide ' + kind; }, dur * 1000);
  }
  hideBanner() { this.big.className = 'big-text'; }

  bigCount(n) {
    const c = this.countEl;
    c.textContent = n;
    c.classList.remove('show');
    void c.offsetWidth;
    c.classList.add('show');
  }

  flash() {
    this.flashEl.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => this.flashEl.classList.remove('on')));
  }

  lowerThird(name, text, who) {
    if (!name) { this.lt.classList.remove('show'); return; }
    $('lt-name').textContent = name;
    $('lt-text').textContent = text;
    this.lt.classList.toggle('b', !!who);
    this.lt.classList.add('show');
  }

  replayBug(on) { $('replay-bug').classList.toggle('show', on); }

  // ---------------------------------------------------------------- select
  buildRoster(roster, portraits) {
    const r = $('roster');
    r.innerHTML = '';
    roster.forEach((c, i) => {
      const s = document.createElement('div');
      s.className = 'slot';
      s.dataset.idx = i;
      s.innerHTML = `<img alt="${c.name}" src="${portraits[c.id]}"><span class="tagp t1">P1</span><span class="tagp t2">P2</span><span class="sname">${c.name}</span>`;
      s.addEventListener('mouseenter', () => this.handlers.hoverSlot?.(i));
      s.addEventListener('click', () => this.handlers.clickSlot?.(i));
      r.appendChild(s);
    });
  }
  paintSelect(cursors, roster, portraits, labels, ready) {
    document.querySelectorAll('.slot').forEach((s, i) => {
      s.classList.toggle('c1', cursors[0] === i);
      s.classList.toggle('c2', cursors[1] === i);
    });
    [0, 1].forEach((p) => {
      const card = $(p ? 'card-p2' : 'card-p1');
      const c = roster[cursors[p]];
      if (!c) { card.innerHTML = ''; return; }
      const bar = (k) => `<div class="stat">${k}<i style="width:${c.stats[k] * 20}%"></i></div>`;
      card.innerHTML = `<div class="who">${labels[p]}</div><img alt="" src="${portraits[c.id]}"><h3>${c.name}</h3><p class="title">${c.title}</p>${bar('power')}${bar('speed')}${bar('tough')}<p class="moves"><b>Special:</b> ${c.special.name}<br><b>Finisher:</b> ${c.finisher.name}</p>${ready[p] ? '<div class="ready">READY!</div>' : ''}`;
    });
  }

  buildLadder(list, idx, portraits) {
    const ol = $('ladder-list');
    ol.innerHTML = '';
    list.forEach((c, i) => {
      const li = document.createElement('li');
      if (i < idx) li.className = 'done';
      if (i === idx) li.className = 'next';
      li.innerHTML = `<img alt="" src="${portraits[c.id]}"><span>${i + 1}. ${c.name}</span>${c.boss ? '<span class="boss">FINAL BOSS</span>' : ''}`;
      ol.appendChild(li);
    });
  }

  versus(side, c, corner) {
    const el = $(side ? 'vs-right' : 'vs-left');
    if (!c) { el.classList.remove('show'); return; }
    el.innerHTML = `<div class="corner">${corner}</div><div class="nm">${c.name}</div><div class="tt">${c.title}</div><div class="bio">${c.entrance || ''}</div>`;
    el.classList.add('show');
  }
  versusMid(on) { document.querySelector('.vs-mid').classList.toggle('show', on); }
  clearVersus() { this.versus(0, null); this.versus(1, null); this.versusMid(false); }

  results(kicker, name, sub, stats, actions) {
    $('res-kicker').textContent = kicker;
    $('res-name').textContent = name;
    $('res-sub').textContent = sub;
    $('res-stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('res-actions').innerHTML = actions.map(([a, l]) => `<button data-action="${a}">${l}</button>`).join('');
  }

  setPauseMode(mode) {
    const p = this.screens.pause;
    p.classList.toggle('mode-pause', mode === 'pause');
    p.classList.toggle('mode-options', mode === 'options');
    $('pause-title').textContent = mode === 'pause' ? 'Paused' : 'Options';
  }
}
