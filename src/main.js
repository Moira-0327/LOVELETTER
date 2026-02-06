/* ============================================
   LOVER LETTER — Main Application Logic
   Flat-lay layout with tap-to-expand interaction
   ============================================ */

const MONTHS_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// ============ STATE ============

const state = {
  partnerName: '',
  senderName: '',
  togetherDate: null,
  letterContent: '',
  photos: [null, null, null, null],
  typingActive: false,
  hasPhotos: false,
  expandedPanel: null, // 'letter' | 'photobooth' | null
  letterTyped: false,  // has typewriter already played?
};

// ============ DOM ============

const setupScreen = document.getElementById('setup-screen');
const resultScreen = document.getElementById('result-screen');
const setupForm = document.getElementById('setup-form');
const photoSlots = document.querySelectorAll('.photo-upload-slot');
const backBtn = document.getElementById('back-btn');

// Flat-lay elements
const flatlayScene = document.getElementById('flatlay-scene');
const letterPaper = document.getElementById('letter-paper');
const photoboothStrip = document.getElementById('photobooth-strip-el');
const flatlayActions = document.getElementById('flatlay-actions');

// Expand overlay
const expandBackdrop = document.getElementById('expand-backdrop');
const expandLetterPanel = document.getElementById('expand-letter-panel');
const expandPhotoboothPanel = document.getElementById('expand-photobooth-panel');

// ============ TYPEWRITER SOUND ============
// Hybrid approach: Web Audio API + HTML Audio fallback for mobile
// iOS silent switch blocks Web Audio, so we try both methods

let audioCtx = null;
let audioUnlocked = false;
let useHTMLAudio = false; // fallback flag

// --- Web Audio approach ---
function ensureAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      useHTMLAudio = true;
      return null;
    }
  }
  return audioCtx;
}

// --- HTML Audio fallback (works with iOS silent mode in some cases) ---
// Generate a tiny WAV click sound programmatically
function generateClickWAV() {
  const sampleRate = 22050;
  const duration = 0.03;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);

  // Generate a short percussive click
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 150); // fast decay
    const wave = Math.sin(t * 2000 * Math.PI * 2) * 0.4 + (Math.random() - 0.5) * 0.3;
    const sample = Math.max(-1, Math.min(1, wave * env));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

const clickSoundURL = generateClickWAV();

// Pool of Audio elements for rapid playback
const AUDIO_POOL_SIZE = 6;
const audioPool = [];
let poolIdx = 0;

function initAudioPool() {
  for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
    const a = new Audio(clickSoundURL);
    a.volume = 0.2;
    a.preload = 'auto';
    audioPool.push(a);
  }
}
initAudioPool();

// Unlock audio on user gesture — try BOTH Web Audio + HTML Audio
function tryUnlockAudio() {
  if (audioUnlocked) return;

  // Unlock HTML Audio pool
  audioPool.forEach(a => {
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  });

  // Unlock Web Audio
  const ctx = ensureAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    try {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (_) {}
  }

  audioUnlocked = true;
}

// Must use touchend for iOS (touchstart doesn't count as user gesture for audio)
document.addEventListener('touchend', tryUnlockAudio, { passive: true });
document.addEventListener('click', tryUnlockAudio);
document.addEventListener('keydown', tryUnlockAudio);

function playTypeClick() {
  // Try Web Audio first (lower latency)
  let webAudioPlayed = false;
  const ctx = ensureAudioContext();
  if (ctx && ctx.state === 'running') {
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1800 + Math.random() * 600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.Q.setValueAtTime(0.8, t);

      gain.gain.setValueAtTime(0.06 + Math.random() * 0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
      webAudioPlayed = true;
    } catch (_) {}
  }

  // Also play via HTML Audio (as fallback / for iOS silent mode)
  if (!webAudioPlayed || useHTMLAudio) {
    try {
      const a = audioPool[poolIdx % AUDIO_POOL_SIZE];
      a.currentTime = 0;
      a.play().catch(() => {});
      poolIdx++;
    } catch (_) {}
  }
}

// ============ INIT ============

generatePaperGrain();

// ============ PAPER GRAIN TEXTURE ============

function generatePaperGrain() {
  const canvas = document.createElement('canvas');
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base pixel noise
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = 190 + Math.random() * 40;
    imageData.data[i] = v;
    imageData.data[i + 1] = v * 0.93;
    imageData.data[i + 2] = v * 0.82;
    imageData.data[i + 3] = 15;
  }
  ctx.putImageData(imageData, 0, 0);

  // Fiber lines
  ctx.strokeStyle = 'rgba(170, 140, 90, 0.04)';
  for (let y = 0; y < size; y += 4) {
    ctx.lineWidth = 0.4 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 10) {
      ctx.lineTo(x + 10, y + (Math.random() - 0.5) * 0.6);
    }
    ctx.stroke();
  }

  // Foxing spots
  for (let s = 0; s < 30; s++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 1 + Math.random() * 3;
    const alpha = 0.03 + Math.random() * 0.06;
    ctx.fillStyle = `rgba(${140 + Math.random() * 40}, ${110 + Math.random() * 30}, ${60 + Math.random() * 30}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dark speckles
  for (let s = 0; s < 80; s++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 0.2 + Math.random() * 0.5;
    ctx.fillStyle = `rgba(${90 + Math.random() * 40}, ${70 + Math.random() * 30}, ${40 + Math.random() * 20}, ${0.06 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fiber strands
  for (let f = 0; f < 8; f++) {
    const fx = Math.random() * size;
    const fy = Math.random() * size;
    const angle = Math.random() * Math.PI;
    const len = 10 + Math.random() * 25;
    ctx.strokeStyle = `rgba(${150 + Math.random() * 40}, ${120 + Math.random() * 30}, ${70 + Math.random() * 30}, ${0.04 + Math.random() * 0.04})`;
    ctx.lineWidth = 0.3 + Math.random() * 0.3;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    const ex = fx + Math.cos(angle) * len;
    const ey = fy + Math.sin(angle) * len;
    const cpx = (fx + ex) / 2 + (Math.random() - 0.5) * 6;
    const cpy = (fy + ey) / 2 + (Math.random() - 0.5) * 6;
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();
  }

  const dataUrl = canvas.toDataURL('image/png');
  document.querySelectorAll('.paper-grain').forEach(el => {
    el.style.backgroundImage = `url(${dataUrl})`;
    el.style.backgroundSize = `${size}px ${size}px`;
  });
}

// ============ FORM INPUT TYPEWRITER SOUND ============

document.querySelectorAll('#setup-form input[type="text"], #setup-form input[type="date"], #setup-form textarea').forEach(el => {
  el.addEventListener('input', () => playTypeClick());
});

// ============ PHOTO UPLOAD ============

photoSlots.forEach((slot) => {
  const input = slot.querySelector('.photo-input');
  const preview = slot.querySelector('.photo-preview');
  const index = parseInt(slot.dataset.index);

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      state.photos[index] = ev.target.result;
      preview.src = ev.target.result;
      slot.classList.add('has-photo');
    };
    reader.readAsDataURL(file);
  });
});

// ============ FORM SUBMISSION ============

setupForm.addEventListener('submit', (e) => {
  e.preventDefault();

  state.partnerName = document.getElementById('partner-name').value.trim();
  state.senderName = document.getElementById('sender-name').value.trim();
  const dateStr = document.getElementById('together-date').value;
  state.togetherDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  state.letterContent = document.getElementById('letter-content').value.trim();
  state.hasPhotos = state.photos.some(p => p !== null);

  renderResult();
  showScreen(resultScreen);
});

// ============ RENDER RESULT (flat-lay) ============

function renderResult() {
  const today = new Date();
  const day = today.getDate();
  const month = MONTHS_EN[today.getMonth()];
  const daysSince = calculateDaysTogether(state.togetherDate);

  // --- Flat-lay letter thumbnail (static text, no typewriter) ---
  document.getElementById('letter-day').textContent = day;
  document.getElementById('letter-month').textContent = `\u2014 ${month}`;

  const greeting = state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  const body = state.letterContent || 'You are the most beautiful chapter in my story.';

  document.getElementById('letter-greeting').textContent = greeting;
  document.getElementById('letter-body').textContent = body;
  document.getElementById('letter-sender').textContent = state.senderName ? `Yours, ${state.senderName}` : '';
  document.getElementById('letter-days').textContent = `${daysSince} days together`;
  document.getElementById('letter-days').classList.add('visible');

  // --- Photobooth strip ---
  if (state.hasPhotos) {
    photoboothStrip.style.display = '';
    state.photos.forEach((photo, i) => {
      const el = document.getElementById(`strip-photo-${i}`);
      if (photo) {
        el.style.backgroundImage = `url(${photo})`;
      } else {
        el.style.background = `linear-gradient(135deg, #E8E0D8 0%, #D4C8BC 100%)`;
      }
    });

    document.getElementById('strip-caption').textContent =
      (state.partnerName && state.senderName) ? `${state.partnerName} & ${state.senderName}` : state.partnerName ? `${state.partnerName} & me` : 'you & me';
  } else {
    photoboothStrip.style.display = 'none';
  }

  // Show Save/Share buttons after a short delay
  state.letterTyped = false;
  setTimeout(() => {
    flatlayActions.classList.add('visible');
  }, 1200);
}

function calculateDaysTogether(startDate) {
  const now = new Date();
  const diffMs = now - startDate;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// ============ EXPAND / COLLAPSE ============

// Click letter thumbnail → expand letter
letterPaper.addEventListener('click', () => {
  if (state.expandedPanel) return;
  expandLetter();
});

// Click photobooth thumbnail → expand photobooth
photoboothStrip.addEventListener('click', () => {
  if (state.expandedPanel) return;
  expandPhotobooth();
});

// Click backdrop → collapse
expandBackdrop.addEventListener('click', () => {
  collapsePanel();
});

// Click expanded panel itself → collapse (but not save buttons inside)
expandLetterPanel.addEventListener('click', (e) => {
  if (e.target.closest('.save-btn')) return;
  collapsePanel();
});

expandPhotoboothPanel.addEventListener('click', (e) => {
  if (e.target.closest('.save-btn')) return;
  collapsePanel();
});

// Escape key → collapse
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.expandedPanel) {
      collapsePanel();
    } else if (resultScreen.classList.contains('active')) {
      state.typingActive = false;
      showScreen(setupScreen);
    }
  }
});

function expandLetter() {
  state.expandedPanel = 'letter';

  const today = new Date();
  const day = today.getDate();
  const month = MONTHS_EN[today.getMonth()];
  const daysSince = calculateDaysTogether(state.togetherDate);
  const greeting = state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  const body = state.letterContent || 'You are the most beautiful chapter in my story.';

  // Fill expand panel
  document.getElementById('expand-letter-day').textContent = day;
  document.getElementById('expand-letter-month').textContent = `\u2014 ${month}`;

  const greetingEl = document.getElementById('expand-letter-greeting');
  const bodyEl = document.getElementById('expand-letter-body');
  const senderEl = document.getElementById('expand-letter-sender');
  const daysEl = document.getElementById('expand-letter-days');
  const senderStr = state.senderName ? `Yours, ${state.senderName}` : '';

  // Clear for typewriter
  greetingEl.textContent = '';
  bodyEl.textContent = '';
  senderEl.textContent = '';
  daysEl.textContent = '';
  daysEl.classList.remove('visible');

  // Show overlay
  expandBackdrop.classList.add('active');
  expandLetterPanel.classList.add('active');

  // Start typewriter
  startExpandedTyping(greetingEl, bodyEl, senderEl, daysEl, greeting, body, senderStr, `${daysSince} days together`);
}

function expandPhotobooth() {
  state.expandedPanel = 'photobooth';

  // Fill expand panel photos
  state.photos.forEach((photo, i) => {
    const el = document.getElementById(`expand-strip-photo-${i}`);
    if (photo) {
      el.style.backgroundImage = `url(${photo})`;
    } else {
      el.style.background = `linear-gradient(135deg, #E8E0D8 0%, #D4C8BC 100%)`;
    }
  });

  document.getElementById('expand-strip-caption').textContent =
    state.partnerName ? `${state.partnerName} & me` : 'you & me';

  // Show overlay
  expandBackdrop.classList.add('active');
  expandPhotoboothPanel.classList.add('active');
}

function collapsePanel() {
  state.typingActive = false;
  state.expandedPanel = null;

  expandBackdrop.classList.remove('active');
  expandLetterPanel.classList.remove('active');
  expandPhotoboothPanel.classList.remove('active');
}

// ============ TYPEWRITER EFFECT (in expanded letter) ============

async function startExpandedTyping(greetingEl, bodyEl, senderEl, daysEl, greeting, body, senderStr, daysStr) {
  state.typingActive = true;

  // Wait for expand animation
  await delay(500);
  if (!state.typingActive) return;

  // Type greeting
  greetingEl.classList.add('typing-cursor');
  await typeText(greetingEl, greeting, 50);
  greetingEl.classList.remove('typing-cursor');
  if (!state.typingActive) return;

  await delay(400);

  // Type body
  bodyEl.classList.add('typing-cursor');
  await typeText(bodyEl, body, 40);
  bodyEl.classList.remove('typing-cursor');
  if (!state.typingActive) return;

  // Type sender signature
  if (senderStr) {
    await delay(300);
    senderEl.classList.add('typing-cursor');
    await typeText(senderEl, senderStr, 50);
    senderEl.classList.remove('typing-cursor');
    if (!state.typingActive) return;
  }

  await delay(500);

  // Show days counter
  daysEl.textContent = daysStr;
  daysEl.classList.add('visible');

  state.letterTyped = true;
}

function typeText(element, text, baseSpeed) {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = '';

    function tick() {
      if (!state.typingActive || i >= text.length) {
        element.textContent = text;
        resolve();
        return;
      }

      element.textContent += text.charAt(i);
      playTypeClick();
      i++;

      let nextDelay = baseSpeed + Math.random() * 25 - 12;
      const char = text.charAt(i - 1);
      if (char === '.' || char === '!' || char === '?') nextDelay += 200;
      else if (char === ',') nextDelay += 100;
      else if (char === '\n') nextDelay += 150;

      setTimeout(tick, nextDelay);
    }

    tick();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ IMAGE HELPERS ============

const PAPER_COLOR = '#EAE2D3';
const CREAM = '#FFF8F0';
const INK = '#5C1018';
const MUTED = '#8C7B70';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageCover(ctx, img, x, y, w, h) {
  const ratio = Math.max(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  ctx.restore();
}

async function downloadCanvas(canvas, filename) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const toast = document.getElementById('share-toast');

  // 1) Try native share (works on mobile with HTTPS)
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      const data = { files: [file] };
      if (navigator.canShare(data)) {
        await navigator.share(data);
        return;
      }
    } catch (_) {
      // User cancelled or failed — try next method
    }
  }

  // 2) Try <a download> (works on desktop, Android Chrome)
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 3) Also open in new tab as ultimate fallback (iOS Safari ignores <a download>)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(url, '_blank');
    toast.textContent = 'Long press image to save';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  } else {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

// ============ SAVE TO IMAGE ============

const LETTER_W = 850;
const LETTER_H = 1100;
const SCALE = 3;

// SAVE — downloads letter + photobooth as separate files
document.getElementById('btn-save').addEventListener('click', async (e) => {
  e.stopPropagation();
  const letterCanvas = renderLetterCanvas();
  await downloadCanvas(letterCanvas, 'love-letter.png');
  if (state.hasPhotos) {
    const boothCanvas = await renderPhotoboothCanvas();
    await downloadCanvas(boothCanvas, 'photobooth.png');
  }
});

// Save in expanded letter
document.getElementById('expand-save-letter').addEventListener('click', async (e) => {
  e.stopPropagation();
  const canvas = renderLetterCanvas();
  await downloadCanvas(canvas, 'love-letter.png');
});

// Save in expanded photobooth
document.getElementById('expand-save-photobooth').addEventListener('click', async (e) => {
  e.stopPropagation();
  const canvas = await renderPhotoboothCanvas();
  await downloadCanvas(canvas, 'photobooth.png');
});

function renderLetterCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = LETTER_W * SCALE;
  canvas.height = LETTER_H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Paper background
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, LETTER_W, LETTER_H);

  // Subtle age vignette
  const vg = ctx.createRadialGradient(
    LETTER_W / 2, LETTER_H / 2, LETTER_W * 0.3,
    LETTER_W / 2, LETTER_H / 2, LETTER_W * 0.7
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(140,110,60,0.08)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, LETTER_W, LETTER_H);

  // Foxing spots
  for (let i = 0; i < 15; i++) {
    const fx = Math.random() * LETTER_W;
    const fy = Math.random() * LETTER_H;
    const fr = 2 + Math.random() * 8;
    ctx.fillStyle = `rgba(160,130,70,${0.02 + Math.random() * 0.04})`;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  const pad = 80;
  let y = pad;

  // Date
  ctx.font = '300 72px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  const dayText = document.getElementById('letter-day').textContent;
  ctx.fillText(dayText, pad, y);
  const dayWidth = ctx.measureText(dayText).width;

  ctx.font = '300 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(document.getElementById('letter-month').textContent, pad + dayWidth + 12, y + 42);
  y += 100;

  // Greeting
  const greeting = state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  ctx.font = '28px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK;
  ctx.fillText(greeting, pad, y);
  y += 50;

  // Body — word wrap
  const body = state.letterContent || 'You are the most beautiful chapter in my story.';
  ctx.font = '22px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK;
  const maxWidth = LETTER_W - pad * 2;
  const lineHeight = 44;
  const paragraphs = body.split('\n');

  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, pad, y);
        y += lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }
    y += 8;
  }

  // Sender signature
  if (state.senderName) {
    y += 20;
    ctx.font = 'italic 22px "Special Elite", "Courier New", monospace';
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(`Yours, ${state.senderName}`, LETTER_W - pad, y);
    ctx.textAlign = 'left';
    y += lineHeight;
  }

  // Days counter
  const daysSince = calculateDaysTogether(state.togetherDate);
  const daysText = `${daysSince} days together`;
  ctx.font = '16px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  ctx.fillText(daysText, LETTER_W - pad, LETTER_H - pad);
  ctx.textAlign = 'left';

  return canvas;
}

async function renderPhotoboothCanvas() {
  // 2×6 inch strip at 300dpi = 600×1800 pixels
  const DPI = 300;
  const STRIP_W = 2 * DPI;   // 600
  const STRIP_H = 6 * DPI;   // 1800
  const PAD = 30;
  const PHOTO_W = STRIP_W - PAD * 2;  // 540
  const PHOTO_H = Math.round(PHOTO_W * 3 / 4); // 405
  const GAP = 12;
  const HEADER_H = 60;
  const FOOTER_H = 120;
  const PHOTOS_TOP = HEADER_H;

  const canvas = document.createElement('canvas');
  canvas.width = STRIP_W;
  canvas.height = STRIP_H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);

  // Header
  ctx.font = '12px "Special Elite", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('P H O T O   B O O T H', STRIP_W / 2, 24);

  // Photos (4 photos, B&W)
  let y = PHOTOS_TOP;
  for (let i = 0; i < 4; i++) {
    if (state.photos[i]) {
      try {
        const img = await loadImage(state.photos[i]);
        const tmp = document.createElement('canvas');
        tmp.width = PHOTO_W;
        tmp.height = PHOTO_H;
        const tc = tmp.getContext('2d');
        tc.filter = 'grayscale(100%) contrast(1.1) brightness(1.05)';
        drawImageCover(tc, img, 0, 0, PHOTO_W, PHOTO_H);
        ctx.drawImage(tmp, PAD, y, PHOTO_W, PHOTO_H);
      } catch (_) {
        ctx.fillStyle = '#F5EDE0';
        ctx.fillRect(PAD, y, PHOTO_W, PHOTO_H);
      }
    } else {
      ctx.fillStyle = '#F5EDE0';
      ctx.fillRect(PAD, y, PHOTO_W, PHOTO_H);
    }
    y += PHOTO_H + GAP;
  }

  // Footer: names + logo
  const footerY = y + 10;
  ctx.font = '16px "Special Elite", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  const caption = (state.partnerName && state.senderName)
    ? `${state.partnerName} & ${state.senderName}`
    : state.partnerName ? `${state.partnerName} & me` : 'you & me';
  ctx.fillText(caption, STRIP_W / 2, footerY);

  // Logo
  ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = INK;
  ctx.fillText('Lover Letter', STRIP_W / 2, footerY + 30);

  // Days
  const daysSince = calculateDaysTogether(state.togetherDate);
  ctx.font = '10px "Special Elite", monospace';
  ctx.fillStyle = MUTED;
  ctx.fillText(`${daysSince} days of love`, STRIP_W / 2, footerY + 58);

  return canvas;
}

// ============ SHARE — website URL only ============

document.getElementById('btn-share').addEventListener('click', async (e) => {
  e.stopPropagation();
  const toast = document.getElementById('share-toast');
  const siteUrl = window.location.origin + window.location.pathname;

  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Lover Letter', url: siteUrl });
      return;
    } catch (_) {}
  }

  // Fallback: copy URL
  try {
    await navigator.clipboard.writeText(siteUrl);
    toast.textContent = 'Link copied';
  } catch (_) {
    toast.textContent = siteUrl;
  }
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2200);
});

// ============ SEND — composite letter + photobooth to recipient ============

document.getElementById('btn-send').addEventListener('click', async (e) => {
  e.stopPropagation();
  const toast = document.getElementById('share-toast');

  const letterCanvas = renderLetterCanvas();
  let boothCanvas = null;
  if (state.hasPhotos) {
    boothCanvas = await renderPhotoboothCanvas();
  }

  const composite = createCompositeImage(letterCanvas, boothCanvas);
  const blob = await new Promise(r => composite.toBlob(r, 'image/png'));

  // Try native share with image (mobile)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], 'lover-letter.png', { type: 'image/png' });
    const data = { files: [file], title: 'Lover Letter' };
    if (navigator.canShare(data)) {
      try {
        await navigator.share(data);
        return;
      } catch (_) {}
    }
  }

  // Fallback: download composite
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'lover-letter.png';
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.open(url, '_blank');
    toast.textContent = 'Long press image to save & send';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3000);
  } else {
    toast.textContent = 'Image saved — send it to them!';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
});

function createCompositeImage(letterCanvas, boothCanvas) {
  const MARGIN = 40;
  const composite = document.createElement('canvas');

  if (!boothCanvas) {
    const w = letterCanvas.width / SCALE + MARGIN * 2;
    const h = letterCanvas.height / SCALE + MARGIN * 2;
    composite.width = w * SCALE;
    composite.height = h * SCALE;
    const ctx = composite.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#6B1525';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(letterCanvas, 0, 0, letterCanvas.width, letterCanvas.height,
      MARGIN, MARGIN, letterCanvas.width / SCALE, letterCanvas.height / SCALE);
    return composite;
  }

  // Letter + photobooth flat-lay
  const lw = letterCanvas.width / SCALE;
  const lh = letterCanvas.height / SCALE;
  const bw = boothCanvas.width / SCALE;
  const bh = boothCanvas.height / SCALE;

  const boothScale = Math.min(lh * 0.7 / bh, (lw * 0.5) / bw);
  const sbw = bw * boothScale;
  const sbh = bh * boothScale;

  const totalW = lw + sbw + MARGIN * 3;
  const totalH = Math.max(lh, sbh) + MARGIN * 2;

  composite.width = totalW * SCALE;
  composite.height = totalH * SCALE;
  const ctx = composite.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Maroon background
  ctx.fillStyle = '#6B1525';
  ctx.fillRect(0, 0, totalW, totalH);

  // Letter — left side
  ctx.save();
  ctx.translate(MARGIN + lw / 2, MARGIN + lh / 2);
  ctx.rotate(-0.01);
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(letterCanvas, 0, 0, letterCanvas.width, letterCanvas.height,
    -lw / 2, -lh / 2, lw, lh);
  ctx.restore();

  // Booth — right side
  ctx.save();
  const bx = MARGIN * 2 + lw + sbw / 2;
  const by = totalH / 2;
  ctx.translate(bx, by);
  ctx.rotate(0.03);
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  ctx.drawImage(boothCanvas, 0, 0, boothCanvas.width, boothCanvas.height,
    -sbw / 2, -sbh / 2, sbw, sbh);
  ctx.restore();

  return composite;
}

// ============ NAVIGATION ============

function showScreen(screen) {
  setupScreen.classList.remove('active');
  resultScreen.classList.remove('active');
  screen.classList.add('active');
}

backBtn.addEventListener('click', () => {
  if (state.expandedPanel) {
    collapsePanel();
    return;
  }
  state.typingActive = false;
  flatlayActions.classList.remove('visible');
  showScreen(setupScreen);
});

// ============ LOAD FROM SHARE LINK ============

function decodeShareData(hash) {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

(function checkShareLink() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const data = decodeShareData(hash);
  if (!data) return;

  if (data.n) {
    document.getElementById('partner-name').value = data.n;
    state.partnerName = data.n;
  }
  if (data.s) {
    document.getElementById('sender-name').value = data.s;
    state.senderName = data.s;
  }
  if (data.d) {
    document.getElementById('together-date').value = data.d;
    state.togetherDate = new Date(data.d + 'T00:00:00');
  }
  if (data.l) {
    document.getElementById('letter-content').value = data.l;
    state.letterContent = data.l;
  }

  state.hasPhotos = false;
  renderResult();
  showScreen(resultScreen);
})();
