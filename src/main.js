/* ============================================
   LOVER LETTER — Main Application Logic v2
   Typewriter effect, overlays, save-to-image
   ============================================ */

import html2canvas from 'html2canvas';

// ============ CONSTANTS ============

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============ STATE ============

const state = {
  partnerName: '',
  togetherDate: null,
  letterContent: '',
  photos: [null, null, null, null],
  typingActive: false,
};

// ============ DOM ============

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const setupScreen = $('#setup-screen');
const resultScreen = $('#result-screen');
const setupForm = $('#setup-form');
const scene = $('#scene');

const envelopeItem = $('#envelope-item');
const stripItem = $('#strip-item');

const letterOverlay = $('#letter-overlay');
const photoboothOverlay = $('#photobooth-overlay');

// ============ INIT ============

document.addEventListener('DOMContentLoaded', () => {
  generatePaperGrain();
  setupPhotoUploads();
  setupFormHandler();
  setupOverlays();
  setupBackButton();
});

// ============ PAPER GRAIN TEXTURE ============

function generatePaperGrain() {
  const canvas = document.createElement('canvas');
  const size = 150;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = 120 + Math.random() * 80; // warm gray noise
    imageData.data[i] = v;
    imageData.data[i + 1] = v * 0.96;
    imageData.data[i + 2] = v * 0.9;
    imageData.data[i + 3] = 18; // very subtle
  }
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  $$('.paper-grain').forEach(el => {
    el.style.backgroundImage = `url(${dataUrl})`;
    el.style.backgroundSize = `${size}px ${size}px`;
  });
}

// ============ PHOTO UPLOADS ============

function setupPhotoUploads() {
  $$('.photo-upload-slot').forEach(slot => {
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
}

// ============ FORM ============

function setupFormHandler() {
  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    state.partnerName = $('#partner-name').value.trim();
    const dateStr = $('#together-date').value;
    state.togetherDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    state.letterContent = $('#letter-content').value.trim();

    renderScene();
    showScreen(resultScreen);
  });
}

// ============ SCENE RENDERING ============

function renderScene() {
  const hasPhotos = state.photos.some(p => p !== null);
  const daysTogether = calculateDaysTogether(state.togetherDate);

  // Days badge
  $('#scene-days').textContent = `${daysTogether} days together`;

  // Show/hide photobooth strip
  if (hasPhotos) {
    stripItem.classList.remove('hidden');
    scene.classList.remove('solo');

    // Render mini preview photos
    state.photos.forEach((photo, i) => {
      const el = $(`#sp-${i}`);
      if (photo) {
        el.style.backgroundImage = `url(${photo})`;
      }
    });
  } else {
    stripItem.classList.add('hidden');
    scene.classList.add('solo');
  }

  // Render full photobooth strip (for overlay)
  state.photos.forEach((photo, i) => {
    const el = $(`#bp-${i}`);
    if (photo) {
      el.style.backgroundImage = `url(${photo})`;
    }
  });

  $('#strip-footer').textContent = state.partnerName
    ? `${state.partnerName} & me`
    : 'you & me';

  // Prepare letter content (rendered on overlay open)
  prepareLetter();

  // Trigger entry animations
  requestAnimationFrame(() => {
    envelopeItem.classList.add('visible');
    if (hasPhotos) {
      stripItem.classList.add('visible');
    }
  });
}

function prepareLetter() {
  const date = state.togetherDate;
  const dateStr = `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  const greeting = state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  const body = state.letterContent || 'Every day with you feels like a page from the most beautiful story ever written.';
  const daysTogether = calculateDaysTogether(state.togetherDate);
  const daysStr = `${daysTogether} days together`;

  // Store for typewriter
  state._letterDate = dateStr;
  state._letterGreeting = greeting;
  state._letterBody = body;
  state._letterDays = daysStr;
}

// ============ OVERLAYS ============

function setupOverlays() {
  // Open letter overlay
  envelopeItem.addEventListener('click', () => {
    openOverlay(letterOverlay);
    startLetterTyping();
  });

  // Open photobooth overlay
  stripItem.addEventListener('click', () => {
    openOverlay(photoboothOverlay);
  });

  // Close buttons
  $('#letter-close').addEventListener('click', () => {
    closeOverlay(letterOverlay);
    state.typingActive = false;
  });

  $('#photobooth-close').addEventListener('click', () => {
    closeOverlay(photoboothOverlay);
  });

  // Close on backdrop click
  [letterOverlay, photoboothOverlay].forEach(overlay => {
    overlay.querySelector('.overlay-backdrop').addEventListener('click', () => {
      closeOverlay(overlay);
      state.typingActive = false;
    });
  });

  // Save buttons
  $('#letter-save').addEventListener('click', () => {
    saveElementAsImage($('#letter-sheet'), 'love-letter.png');
  });

  $('#photobooth-save').addEventListener('click', () => {
    saveElementAsImage($('#photobooth-strip'), 'photobooth.png');
  });
}

function openOverlay(overlay) {
  overlay.classList.remove('hidden');
}

function closeOverlay(overlay) {
  overlay.classList.add('hidden');
  // Reset letter typing state
  if (overlay === letterOverlay) {
    resetLetterDisplay();
  }
}

// ============ TYPEWRITER EFFECT ============

function resetLetterDisplay() {
  $('#lt-date').textContent = '';
  $('#lt-greeting').textContent = '';
  $('#lt-greeting').classList.remove('typing-cursor');
  $('#lt-body').textContent = '';
  $('#lt-body').classList.remove('typing-cursor');
  $('#lt-days').textContent = '';
  $('#lt-days').classList.remove('visible');
  $('#letter-save').classList.add('hidden');
}

async function startLetterTyping() {
  state.typingActive = true;

  const dateEl = $('#lt-date');
  const greetingEl = $('#lt-greeting');
  const bodyEl = $('#lt-body');
  const daysEl = $('#lt-days');
  const saveBtn = $('#letter-save');

  // Reset
  resetLetterDisplay();

  // Small delay for paper to appear
  await delay(600);
  if (!state.typingActive) return;

  // Type date
  await typeText(dateEl, state._letterDate, 35);
  if (!state.typingActive) return;

  await delay(300);

  // Type greeting
  greetingEl.classList.add('typing-cursor');
  await typeText(greetingEl, state._letterGreeting, 45);
  greetingEl.classList.remove('typing-cursor');
  if (!state.typingActive) return;

  await delay(400);

  // Type body
  bodyEl.classList.add('typing-cursor');
  await typeText(bodyEl, state._letterBody, 40);
  bodyEl.classList.remove('typing-cursor');
  if (!state.typingActive) return;

  await delay(500);

  // Show days counter (fade in, not typed)
  daysEl.textContent = state._letterDays;
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
        element.textContent = text; // ensure full text is shown
        resolve();
        return;
      }

      element.textContent += text.charAt(i);
      i++;

      // Vary speed for natural feel
      let nextDelay = baseSpeed + Math.random() * 25 - 12;

      // Pause longer at punctuation
      const char = text.charAt(i - 1);
      if (char === '.' || char === '!' || char === '?') nextDelay += 200;
      else if (char === ',') nextDelay += 100;
      else if (char === '\n') nextDelay += 150;

      setTimeout(tick, nextDelay);
    }

    tick();
  });
}

// ============ SAVE TO IMAGE ============

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
    alert('Could not save image. Try taking a screenshot instead.');
  }
}

// ============ BACK BUTTON ============

function setupBackButton() {
  $('#back-btn').addEventListener('click', () => {
    state.typingActive = false;
    closeOverlay(letterOverlay);
    closeOverlay(photoboothOverlay);

    // Reset scene animations
    envelopeItem.classList.remove('visible');
    stripItem.classList.remove('visible');

    showScreen(setupScreen);
  });
}

// ============ SCREEN MANAGEMENT ============

function showScreen(screen) {
  setupScreen.classList.remove('active');
  resultScreen.classList.remove('active');
  screen.classList.add('active');
}

// ============ UTILITIES ============

function calculateDaysTogether(startDate) {
  const now = new Date();
  const start = new Date(startDate);
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ KEYBOARD SHORTCUTS ============

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!letterOverlay.classList.contains('hidden')) {
      state.typingActive = false;
      closeOverlay(letterOverlay);
    } else if (!photoboothOverlay.classList.contains('hidden')) {
      closeOverlay(photoboothOverlay);
    }
  }
});
