// ─── State ─────────────────────────────────────────────────────────
const state = {
  clips: [],          // [{ start, end, thumb }]
  inPoint: 0,
  outPoint: 0,
  duration: 0,
  exportWidth: 480,
  exportCRF: 30,
  videoFile: null,
  videoURL: null,
  ffmpeg: null,
  inputWritten: false,
};

// ─── DOM ───────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const video = $('video');
const timeline = $('timeline');
const selection = $('selection');
const playhead = $('playhead');
const thumbstrip = $('thumbstrip');
const clipsEl = $('clips');
const dropZone = $('drop-zone');
const statusEl = $('status');
const progress = $('progress');
const progressBar = $('progress-bar');

const fmt = (t) => t.toFixed(2);
const setStatus = (msg) => { statusEl.textContent = msg; };

// ─── FFmpeg (UMD locally vendored, wasm core from CDN) ─────────────
async function loadFFmpeg() {
  setStatus('loading ffmpeg core (~30MB)…');
  const { FFmpeg } = FFmpegWASM;
  const { toBlobURL } = FFmpegUtil;

  const ffmpeg = new FFmpeg();
  ffmpeg.on('log', ({ message }) => {
    if (message.includes('frame=') || message.includes('time=')) setStatus(message.slice(0, 60));
  });
  ffmpeg.on('progress', ({ progress: p }) => {
    progressBar.style.width = `${Math.round(p * 100)}%`;
  });

  // core.wasm is ~30MB — fetch from CDN, convert to blob URL to bypass CORS
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  ]);
  await ffmpeg.load({ coreURL, wasmURL });

  state.ffmpeg = ffmpeg;
  setStatus('ready');
  updateExportBtn();
}
loadFFmpeg().catch(e => setStatus('ffmpeg failed: ' + e.message));

// ─── Video loading ─────────────────────────────────────────────────
function loadVideo(file) {
  if (state.videoURL) URL.revokeObjectURL(state.videoURL);
  state.videoFile = file;
  state.videoURL = URL.createObjectURL(file);
  state.clips = [];
  state.inputWritten = false;
  video.src = state.videoURL;
  dropZone.classList.add('hidden');
}

video.addEventListener('loadedmetadata', () => {
  state.duration = video.duration;
  state.inPoint = 0;
  state.outPoint = Math.min(2, state.duration);
  syncInputs();
  renderClips();
  renderTimeline();
  generateThumbstrip();
});

video.addEventListener('timeupdate', () => {
  $('time-display').textContent = `${fmt(video.currentTime)} / ${fmt(state.duration)}`;
  playhead.style.left = `${(video.currentTime / state.duration) * 100}%`;

  // loop playback within selection when playing
  if (!video.paused && video.currentTime >= state.outPoint) {
    video.currentTime = state.inPoint;
  }
});

$('file-input').addEventListener('change', (e) => {
  if (e.target.files[0]) loadVideo(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) loadVideo(file);
});

$('reset-btn').addEventListener('click', () => {
  dropZone.classList.remove('hidden');
  $('file-input').value = '';
});

// ─── Thumbnail strip ───────────────────────────────────────────────
async function generateThumbstrip() {
  thumbstrip.innerHTML = '';
  const count = 30;
  const w = timeline.clientWidth / count;
  const aspect = video.videoWidth / video.videoHeight;
  const h = 80;

  // use a hidden seeker video so we don't fight the main playhead
  const seeker = document.createElement('video');
  seeker.src = video.src;
  seeker.muted = true;
  await new Promise(r => seeker.addEventListener('loadeddata', r, { once: true }));

  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = h * aspect;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    thumbstrip.appendChild(canvas);

    const t = (i / count) * state.duration;
    seeker.currentTime = t;
    await new Promise(r => seeker.addEventListener('seeked', r, { once: true }));
    canvas.getContext('2d').drawImage(seeker, 0, 0, canvas.width, canvas.height);
  }
  seeker.src = '';
}

// ─── Timeline interaction ──────────────────────────────────────────
let dragging = false;
let dragStart = 0;
let tlRect = null;

function timeAt(clientX) {
  const pct = Math.max(0, Math.min(1, (clientX - tlRect.left) / tlRect.width));
  return pct * state.duration;
}

timeline.addEventListener('mousedown', (e) => {
  if (e.target.closest('.suggestion')) return;
  dragging = true;
  tlRect = timeline.getBoundingClientRect();
  dragStart = timeAt(e.clientX);
  state.inPoint = dragStart;
  state.outPoint = dragStart;
  video.currentTime = dragStart;
  syncInputs();
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const t = timeAt(e.clientX);
  state.inPoint = Math.min(dragStart, t);
  state.outPoint = Math.max(dragStart, t);
  video.currentTime = t;
  syncInputs();
});

window.addEventListener('mouseup', () => { dragging = false; });

function renderSelection() {
  if (state.outPoint - state.inPoint < 0.01) {
    selection.style.display = 'none';
    return;
  }
  selection.style.display = 'block';
  selection.style.left = `${(state.inPoint / state.duration) * 100}%`;
  selection.style.width = `${((state.outPoint - state.inPoint) / state.duration) * 100}%`;
}

function renderTimeline() {
  // remove old clip markers (keep thumbstrip, selection, playhead, suggestions)
  timeline.querySelectorAll('.tl-clip').forEach(el => el.remove());
  state.clips.forEach(c => {
    const el = document.createElement('div');
    el.className = 'tl-clip';
    el.style.left = `${(c.start / state.duration) * 100}%`;
    el.style.width = `${((c.end - c.start) / state.duration) * 100}%`;
    timeline.appendChild(el);
  });
}

// ─── In/Out controls ───────────────────────────────────────────────
function syncInputs() {
  $('in-time').value = fmt(state.inPoint);
  $('out-time').value = fmt(state.outPoint);
  renderSelection();
}

$('in-time').addEventListener('change', (e) => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v)) {
    state.inPoint = Math.max(0, Math.min(v, state.duration));
    video.currentTime = state.inPoint;
    syncInputs();
  }
});
$('out-time').addEventListener('change', (e) => {
  const v = parseFloat(e.target.value);
  if (!isNaN(v)) {
    state.outPoint = Math.max(0, Math.min(v, state.duration));
    syncInputs();
  }
});

$('set-in').addEventListener('click', () => {
  state.inPoint = video.currentTime;
  if (state.outPoint < state.inPoint) state.outPoint = state.inPoint;
  syncInputs();
});
$('set-out').addEventListener('click', () => {
  state.outPoint = video.currentTime;
  if (state.inPoint > state.outPoint) state.inPoint = state.outPoint;
  syncInputs();
});

const playBtn = $('play-btn');
playBtn.addEventListener('click', () => {
  if (video.paused) {
    video.currentTime = state.inPoint;
    video.play();
  } else {
    video.pause();
  }
});
video.addEventListener('pause', () => playBtn.textContent = '▶');
video.addEventListener('play', () => playBtn.textContent = '⏸');

// keyboard
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'i' || e.key === 'I') $('set-in').click();
  else if (e.key === 'o' || e.key === 'O') $('set-out').click();
  else if (e.key === 'Enter') $('add-clip').click();
  else if (e.key === ' ') { e.preventDefault(); $('play-btn').click(); }
  else if (e.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 0.04 : 1));
  else if (e.key === 'ArrowRight') video.currentTime = Math.min(state.duration, video.currentTime + (e.shiftKey ? 0.04 : 1));
});

// ─── Clip management ───────────────────────────────────────────────
function captureThumb(t) {
  return new Promise(resolve => {
    const prev = video.currentTime;
    const paused = video.paused;
    video.pause();
    video.currentTime = t;
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 64;
      canvas.getContext('2d').drawImage(video, 0, 0, 96, 64);
      video.currentTime = prev;
      if (!paused) video.play();
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    }, { once: true });
  });
}

$('add-clip').addEventListener('click', async () => {
  const dur = state.outPoint - state.inPoint;
  if (dur < 0.1) return setStatus('selection too short');
  const thumb = await captureThumb(state.inPoint);
  state.clips.push({ start: state.inPoint, end: state.outPoint, thumb });
  renderClips();
  renderTimeline();
  setStatus(`added ${fmt(dur)}s clip`);
});

function renderClips() {
  clipsEl.innerHTML = '';
  let total = 0;
  state.clips.forEach((c, i) => {
    const dur = c.end - c.start;
    total += dur;
    const el = document.createElement('div');
    el.className = 'clip';
    el.draggable = true;
    el.dataset.index = i;
    el.innerHTML = `
      <img class="clip-thumb" src="${c.thumb}">
      <div class="clip-info">
        <div class="clip-range">${fmt(c.start)} → ${fmt(c.end)}</div>
        <div class="clip-dur">${fmt(dur)}s</div>
      </div>
      <button class="clip-remove">×</button>
    `;
    el.querySelector('.clip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.clips.splice(i, 1);
      renderClips();
      renderTimeline();
    });
    el.addEventListener('click', () => {
      state.inPoint = c.start;
      state.outPoint = c.end;
      video.currentTime = c.start;
      syncInputs();
    });
    el.addEventListener('dragstart', (e) => {
      el.classList.add('dragging');
      e.dataTransfer.setData('text/plain', i);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      renderClips();
    });
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = +e.dataTransfer.getData('text/plain');
      if (from === i) return;
      const [moved] = state.clips.splice(from, 1);
      state.clips.splice(i, 0, moved);
    });
    clipsEl.appendChild(el);
  });
  $('total-duration').textContent = `${fmt(total)}s`;
  updateExportBtn();
}

function updateExportBtn() {
  $('export-btn').disabled = !(state.ffmpeg && state.clips.length > 0);
}

// ─── Export presets ────────────────────────────────────────────────
$('size-presets').addEventListener('click', (e) => {
  if (!e.target.dataset.w) return;
  $('size-presets').querySelectorAll('button').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  state.exportWidth = +e.target.dataset.w;
});
$('quality-presets').addEventListener('click', (e) => {
  if (!e.target.dataset.crf) return;
  $('quality-presets').querySelectorAll('button').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  state.exportCRF = +e.target.dataset.crf;
});

// ─── Export to WebM ────────────────────────────────────────────────
$('export-btn').addEventListener('click', async () => {
  const ffmpeg = state.ffmpeg;
  if (!ffmpeg || state.clips.length === 0) return;

  $('export-btn').disabled = true;
  progress.classList.add('active');
  progressBar.style.width = '0%';

  const inputName = 'input' + getExt(state.videoFile.name);
  const outputName = 'sizzle.webm';

  try {
    if (!state.inputWritten) {
      setStatus('writing input…');
      await ffmpeg.writeFile(inputName, new Uint8Array(await state.videoFile.arrayBuffer()));
      state.inputWritten = true;
    }

    // build concat filter: trim each clip, reset timestamps, concat
    const n = state.clips.length;
    const trims = state.clips.map((c, i) =>
      `[0:v]trim=start=${c.start}:end=${c.end},setpts=PTS-STARTPTS[v${i}]`
    ).join(';');
    const labels = state.clips.map((_, i) => `[v${i}]`).join('');
    const filter = `${trims};${labels}concat=n=${n}:v=1:a=0[out]`;

    // scale: width set, height auto & even (vp9 requires even dims)
    const scale = state.exportWidth > 0
      ? ['-vf', `scale=${state.exportWidth}:-2`]
      : [];

    setStatus('encoding vp9…');
    await ffmpeg.exec([
      '-i', inputName,
      '-filter_complex', filter,
      '-map', '[out]',
      ...scale,
      '-c:v', 'libvpx-vp9',
      '-crf', String(state.exportCRF),
      '-b:v', '0',
      '-row-mt', '1',
      '-an',
      outputName
    ]);

    setStatus('reading output…');
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sizzle-${Date.now()}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    await ffmpeg.deleteFile(outputName);
    setStatus(`done — ${(blob.size / 1024).toFixed(0)} KB`);
  } catch (err) {
    setStatus('export failed: ' + err.message);
    console.error(err);
  } finally {
    progress.classList.remove('active');
    $('export-btn').disabled = false;
  }
});

function getExt(name) {
  const m = name.match(/\.[^.]+$/);
  return m ? m[0] : '.mp4';
}

// ─── Claude frame analysis ─────────────────────────────────────────
$('claude-btn').addEventListener('click', () => {
  $('claude-panel').classList.toggle('open');
});

$('analyze-btn').addEventListener('click', async () => {
  const key = $('api-key').value.trim();
  if (!key) return alert('Enter your Anthropic API key');

  const results = $('claude-results');
  results.innerHTML = '<div style="color:var(--text-dim)">sampling frames…</div>';
  timeline.querySelectorAll('.suggestion').forEach(el => el.remove());

  try {
    // sample frames evenly across video
    const sampleCount = Math.min(20, Math.floor(state.duration / 2));
    const frames = [];
    const seeker = document.createElement('video');
    seeker.src = video.src;
    seeker.muted = true;
    await new Promise(r => seeker.addEventListener('loadeddata', r, { once: true }));

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = Math.round(320 * seeker.videoHeight / seeker.videoWidth);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < sampleCount; i++) {
      const t = (i + 0.5) / sampleCount * state.duration;
      seeker.currentTime = t;
      await new Promise(r => seeker.addEventListener('seeked', r, { once: true }));
      ctx.drawImage(seeker, 0, 0, canvas.width, canvas.height);
      frames.push({ t, data: canvas.toDataURL('image/jpeg', 0.6).split(',')[1] });
    }
    seeker.src = '';

    results.innerHTML = '<div style="color:var(--text-dim)">asking claude…</div>';

    // build vision message
    const content = [{
      type: 'text',
      text: `I'm cutting a sizzle reel for a video thumbnail. Below are ${frames.length} frames sampled evenly across a ${fmt(state.duration)}s video, labeled with timestamps.\n\nIdentify 3-5 time ranges (~2s each) that would make great sizzle clips. Prefer frames that:\n- Show the core subject/action clearly\n- Have NO text overlays, logos, watermarks, or UI chrome\n- Are NOT title cards, intros, outros, or black frames\n- Have visual motion or interest\n\nRespond ONLY with JSON: [{"start": <sec>, "end": <sec>, "reason": "<8 words max>"}]`
    }];
    frames.forEach(f => {
      content.push({ type: 'text', text: `t=${fmt(f.t)}s:` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } });
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1024,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('no JSON in response');
    const suggestions = JSON.parse(jsonMatch[0]);

    results.innerHTML = '';
    suggestions.forEach(s => {
      const el = document.createElement('div');
      el.className = 'claude-suggest';
      el.innerHTML = `<div class="range">${fmt(s.start)} → ${fmt(s.end)}</div><div class="reason">${s.reason}</div>`;
      el.addEventListener('click', () => {
        state.inPoint = s.start;
        state.outPoint = s.end;
        video.currentTime = s.start;
        syncInputs();
        $('add-clip').click();
      });
      results.appendChild(el);

      // draw on timeline
      const marker = document.createElement('div');
      marker.className = 'suggestion';
      marker.style.left = `${(s.start / state.duration) * 100}%`;
      marker.style.width = `${((s.end - s.start) / state.duration) * 100}%`;
      marker.title = s.reason;
      marker.addEventListener('click', (e) => { e.stopPropagation(); el.click(); });
      timeline.appendChild(marker);
    });
  } catch (err) {
    results.innerHTML = `<div style="color:var(--danger)">${err.message}</div>`;
  }
});
