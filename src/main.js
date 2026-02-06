/* ============================================
   LOVER LETTER — Main Application Logic
   Original 3-page layout + typewriter effect,
   optional photobooth, save-to-image
   ============================================ */

const MONTHS_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// ============ STATE ============

const state = {
  partnerName: '',
  togetherDate: null,
  letterContent: '',
  photos: [null, null, null, null],
  typingActive: false,
  hasPhotos: false,
  activePages: [],   // which page elements are active
};

// ============ DOM ============

const setupScreen = document.getElementById('setup-screen');
const resultScreen = document.getElementById('result-screen');
const setupForm = document.getElementById('setup-form');
const photoSlots = document.querySelectorAll('.photo-upload-slot');
const backBtn = document.getElementById('back-btn');
const pageNav = document.getElementById('page-nav');

const pageLetter = document.getElementById('page-letter');
const pagePhotobooth = document.getElementById('page-photobooth');

let currentPage = 0;
let pages = [];
let navDots = [];

// ============ TYPEWRITER SOUND (Web Audio API) ============

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTypeClick() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // Short percussive click — simulates typewriter key strike
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Noise-like click via high-frequency square wave
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800 + Math.random() * 600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.Q.setValueAtTime(0.8, t);

    gain.gain.setValueAtTime(0.03 + Math.random() * 0.015, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  } catch (_) {
    // Silently ignore audio errors
  }
}

// ============ INIT ============

generatePaperGrain();

// ============ PAPER GRAIN TEXTURE (aged vintage paper) ============

function generatePaperGrain() {
  const canvas = document.createElement('canvas');
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base: warm aged pixel noise
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = 190 + Math.random() * 40;
    imageData.data[i] = v;
    imageData.data[i + 1] = v * 0.93;
    imageData.data[i + 2] = v * 0.82;
    imageData.data[i + 3] = 15;
  }
  ctx.putImageData(imageData, 0, 0);

  // Subtle fiber lines (horizontal)
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

  // Foxing spots — larger age marks
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

  // Tiny dark speckles
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

document.querySelectorAll('#setup-form input[type="text"], #setup-form textarea').forEach(el => {
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
  const dateStr = document.getElementById('together-date').value;
  state.togetherDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  state.letterContent = document.getElementById('letter-content').value.trim();
  state.hasPhotos = state.photos.some(p => p !== null);

  renderResult();
  showScreen(resultScreen);
});

// ============ RENDER RESULT ============

function renderResult() {
  const today = new Date();
  const day = today.getDate();
  const month = MONTHS_EN[today.getMonth()];
  const year = today.getFullYear();
  const daysSince = calculateDaysTogether(state.togetherDate);

  // --- Page 1: Love Letter (always shown) ---
  document.getElementById('letter-day').textContent = day;
  document.getElementById('letter-month').textContent = `\u2014 ${month}`;

  // Clear text — typewriter will fill these
  document.getElementById('letter-greeting').textContent = '';
  document.getElementById('letter-body').textContent = '';
  document.getElementById('letter-days').textContent = '';
  document.getElementById('letter-days').classList.remove('visible');
  document.getElementById('letter-actions').classList.add('hidden');

  // --- Page 2: Photo Booth (only if photos uploaded) ---
  if (state.hasPhotos) {
    state.photos.forEach((photo, i) => {
      const el = document.getElementById(`strip-photo-${i}`);
      if (photo) {
        el.style.backgroundImage = `url(${photo})`;
      } else {
        el.style.background = `linear-gradient(135deg, #E8E0D8 0%, #D4C8BC 100%)`;
      }
    });

    document.getElementById('strip-caption').textContent =
      state.partnerName ? `${state.partnerName} & me` : 'you & me';

    document.getElementById('photobooth-text').textContent =
      `${daysSince} days of love`;
  }

  // --- Build active pages array ---
  buildActivePages();
  showPage(0);

  // Start typewriter on first page (letter)
  startLetterTyping();
}

function calculateDaysTogether(startDate) {
  const now = new Date();
  const diffMs = now - startDate;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// ============ DYNAMIC PAGE MANAGEMENT ============

function buildActivePages() {
  // Letter always shown. Photobooth only if photos uploaded.
  pages = [pageLetter];
  if (state.hasPhotos) {
    pagePhotobooth.style.display = '';
    pages.push(pagePhotobooth);
  } else {
    pagePhotobooth.style.display = 'none';
  }

  // Build nav dots
  pageNav.innerHTML = '';
  navDots = [];
  pages.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'nav-dot';
    dot.dataset.page = i;
    dot.addEventListener('click', () => {
      showPage(i);
      if (i === 0) startLetterTyping();
    });
    pageNav.appendChild(dot);
    navDots.push(dot);
  });
}

// ============ TYPEWRITER EFFECT ============

async function startLetterTyping() {
  state.typingActive = true;

  const greetingEl = document.getElementById('letter-greeting');
  const bodyEl = document.getElementById('letter-body');
  const daysEl = document.getElementById('letter-days');
  const actionsEl = document.getElementById('letter-actions');

  const greeting = state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  const body = state.letterContent || 'You are the most beautiful chapter in my story.';
  const daysSince = calculateDaysTogether(state.togetherDate);
  const daysStr = `${daysSince} days together`;

  // Reset
  greetingEl.textContent = '';
  greetingEl.classList.remove('typing-cursor');
  bodyEl.textContent = '';
  bodyEl.classList.remove('typing-cursor');
  daysEl.textContent = '';
  daysEl.classList.remove('visible');
  actionsEl.classList.add('hidden');

  // Wait for paper animation
  await delay(900);
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

  await delay(500);

  // Show days counter (fade in)
  daysEl.textContent = daysStr;
  daysEl.classList.add('visible');

  // Show save & share buttons
  actionsEl.classList.remove('hidden');
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

const PAPER_COLOR = '#E8D4A8';
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

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ============ SAVE TO IMAGE ============

// US Letter proportions
const LETTER_W = 850;
const LETTER_H = 1100;
const SCALE = 3;

document.getElementById('save-letter').addEventListener('click', () => {
  const canvas = renderLetterCanvas();
  downloadCanvas(canvas, 'love-letter.png');
});

document.getElementById('save-photobooth').addEventListener('click', async () => {
  const canvas = await renderPhotoboothCanvas();
  downloadCanvas(canvas, 'photobooth.png');
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
  ctx.fillText(document.getElementById('letter-day').textContent, pad, y);
  const dayWidth = ctx.measureText(document.getElementById('letter-day').textContent).width;

  ctx.font = '300 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(document.getElementById('letter-month').textContent, pad + dayWidth + 12, y + 42);
  y += 100;

  // Greeting
  ctx.font = '28px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK;
  ctx.fillText(document.getElementById('letter-greeting').textContent, pad, y);
  y += 50;

  // Body — word wrap
  ctx.font = '22px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = INK;
  const maxWidth = LETTER_W - pad * 2;
  const lineHeight = 44;
  const bodyText = document.getElementById('letter-body').textContent;
  const paragraphs = bodyText.split('\n');

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
    y += 8; // paragraph gap
  }

  // Days counter — bottom right
  ctx.font = '16px "Special Elite", "Courier New", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'right';
  const daysText = document.getElementById('letter-days').textContent;
  ctx.fillText(daysText, LETTER_W - pad, LETTER_H - pad);
  ctx.textAlign = 'left';

  return canvas;
}

async function renderPhotoboothCanvas() {
  const W = 440;
  const PAD = 24;
  const PHOTO_W = W - PAD * 2;
  const PHOTO_H = Math.round(PHOTO_W * 3 / 4);
  const GAP = 6;
  const HEADER_Y = 32;
  const PHOTOS_TOP = 52;
  const H = PHOTOS_TOP + (PHOTO_H + GAP) * 4 - GAP + 50;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.font = '9px "Special Elite", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('P H O T O   B O O T H', W / 2, 16);

  // Photos
  let y = PHOTOS_TOP;
  for (let i = 0; i < 4; i++) {
    if (state.photos[i]) {
      try {
        const img = await loadImage(state.photos[i]);

        // Draw grayscale by drawing to temp canvas with filter
        const tmp = document.createElement('canvas');
        tmp.width = PHOTO_W * SCALE;
        tmp.height = PHOTO_H * SCALE;
        const tc = tmp.getContext('2d');
        tc.scale(SCALE, SCALE);
        tc.filter = 'grayscale(100%) contrast(1.1) brightness(1.05)';
        drawImageCover(tc, img, 0, 0, PHOTO_W, PHOTO_H);

        ctx.drawImage(tmp, PAD * SCALE, y * SCALE, PHOTO_W * SCALE, PHOTO_H * SCALE,
          PAD, y, PHOTO_W, PHOTO_H);
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

  // Caption
  ctx.font = '12px "Special Elite", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'center';
  const caption = state.partnerName ? `${state.partnerName} & me` : 'you & me';
  ctx.fillText(caption, W / 2, y + 16);

  return canvas;
}

// ============ SHARE — composite image ============

document.getElementById('share-letter').addEventListener('click', shareAll);

async function shareAll() {
  const toast = document.getElementById('share-toast');

  // Generate letter canvas
  const letterCanvas = renderLetterCanvas();

  // Generate photobooth canvas if photos exist
  let boothCanvas = null;
  if (state.hasPhotos) {
    boothCanvas = await renderPhotoboothCanvas();
  }

  // Composite: maroon background, letter + booth side by side or stacked
  const composite = createCompositeImage(letterCanvas, boothCanvas);
  const blob = await new Promise(r => composite.toBlob(r, 'image/png'));

  // Build share URL
  const shareData = {
    n: state.partnerName,
    d: document.getElementById('together-date').value,
    l: state.letterContent,
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
  const shareUrl = `${window.location.origin}${window.location.pathname}#${encoded}`;

  // Try native Web Share API (mobile)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], 'lover-letter.png', { type: 'image/png' });
    const data = { files: [file], title: 'Lover Letter', url: shareUrl };

    if (navigator.canShare(data)) {
      try {
        await navigator.share(data);
        return; // shared successfully
      } catch (_) {
        // User cancelled or share failed — fall through to download
      }
    }
  }

  // Fallback: download image + copy link
  const link = document.createElement('a');
  link.download = 'lover-letter.png';
  link.href = composite.toDataURL('image/png');
  link.click();

  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.textContent = 'Image saved & link copied';
  } catch (_) {
    toast.textContent = 'Image saved';
  }
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.textContent = 'Link copied';
  }, 2200);
}

function createCompositeImage(letterCanvas, boothCanvas) {
  const MARGIN = 40;
  const composite = document.createElement('canvas');

  if (!boothCanvas) {
    // Just letter with maroon border
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

  // Letter + photobooth — flat lay composition
  const lw = letterCanvas.width / SCALE;
  const lh = letterCanvas.height / SCALE;
  const bw = boothCanvas.width / SCALE;
  const bh = boothCanvas.height / SCALE;

  // Scale booth to fit beside letter
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

  // Letter — left side, slight rotation
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

  // Booth strip — right side, slight rotation
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

function showPage(index) {
  const allPages = [pageLetter, pagePhotobooth];
  allPages.forEach(p => p.classList.remove('active', 'exit-left'));

  pages.forEach((page, i) => {
    if (i < index) {
      page.classList.add('exit-left');
    } else if (i === index) {
      page.classList.add('active');
    }
  });

  navDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });

  currentPage = index;

  // Adjust nav dot color for dark backgrounds (photobooth page)
  const isDark = pages[index] === pagePhotobooth;
  navDots.forEach(dot => {
    dot.style.borderColor = isDark ? 'rgba(255,248,240,0.5)' : '';
  });
  navDots.forEach(dot => {
    if (dot.classList.contains('active')) {
      dot.style.borderColor = isDark ? 'var(--cream)' : '';
      dot.style.background = isDark ? 'var(--cream)' : '';
    }
  });

  backBtn.style.color = isDark ? 'var(--cream)' : '';
  backBtn.style.background = isDark ? 'rgba(74, 14, 26, 0.6)' : '';
}

navDots.forEach && pageNav.addEventListener('click', () => {});

backBtn.addEventListener('click', () => {
  state.typingActive = false;
  showScreen(setupScreen);
});

// ============ SWIPE SUPPORT ============

let touchStartX = 0;
let touchEndX = 0;

resultScreen.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

resultScreen.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
}, { passive: true });

function handleSwipe() {
  const diff = touchStartX - touchEndX;
  const threshold = 50;

  if (diff > threshold && currentPage < pages.length - 1) {
    state.typingActive = false;
    showPage(currentPage + 1);
  } else if (diff < -threshold && currentPage > 0) {
    showPage(currentPage - 1);
    if (currentPage === 0) startLetterTyping();
  }
}

// ============ KEYBOARD NAVIGATION ============

document.addEventListener('keydown', (e) => {
  if (!resultScreen.classList.contains('active')) return;

  if (e.key === 'ArrowRight' && currentPage < pages.length - 1) {
    state.typingActive = false;
    showPage(currentPage + 1);
  } else if (e.key === 'ArrowLeft' && currentPage > 0) {
    showPage(currentPage - 1);
    if (currentPage === 0) startLetterTyping();
  } else if (e.key === 'Escape') {
    state.typingActive = false;
    showScreen(setupScreen);
  }
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

  // Fill form fields
  if (data.n) {
    document.getElementById('partner-name').value = data.n;
    state.partnerName = data.n;
  }
  if (data.d) {
    document.getElementById('together-date').value = data.d;
    state.togetherDate = new Date(data.d + 'T00:00:00');
  }
  if (data.l) {
    document.getElementById('letter-content').value = data.l;
    state.letterContent = data.l;
  }

  // Auto-render the letter
  state.hasPhotos = false;
  renderResult();
  showScreen(resultScreen);
})();
