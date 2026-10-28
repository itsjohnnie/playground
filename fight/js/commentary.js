// Two clay commentators react to the fight in lower-third subtitles
// (and, optionally, out loud through the browser's speech synthesis).
import { ANNOUNCERS } from './characters.js';
import { pick, chance } from './util.js';

const LINES = {
  intro: [
    [0, "Good evening and welcome to Singularity Deathmatch! I'm {A}."],
    [1, "And I'm {B}. Tonight: {p1} versus {p2}!"],
  ],
  round: [[0, 'Round {n}! Here we go!'], [1, 'Round {n}, and the referee wants a clean fight. He will not get one.']],
  hit: [
    [0, 'Ooh! {a} rearranges the face of {d}!'], [1, "That's gonna leave a thumbprint!"],
    [0, '{d} just got remolded!'], [1, 'Right in the sculpting!'],
    [0, '{a} is working that clay like a pottery wheel!'], [1, 'I felt that one in my kiln, {A}!'],
  ],
  combo: [[0, '{n}-hit combo from {a}!'], [1, '{a} is on fire! Well, baked, anyway.']],
  weapon: [[0, '{a} grabs a {w}! The ref is looking the other way!'], [1, 'A {w}! Is that legal, {A}?'], [0, 'In the Deathmatch? Everything is legal, {B}.']],
  weaponBreak: [[1, 'That {w} is in more pieces than {d}!'], [0, 'Shattered!']],
  slam: [[0, 'Body slam! {d} is flatter than a pancake!'], [1, 'You can hear the clay compress from up here!'], [0, 'OH! What a slam by {a}!']],
  spinslam: [[0, 'The Airplane Spin! {d} is going to be dizzy for a week!']],
  overTop: [[0, '{d} goes OVER the top rope!'], [1, "{d} is on the floor! Somebody get a spatula!"]],
  special: [[0, "It's the {s}!"], [1, '{a} unleashes the {s}!']],
  headPop: [[1, "{d}'s HEAD came OFF!"], [0, "Don't worry folks, it pops right back on. Mostly."]],
  refHit: [[0, "{a} just flattened the referee!"], [1, "The ref is down! Nobody's counting now!"]],
  refDown: [[1, "No ref! There's no one to count the pin!"]],
  pin: [[0, 'The cover!'], [1, '{a} goes for the pin!']],
  kickout: [[0, '{d} kicks out!'], [1, 'Not yet! {d} is still in this!']],
  dive: [[0, '{a} goes up top!'], [1, "Off the turnbuckle! Is {a} crazy?!"]],
  crash: [[1, '{a} hit nothing but mat!'], [0, 'Swing and a miss! Ouch!']],
  taunt: [[1, '{a} is playing to the crowd!'], [0, 'Showboating! I love it!']],
  lowHp: [[0, '{d} is looking like a used stress ball!'], [1, "{d} can't take much more of this!"]],
  comeback: [[1, '{a} is fighting back!'], [0, 'What a comeback from {a}!']],
  escape: [[0, '{d} wriggles free!']],
  rail: [[1, 'Right into the guard rail! That had to hurt!']],
  ko: [[0, "It's over! {d} has been completely flattened!"], [1, 'Somebody get a putty knife!'], [0, 'K.O.! {a} wins it!']],
  clayTime: [[0, "{d} is out on their feet! It's CLAY TIME!"], [1, 'Finish it, {a}!']],
  finisher: [[0, 'The {s}!! Oh, the humanity!'], [1, "I have never seen clay do THAT before!"], [0, '{d} will need a whole new mold after this!']],
  timeout: [[1, "Time! We go to the judges' scorecards!"]],
  pinwin: [[0, '1! 2! 3! {a} gets the pin!']],
  winner: [[0, 'Your winner: {a}!'], [1, 'Unbelievable. Simply unbelievable!']],
};

export class Commentary {
  constructor(ui, crew) {
    this.ui = ui;
    this.crew = crew;
    this.cool = 0;
    this.queue = [];
    this.voice = false;
    this.voices = [];
    this.lastSpeaker = 0;
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en')); };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
  }

  setVoice(on) { this.voice = on; if (!on && 'speechSynthesis' in window) speechSynthesis.cancel(); }

  // Fill {placeholders} from a context object.
  fmt(s, c) {
    return s.replace(/\{(\w+)\}/g, (_, k) => ({ A: ANNOUNCERS.a.name.split(' ')[0], B: ANNOUNCERS.b.name.split(' ')[0], ...c })[k] ?? '');
  }

  say(event, ctx = {}, opts = {}) {
    const pool = LINES[event];
    if (!pool) return;
    if (this.cool > 0 && !opts.force) return;
    if (opts.all) {
      this.queue.push(...pool.map(([who, s]) => ({ who, text: this.fmt(s, ctx) })));
    } else {
      const [who, s] = pick(pool);
      this.queue.push({ who, text: this.fmt(s, ctx) });
      if (opts.chain && chance(0.6)) {
        const alt = pool.filter((l) => l[0] !== who);
        if (alt.length) { const [w2, s2] = pick(alt); this.queue.push({ who: w2, text: this.fmt(s2, ctx) }); }
      }
    }
    this.cool = opts.cool ?? 2.6;
    if (!this.current) this.next();
  }

  next() {
    const line = this.queue.shift();
    this.current = line;
    if (!line) { this.ui.lowerThird(null); return; }
    const who = line.who ? ANNOUNCERS.b : ANNOUNCERS.a;
    const dur = Math.max(1.8, line.text.length * 0.06);
    line.t = dur;
    this.ui.lowerThird(who.name, line.text, line.who);
    this.crew?.talk(line.who, dur);
    if (this.voice && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(line.text);
      const vs = this.voices;
      if (vs.length) u.voice = vs[line.who % vs.length] || vs[0];
      u.pitch = line.who ? 0.75 : 1.15;
      u.rate = 1.12;
      u.volume = 0.9;
      speechSynthesis.speak(u);
    }
  }

  // A one-off line, e.g. a character's catchphrase.
  sayText(text, who = 0) {
    if (this.cool > 0) return;
    this.queue.push({ who, text });
    this.cool = 2.6;
    if (!this.current) this.next();
  }

  clear() {
    this.queue = [];
    this.current = null;
    this.cool = 0;
    this.ui.lowerThird(null);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    if (this.current) {
      this.current.t -= dt;
      if (this.current.t <= 0) this.next();
    }
  }
}
