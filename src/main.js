/* ============================================
   LOVER LETTER — Main Application Logic
   Original 3-page layout + typewriter effect,
   optional photobooth, save-to-image
   ============================================ */

import html2canvas from 'html2canvas';

const MONTHS_EN = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const QUOTES = [
  '"No matter how many years pass,\nI will always be by your side,\nmy one and only lover."',
  '"In all the world, there is no heart for me\nlike yours. In all the world,\nthere is no love for you like mine."',
  '"I saw that you were perfect,\nand so I loved you.\nThen I saw that you were not perfect\nand I loved you even more."',
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
const pageMemory = document.getElementById('page-memory');

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

// ============ PAPER GRAIN TEXTURE (woven cotton canvas) ============

function generatePaperGrain() {
  const canvas = document.createElement('canvas');
  const size = 300;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base: warm off-white with subtle variation
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = 200 + Math.random() * 30;
    imageData.data[i] = v;
    imageData.data[i + 1] = v * 0.97;
    imageData.data[i + 2] = v * 0.92;
    imageData.data[i + 3] = 12;
  }
  ctx.putImageData(imageData, 0, 0);

  // Woven horizontal thread lines
  ctx.strokeStyle = 'rgba(180, 160, 130, 0.06)';
  for (let y = 0; y < size; y += 3) {
    ctx.lineWidth = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.random() * 0.5);
    for (let x = 0; x < size; x += 8) {
      ctx.lineTo(x + 8, y + (Math.random() - 0.5) * 0.8);
    }
    ctx.stroke();
  }

  // Woven vertical thread lines
  ctx.strokeStyle = 'rgba(170, 150, 120, 0.05)';
  for (let x = 0; x < size; x += 3) {
    ctx.lineWidth = 0.4 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.random() * 0.5, 0);
    for (let y = 0; y < size; y += 8) {
      ctx.lineTo(x + (Math.random() - 0.5) * 0.8, y + 8);
    }
    ctx.stroke();
  }

  // Speckles — tiny dark spots like cotton paper inclusions
  for (let s = 0; s < 60; s++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 0.3 + Math.random() * 0.8;
    ctx.fillStyle = `rgba(${100 + Math.random() * 40}, ${85 + Math.random() * 30}, ${60 + Math.random() * 30}, ${0.08 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fiber strands — thin wavy lines like visible cotton fibers
  for (let f = 0; f < 12; f++) {
    const fx = Math.random() * size;
    const fy = Math.random() * size;
    const angle = Math.random() * Math.PI;
    const len = 8 + Math.random() * 20;
    ctx.strokeStyle = `rgba(${160 + Math.random() * 40}, ${140 + Math.random() * 30}, ${100 + Math.random() * 30}, ${0.06 + Math.random() * 0.06})`;
    ctx.lineWidth = 0.3 + Math.random() * 0.3;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    const cp1x = fx + Math.cos(angle) * len * 0.3 + (Math.random() - 0.5) * 4;
    const cp1y = fy + Math.sin(angle) * len * 0.3 + (Math.random() - 0.5) * 4;
    const cp2x = fx + Math.cos(angle) * len * 0.7 + (Math.random() - 0.5) * 4;
    const cp2y = fy + Math.sin(angle) * len * 0.7 + (Math.random() - 0.5) * 4;
    const ex = fx + Math.cos(angle) * len;
    const ey = fy + Math.sin(angle) * len;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
    ctx.stroke();
  }

  const dataUrl = canvas.toDataURL('image/png');
  document.querySelectorAll('.paper-grain').forEach(el => {
    el.style.backgroundImage = `url(${dataUrl})`;
    el.style.backgroundSize = `${size}px ${size}px`;
  });
}

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
  document.getElementById('save-letter').classList.add('hidden');

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

  // --- Page 3: Polaroid Memory (always shown) ---
  document.getElementById('memory-day-num').textContent = day;
  document.getElementById('memory-month-text').textContent = `\u2014 ${month} ${year}`;

  document.getElementById('memory-note').innerHTML = buildNoteHTML();

  const polaroidEl = document.getElementById('memory-polaroid-img');
  if (state.photos[0]) {
    polaroidEl.style.backgroundImage = `url(${state.photos[0]})`;
  }
  document.getElementById('memory-polaroid-label').textContent =
    state.partnerName ? `${state.partnerName} & me` : 'us';

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('memory-quote').textContent = quote;

  // --- Build active pages array ---
  buildActivePages();
  showPage(0);

  // Start typewriter on first page (letter)
  startLetterTyping();
}

function buildNoteHTML() {
  const name = state.partnerName || 'you';
  const lines = [];
  lines.push(`I love you, ${name}.`);
  lines.push(`I will always love you,`);
  lines.push(`even with your flaws.`);

  if (state.letterContent) {
    lines.push('');
    const preview = state.letterContent.length > 60
      ? state.letterContent.slice(0, 60) + '...'
      : state.letterContent;
    lines.push(preview);
  }

  return lines.join('<br>');
}

function calculateDaysTogether(startDate) {
  const now = new Date();
  const diffMs = now - startDate;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// ============ DYNAMIC PAGE MANAGEMENT ============

function buildActivePages() {
  // Always: letter + memory. Photobooth only if photos uploaded.
  pages = [pageLetter];
  if (state.hasPhotos) {
    pagePhotobooth.style.display = '';
    pages.push(pagePhotobooth);
  } else {
    pagePhotobooth.style.display = 'none';
  }
  pages.push(pageMemory);

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
  const saveBtn = document.getElementById('save-letter');

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
  saveBtn.classList.add('hidden');

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

  // Show save button
  saveBtn.classList.remove('hidden');
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

// ============ SAVE TO IMAGE ============

document.getElementById('save-letter').addEventListener('click', () => {
  saveElementAsImage(document.querySelector('.letter-paper'), 'love-letter.png');
});

document.getElementById('save-photobooth').addEventListener('click', () => {
  saveElementAsImage(document.getElementById('photobooth-strip-el'), 'photobooth.png');
});

async function saveElementAsImage(element, filename) {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Save failed:', err);
  }
}

// ============ NAVIGATION ============

function showScreen(screen) {
  setupScreen.classList.remove('active');
  resultScreen.classList.remove('active');
  screen.classList.add('active');
}

function showPage(index) {
  const allPages = [pageLetter, pagePhotobooth, pageMemory];
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
