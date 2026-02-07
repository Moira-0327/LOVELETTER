/* ============================================
   LOVE LETTER — Main Application
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
const photoInput = document.getElementById('photo-input-multi');
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
// Web Audio (fast) + HTML Audio fallback (works without secure context)

let audioCtx = null;
let clickBuffer = null;
let audioReady = false;
let fallbackAudio = null; // single HTML Audio element as fallback

function initAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sr = audioCtx.sampleRate;
    const len = Math.floor(sr * 0.03);
    const buf = audioCtx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 150);
      d[i] = (Math.sin(t * 600 * 6.283) * 0.4 + (Math.random() - 0.5) * 0.15) * env * 0.1;
    }
    clickBuffer = buf;
  } catch (_) {}

  // HTML Audio fallback: generate a tiny WAV click
  if (!fallbackAudio) {
    try {
      const sr2 = 22050, dur = 0.03, n = Math.floor(sr2 * dur);
      const ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      ws(0,'RIFF'); v.setUint32(4,36+n*2,true); ws(8,'WAVE'); ws(12,'fmt ');
      v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
      v.setUint32(24,sr2,true); v.setUint32(28,sr2*2,true); v.setUint16(32,2,true);
      v.setUint16(34,16,true); ws(36,'data'); v.setUint32(40,n*2,true);
      for (let i = 0; i < n; i++) {
        const t = i / sr2;
        const s = Math.sin(t * 600 * 6.283) * 0.3 * Math.exp(-t * 150);
        v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
      }
      fallbackAudio = new Audio(URL.createObjectURL(new Blob([ab], { type: 'audio/wav' })));
      fallbackAudio.volume = 0.15;
    } catch (_) {}
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = initAudio();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => { audioReady = true; });
    } else {
      audioReady = true;
    }
    // Play near-silent buffer to activate iOS audio pipeline
    if (clickBuffer) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = clickBuffer;
        const g = ctx.createGain();
        g.gain.value = 0.001;
        src.connect(g); g.connect(ctx.destination); src.start();
      } catch (_) {}
    }
  }
  // Also unlock HTML Audio fallback
  if (fallbackAudio) fallbackAudio.play().then(() => { fallbackAudio.pause(); fallbackAudio.currentTime = 0; }).catch(() => {});
}
document.addEventListener('touchend', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);

function playTypeClick() {
  if (!audioCtx || !clickBuffer) { initAudio(); return; }
  // Try Web Audio first (lowest latency)
  if (audioReady && audioCtx.state === 'running') {
    try {
      const src = audioCtx.createBufferSource();
      src.buffer = clickBuffer;
      src.connect(audioCtx.destination);
      src.start();
      return;
    } catch (_) {}
  }
  // Fallback: HTML Audio (works without secure context)
  if (fallbackAudio) {
    try { fallbackAudio.currentTime = 0; fallbackAudio.play().catch(() => {}); } catch (_) {}
  }
  // Try to resume suspended context for next time
  if (audioCtx.state === 'suspended') audioCtx.resume().then(() => { audioReady = true; });
}

// ============ INIT ============

// Toggle has-value class on date input for placeholder styling
const dateInput = document.getElementById('together-date');
dateInput.addEventListener('change', () => {
  dateInput.classList.toggle('has-value', !!dateInput.value);
});

generatePaperGrain();

// Initialize audio context on first user interaction
let audioInitialized = false;
document.addEventListener('click', () => {
  if (!audioInitialized) {
    try {
      const ctx = initAudio();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      audioInitialized = true;
    } catch (_) {}
  }
}, { once: false });

// ============ PAPER GRAIN TEXTURE ============

function generatePaperGrain() {
  const canvas = document.createElement('canvas');
  const size = 200; // smaller = faster
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Pixel noise only — lightweight
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = 190 + Math.random() * 40;
    imageData.data[i] = v;
    imageData.data[i + 1] = v * 0.93;
    imageData.data[i + 2] = v * 0.82;
    imageData.data[i + 3] = 14;
  }
  ctx.putImageData(imageData, 0, 0);

  // A few foxing spots
  for (let s = 0; s < 12; s++) {
    ctx.fillStyle = `rgba(150,120,70,${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0, 6.283);
    ctx.fill();
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

// ============ PHOTO UPLOAD (4-slot grid, multi-select) ============

function updateSlotUI(index) {
  const slot = photoSlots[index];
  const preview = slot.querySelector('.photo-preview');
  if (state.photos[index]) {
    preview.src = state.photos[index];
    slot.classList.add('filled');
  } else {
    preview.src = '';
    slot.classList.remove('filled');
  }
}

function renderAllSlots() {
  for (let i = 0; i < 4; i++) updateSlotUI(i);
}

// Clicking an empty slot opens the file picker to fill empty slots
// Clicking a filled slot clears that photo
photoSlots.forEach((slot, i) => {
  slot.addEventListener('click', () => {
    if (state.photos[i]) {
      // Clear this slot
      state.photos[i] = null;
      updateSlotUI(i);
    } else {
      // Open file picker — photos will fill empty slots in order
      photoInput.click();
    }
  });
});

photoInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);

  // Pre-collect empty slot indices synchronously so each file gets a unique slot
  const emptySlots = [];
  for (let i = 0; i < 4; i++) {
    if (state.photos[i] === null) emptySlots.push(i);
  }
  const allowed = Math.min(files.length, emptySlots.length);

  for (let i = 0; i < allowed; i++) {
    const reader = new FileReader();
    const slotIndex = emptySlots[i];
    reader.onload = (ev) => {
      state.photos[slotIndex] = ev.target.result;
      updateSlotUI(slotIndex);
    };
    reader.readAsDataURL(files[i]);
  }
  photoInput.value = '';
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

  // --- Postmark stamp date ---
  const stampDate = `${month.toUpperCase().slice(0, 3)} ${day}, '${String(today.getFullYear()).slice(2)}`;
  const stampEl = document.getElementById('stamp-date');
  if (stampEl) stampEl.textContent = stampDate;

  // --- Flat-lay letter thumbnail (static text, no typewriter) ---
  const greeting = state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  const body = state.letterContent || 'You are the most beautiful chapter in my story.';

  document.getElementById('letter-greeting').textContent = greeting;
  document.getElementById('letter-body').textContent = body;
  document.getElementById('letter-sender').textContent = state.senderName ? `Yours, ${state.senderName}` : '';
  const hours = String(today.getHours()).padStart(2, '0');
  const mins = String(today.getMinutes()).padStart(2, '0');
  const sealTimeStr = `sealed at ${hours}:${mins}`;
  document.getElementById('letter-seal-date').textContent = sealTimeStr;
  document.getElementById('letter-seal-date').classList.add('visible');
  document.getElementById('days-stamp').innerHTML = stampHTML(daysSince);
  document.getElementById('days-stamp').classList.add('visible');

  // --- Photobooth strip ---
  if (state.hasPhotos) {
    photoboothStrip.style.display = '';
    // Header: today's date
    const stripDateStr = `${month.toUpperCase().slice(0, 3)} ${day}, ${today.getFullYear()}`;
    document.getElementById('strip-date').textContent = stripDateStr;
    // Footer: sender & receiver names (red)
    const namesStr = (state.partnerName && state.senderName)
      ? `${state.senderName} & ${state.partnerName}`
      : state.partnerName ? `me & ${state.partnerName}` : 'you & me';
    document.getElementById('strip-caption').textContent = namesStr;

    state.photos.forEach((photo, i) => {
      const el = document.getElementById(`strip-photo-${i}`);
      if (photo) {
        el.style.backgroundImage = `url(${photo})`;
      } else {
        el.style.backgroundImage = `linear-gradient(135deg, #E8E0D8 0%, #D4C8BC 100%)`;
      }
    });

  } else {
    photoboothStrip.style.display = 'none';
  }

  // Show Save/Share buttons after a short delay
  state.letterTyped = false;
  setTimeout(() => {
    flatlayActions.classList.add('visible');
  }, 1200);
}

function stampHTML(days) {
  return `<svg class="rect-stamp-svg" viewBox="0 0 170 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.7" transform="rotate(-1.5 85 45)">
      <rect x="2" y="2" width="166" height="86" rx="1" stroke="currentColor" stroke-width="2.5"/>
      <rect x="8" y="8" width="154" height="74" rx="1" stroke="currentColor" stroke-width="1"/>
      <text x="85" y="24" text-anchor="middle" font-family="'DM Sans',sans-serif" font-size="12" font-weight="500" letter-spacing="2" fill="currentColor">${days} DAYS</text>
      <line x1="16" y1="45" x2="58" y2="45" stroke="currentColor" stroke-width="1" opacity="0.6"/>
      <line x1="112" y1="45" x2="154" y2="45" stroke="currentColor" stroke-width="1" opacity="0.6"/>
      <text x="85" y="49" text-anchor="middle" font-family="'Playfair Display',Georgia,serif" font-size="17" font-weight="600" letter-spacing="2" fill="currentColor">LOVE</text>
      <text x="85" y="73" text-anchor="middle" font-family="'DM Sans',sans-serif" font-size="12" font-weight="500" letter-spacing="3" fill="currentColor">OF US</text>
    </g>
  </svg>`;
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
  const expandStamp = document.getElementById('expand-stamp-date');
  if (expandStamp) expandStamp.textContent = `${month.toUpperCase().slice(0, 3)} ${day}, '${String(today.getFullYear()).slice(2)}`;

  const greetingEl = document.getElementById('expand-letter-greeting');
  const bodyEl = document.getElementById('expand-letter-body');
  const senderEl = document.getElementById('expand-letter-sender');
  const sealDateEl = document.getElementById('expand-letter-seal-date');
  const senderStr = state.senderName ? `Yours, ${state.senderName}` : '';
  const hours = String(today.getHours()).padStart(2, '0');
  const mins = String(today.getMinutes()).padStart(2, '0');
  const sealStr = `sealed at ${hours}:${mins}`;

  // Populate stamp in expanded letter
  const expandStampEl = document.getElementById('expand-days-stamp');
  expandStampEl.innerHTML = stampHTML(daysSince);
  expandStampEl.classList.add('visible');

  // Clear for typewriter
  greetingEl.textContent = '';
  bodyEl.textContent = '';
  senderEl.textContent = '';
  sealDateEl.textContent = '';
  sealDateEl.classList.remove('visible');

  // Show overlay
  expandBackdrop.classList.add('active');
  expandLetterPanel.classList.add('active');

  // Start typewriter
  startExpandedTyping(greetingEl, bodyEl, senderEl, sealDateEl, greeting, body, senderStr, sealStr);
}

function expandPhotobooth() {
  state.expandedPanel = 'photobooth';

  // Header: today's date
  const today = new Date();
  const day = today.getDate();
  const month = MONTHS_EN[today.getMonth()];
  const expandDateStr = `${month.toUpperCase().slice(0, 3)} ${day}, ${today.getFullYear()}`;
  document.getElementById('expand-strip-date').textContent = expandDateStr;

  // Footer: sender & receiver names
  const namesStr = (state.partnerName && state.senderName)
    ? `${state.senderName} & ${state.partnerName}`
    : state.partnerName ? `me & ${state.partnerName}` : 'you & me';
  document.getElementById('expand-strip-caption').textContent = namesStr;

  // Fill expand panel photos
  state.photos.forEach((photo, i) => {
    const el = document.getElementById(`expand-strip-photo-${i}`);
    if (photo) {
      el.style.backgroundImage = `url(${photo})`;
    } else {
      el.style.backgroundImage = `linear-gradient(135deg, #E8E0D8 0%, #D4C8BC 100%)`;
    }
  });

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

async function startExpandedTyping(greetingEl, bodyEl, senderEl, sealDateEl, greeting, body, senderStr, sealStr) {
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

  await delay(300);

  // Show seal date
  sealDateEl.textContent = sealStr;
  sealDateEl.classList.add('visible');

  state.letterTyped = true;
}

function typeText(element, text, baseSpeed) {
  return new Promise((resolve) => {
    let i = 0;
    let nextTime = 0;
    element.textContent = '';

    function tick(now) {
      if (!state.typingActive || i >= text.length) {
        element.textContent = text;
        resolve();
        return;
      }

      if (now >= nextTime) {
        element.textContent += text.charAt(i);
        playTypeClick();

        const char = text.charAt(i);
        let gap = baseSpeed + Math.random() * 20 - 10;
        if (char === '.' || char === '!' || char === '?') gap += 180;
        else if (char === ',') gap += 80;
        else if (char === '\n') gap += 120;
        nextTime = now + gap;
        i++;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ IMAGE HELPERS ============

import paperTextureUrl from './paper-texture.png';
const paperTextureImg = new Image();
paperTextureImg.src = paperTextureUrl;

const PAPER_COLOR = '#E2D9CC';
const CREAM = '#FFF8F0';
const INK = '#C0392B';
const MUTED = '#8A7A76';
const ACCENT = '#C0392B';
const ACCENT_DEEP = '#961C14';
const ACCENT_MUTED = '#D4817A';

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
  e.preventDefault();
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
  e.preventDefault();
  e.stopPropagation();
  const canvas = renderLetterCanvas();
  await downloadCanvas(canvas, 'love-letter.png');
});

// Save in expanded photobooth
document.getElementById('expand-save-photobooth').addEventListener('click', async (e) => {
  e.preventDefault();
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

  // Paper background — texture tile or fallback color
  if (paperTextureImg.complete && paperTextureImg.naturalWidth) {
    const pat = ctx.createPattern(paperTextureImg, 'repeat');
    ctx.fillStyle = pat;
  } else {
    ctx.fillStyle = PAPER_COLOR;
  }
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
  let y = 170;  // below postmark stamp

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
    ctx.font = '22px "Special Elite", "Courier New", monospace';
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(`Yours, ${state.senderName}`, LETTER_W - pad, y);
    ctx.textAlign = 'left';
    y += 36;
  }

  // Seal time below signature (24h format)
  const now2 = new Date();
  const sealHours = String(now2.getHours()).padStart(2, '0');
  const sealMins = String(now2.getMinutes()).padStart(2, '0');
  const sealText = `SEALED AT ${sealHours}:${sealMins}`;
  ctx.font = '14px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText(sealText, LETTER_W - pad, y);
  ctx.textAlign = 'left';

  // Days counter — rectangular ink stamp style
  const STAMP_COLOR = '#165dad';
  const daysSince = calculateDaysTogether(state.togetherDate);
  const rW = 170, rH = 90;
  const rX = LETTER_W - pad - rW - 5;
  const rY = LETTER_H - pad - rH - 5;

  ctx.save();
  ctx.translate(rX + rW / 2, rY + rH / 2);
  ctx.rotate(-0.06);
  ctx.translate(-(rX + rW / 2), -(rY + rH / 2));

  // Ink bleed effect — multiple offset strokes at low alpha
  ctx.strokeStyle = STAMP_COLOR;
  ctx.fillStyle = STAMP_COLOR;
  for (let pass = 0; pass < 3; pass++) {
    const ox = (Math.random() - 0.5) * 1.2;
    const oy = (Math.random() - 0.5) * 1.2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = pass === 0 ? 0.65 : 0.12;

    // Outer rectangle
    ctx.lineWidth = 2.5;
    ctx.strokeRect(rX, rY, rW, rH);
    // Inner rectangle
    ctx.lineWidth = 1;
    ctx.strokeRect(rX + 6, rY + 6, rW - 12, rH - 12);

    ctx.restore();
  }

  // Text content with ink bleed
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = STAMP_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = rX + rW / 2;
  const cy = rY + rH / 2;

  // Top text: "xxx DAYS"
  ctx.font = '500 12px "DM Sans", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(`${daysSince} DAYS`, cx, rY + 20);
  ctx.letterSpacing = '0px';

  // Horizontal divider lines
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(rX + 12, cy); ctx.lineTo(cx - 26, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 26, cy); ctx.lineTo(rX + rW - 12, cy); ctx.stroke();

  // Center: "LOVE"
  ctx.globalAlpha = 0.7;
  ctx.font = '600 17px "Playfair Display", Georgia, serif';
  ctx.fillText('LOVE', cx, cy);

  // Bottom text: "OF US"
  ctx.font = '500 12px "DM Sans", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('OF US', cx, rY + rH - 20);
  ctx.letterSpacing = '0px';

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.restore();

  // Postmark stamp (top-right, enlarged deep red)
  const stampX = LETTER_W - pad - 55;
  const stampY = pad + 15;
  const stampR = 55;
  ctx.save();
  ctx.translate(stampX, stampY);
  ctx.rotate(0.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, stampR, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, stampR - 7, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-stampR - 6, 0); ctx.lineTo(-stampR, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(stampR, 0); ctx.lineTo(stampR + 6, 0); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '400 8px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LOVE LETTER', 0, -16);
  const now = new Date();
  const stampStr = `${MONTHS_EN[now.getMonth()].toUpperCase().slice(0, 3)} ${now.getDate()}, '${String(now.getFullYear()).slice(2)}`;
  ctx.font = '500 12px "DM Sans", sans-serif';
  ctx.fillText(stampStr, 0, 2);
  ctx.font = '300 7px "DM Sans", sans-serif';
  ctx.fillText('NEW YORK, NY', 0, 18);
  ctx.restore();

  return canvas;
}

async function renderPhotoboothCanvas() {
  const DPI = 300;
  const STRIP_W = 2 * DPI;   // 600
  const PAD = 30;
  const PHOTO_W = STRIP_W - PAD * 2;  // 540
  const PHOTO_H = Math.round(PHOTO_W * 3 / 4); // 405
  const GAP = 12;
  const TEXT_H = 36;          // space for header/footer text
  const STRIP_H = PAD + TEXT_H + PHOTO_H * 4 + GAP * 3 + TEXT_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = STRIP_W;
  canvas.height = STRIP_H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = ACCENT_DEEP;
  ctx.fillRect(0, 0, STRIP_W, STRIP_H);

  // Header: today's date
  const now = new Date();
  const dateStr = `${MONTHS_EN[now.getMonth()].toUpperCase().slice(0, 3)} ${now.getDate()}, ${now.getFullYear()}`;
  ctx.font = '400 11px "DM Sans", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#FDF6F2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dateStr, STRIP_W / 2, PAD + TEXT_H / 2);

  // Photos (4 photos, B&W film effect)
  let y = PAD + TEXT_H;
  for (let i = 0; i < 4; i++) {
    if (state.photos[i]) {
      try {
        const img = await loadImage(state.photos[i]);
        const tmp = document.createElement('canvas');
        tmp.width = PHOTO_W;
        tmp.height = PHOTO_H;
        const tc = tmp.getContext('2d');
        drawImageCover(tc, img, 0, 0, PHOTO_W, PHOTO_H);

        // Manual B&W conversion (canvas filter not supported in all browsers)
        const imgData = tc.getImageData(0, 0, PHOTO_W, PHOTO_H);
        const px = imgData.data;
        for (let p = 0; p < px.length; p += 4) {
          const gray = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
          // contrast(1.15) + brightness(1.0)
          const val = Math.max(0, Math.min(255, ((gray - 128) * 1.15 + 128)));
          px[p] = px[p + 1] = px[p + 2] = val;
        }
        tc.putImageData(imgData, 0, 0);

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

  // Footer: sender & receiver names (red)
  const namesStr = (state.partnerName && state.senderName)
    ? `${state.senderName} & ${state.partnerName}`
    : state.partnerName ? `me & ${state.partnerName}` : 'you & me';
  ctx.font = '400 12px "DM Sans", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#FDF6F2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(namesStr.toUpperCase(), STRIP_W / 2, y - GAP + TEXT_H / 2);

  return canvas;
}

// ============ SHARE — website URL only ============

document.getElementById('btn-share').addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const toast = document.getElementById('share-toast');
  const siteUrl = window.location.origin + window.location.pathname;

  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Love Letter', url: siteUrl });
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
    const data = { files: [file], title: 'Love Letter' };
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
    ctx.fillStyle = ACCENT;
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
  ctx.fillStyle = ACCENT_DEEP;
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
