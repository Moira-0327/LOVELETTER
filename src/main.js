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

// ============ SAVE TO IMAGE ============

// US Letter: 8.5 x 11 inches. At 300 DPI: 2550 x 3300 px.
// We render at a scaled-down size for html2canvas, then scale up.
const LETTER_W = 850;
const LETTER_H = 1100;

document.getElementById('save-letter').addEventListener('click', () => {
  saveLetterAsImage();
});

document.getElementById('save-photobooth').addEventListener('click', () => {
  savePhotoboothAsImage();
});

async function saveLetterAsImage() {
  // Build an off-screen clone at US Letter proportions — no clip-path
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: ${LETTER_W}px; height: ${LETTER_H}px;
    background: #EAE2D3;
    font-family: 'Special Elite', 'Courier New', monospace;
    color: #5C1018;
    display: flex; flex-direction: column;
    padding: 80px 72px 60px;
    overflow: hidden;
  `;

  // Paper grain overlay
  const grain = document.createElement('div');
  const grainSrc = document.querySelector('.paper-grain');
  if (grainSrc && grainSrc.style.backgroundImage) {
    grain.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      opacity: 0.5; mix-blend-mode: multiply;
      background-image: ${grainSrc.style.backgroundImage};
      background-size: 300px 300px;
    `;
  }
  container.appendChild(grain);

  // Fiber overlay (same as ::after)
  const fibers = document.createElement('div');
  fibers.style.cssText = `
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse at 20% 30%, rgba(196,168,130,0.08) 0%, transparent 60%),
      radial-gradient(ellipse at 75% 70%, rgba(196,168,130,0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 10%, rgba(196,168,130,0.05) 0%, transparent 40%);
  `;
  container.appendChild(fibers);

  // Content wrapper
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative; z-index: 2;
    display: flex; flex-direction: column; gap: 28px;
    flex: 1;
  `;

  // Date line
  const dateLine = document.createElement('div');
  dateLine.style.cssText = `display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px;`;
  const dayEl = document.createElement('span');
  dayEl.style.cssText = `font-family: 'Cormorant Garamond', Georgia, serif; font-size: 72px; font-weight: 300; color: #5C1018; line-height: 1;`;
  dayEl.textContent = document.getElementById('letter-day').textContent;
  const monthEl = document.createElement('span');
  monthEl.style.cssText = `font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; font-weight: 300; color: #8C7B70; letter-spacing: 4px;`;
  monthEl.textContent = document.getElementById('letter-month').textContent;
  dateLine.appendChild(dayEl);
  dateLine.appendChild(monthEl);
  content.appendChild(dateLine);

  // Greeting
  const greeting = document.createElement('div');
  greeting.style.cssText = `font-size: 28px; line-height: 1.4;`;
  greeting.textContent = document.getElementById('letter-greeting').textContent;
  content.appendChild(greeting);

  // Body
  const body = document.createElement('div');
  body.style.cssText = `font-size: 22px; line-height: 2.2; white-space: pre-wrap; flex: 1;`;
  body.textContent = document.getElementById('letter-body').textContent;
  content.appendChild(body);

  // Days counter
  const days = document.createElement('div');
  days.style.cssText = `font-size: 16px; color: #8C7B70; letter-spacing: 3px; text-align: right; margin-top: auto; padding-top: 20px;`;
  days.textContent = document.getElementById('letter-days').textContent;
  content.appendChild(days);

  container.appendChild(content);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#EAE2D3',
      scale: 3,
      useCORS: true,
      logging: false,
      width: LETTER_W,
      height: LETTER_H,
    });

    const link = document.createElement('a');
    link.download = 'love-letter.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Save letter failed:', err);
  } finally {
    document.body.removeChild(container);
  }
}

async function savePhotoboothAsImage() {
  const strip = document.getElementById('photobooth-strip-el');

  // Clone the strip into a clean off-screen container without transform
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; left: -9999px; top: 0;`;

  const clone = strip.cloneNode(true);
  clone.style.cssText = `
    width: 440px;
    background: #FFF8F0;
    padding: 28px 20px 36px;
    display: flex; flex-direction: column; align-items: center;
    transform: none;
    box-shadow: none;
    font-family: 'Special Elite', 'Courier New', monospace;
  `;

  // Fix photo background images in clone
  const origPhotos = strip.querySelectorAll('.strip-photo');
  const clonePhotos = clone.querySelectorAll('.strip-photo');
  origPhotos.forEach((orig, i) => {
    const bg = orig.style.backgroundImage || orig.style.background;
    if (bg) {
      clonePhotos[i].style.backgroundImage = orig.style.backgroundImage;
      clonePhotos[i].style.background = orig.style.background;
    }
    clonePhotos[i].style.backgroundSize = 'cover';
    clonePhotos[i].style.backgroundPosition = 'center';
    clonePhotos[i].style.width = '100%';
    clonePhotos[i].style.aspectRatio = '4/3';
    clonePhotos[i].style.filter = 'grayscale(100%) contrast(1.1) brightness(1.05)';
  });

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#FFF8F0',
      scale: 3,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = 'photobooth.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Save photobooth failed:', err);
  } finally {
    document.body.removeChild(container);
  }
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

// ============ SHARE LINK ============

function encodeShareData() {
  const data = {
    n: state.partnerName,
    d: document.getElementById('together-date').value,
    l: state.letterContent,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeShareData(hash) {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

document.getElementById('share-letter').addEventListener('click', async () => {
  const encoded = encodeShareData();
  const url = `${window.location.origin}${window.location.pathname}#${encoded}`;

  try {
    await navigator.clipboard.writeText(url);
  } catch (_) {
    // Fallback for older browsers
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }

  // Show toast
  const toast = document.getElementById('share-toast');
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 1800);
});

// ============ LOAD FROM SHARE LINK ============

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
