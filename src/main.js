/* ============================================
   LOVER LETTER — Main Application Logic
   ============================================ */

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
};

// ============ DOM REFS ============

const setupScreen = document.getElementById('setup-screen');
const resultScreen = document.getElementById('result-screen');
const setupForm = document.getElementById('setup-form');
const photoSlots = document.querySelectorAll('.photo-upload-slot');
const pages = document.querySelectorAll('.page');
const navDots = document.querySelectorAll('.nav-dot');
const backBtn = document.getElementById('back-btn');

let currentPage = 0;

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
  state.togetherDate = dateStr ? new Date(dateStr) : new Date();
  state.letterContent = document.getElementById('letter-content').value.trim();

  renderResult();
  showScreen(resultScreen);
});

// ============ RENDER RESULT ============

function renderResult() {
  const date = state.togetherDate;
  const day = date.getDate();
  const month = MONTHS_EN[date.getMonth()];
  const year = date.getFullYear();
  const daysSince = calculateDaysTogether(date);

  // --- Page 1: Love Letter ---
  document.getElementById('letter-day').textContent = day;
  document.getElementById('letter-month').textContent = `— ${month}`;
  document.getElementById('letter-greeting').textContent =
    state.partnerName ? `Dear ${state.partnerName},` : 'Dear you,';
  document.getElementById('letter-body').textContent =
    state.letterContent || 'You are the most beautiful chapter in my story.';
  document.getElementById('letter-days').textContent =
    `${daysSince} days together`;

  // --- Page 2: Photo Booth ---
  state.photos.forEach((photo, i) => {
    const el = document.getElementById(`strip-photo-${i}`);
    if (photo) {
      el.style.backgroundImage = `url(${photo})`;
    } else {
      el.style.background = `linear-gradient(135deg, #E8E0D8 0%, #D4C8BC 100%)`;
    }
  });

  document.getElementById('strip-caption').textContent =
    state.partnerName
      ? `${state.partnerName} & me`
      : 'you & me';

  document.getElementById('photobooth-text').textContent =
    `${daysSince} days of love`;

  // --- Page 3: Polaroid Memory ---
  document.getElementById('memory-day-num').textContent = day;
  document.getElementById('memory-month-text').textContent = `— ${month} ${year}`;

  document.getElementById('memory-note').innerHTML = buildNoteHTML();

  // Use first photo for polaroid, or leave blank
  const polaroidEl = document.getElementById('memory-polaroid-img');
  if (state.photos[0]) {
    polaroidEl.style.backgroundImage = `url(${state.photos[0]})`;
  }
  document.getElementById('memory-polaroid-label').textContent =
    state.partnerName
      ? `${state.partnerName} & me`
      : 'us';

  // Random quote
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('memory-quote').textContent = quote;

  // Set first page active
  showPage(0);
}

function buildNoteHTML() {
  const name = state.partnerName || 'you';
  const lines = [];
  lines.push(`I love you, ${name}.`);
  lines.push(`I will always love you,`);
  lines.push(`even with your flaws.`);

  if (state.letterContent) {
    lines.push('');
    // Take first ~60 chars of the letter content
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

// ============ NAVIGATION ============

function showScreen(screen) {
  setupScreen.classList.remove('active');
  resultScreen.classList.remove('active');
  screen.classList.add('active');
}

function showPage(index) {
  pages.forEach((page, i) => {
    page.classList.remove('active', 'exit-left');
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

  // Adjust nav dot color for dark backgrounds
  const isDark = index === 1; // photobooth page has maroon bg
  navDots.forEach(dot => {
    dot.style.borderColor = isDark ? 'rgba(255,248,240,0.5)' : '';
  });
  document.querySelectorAll('.nav-dot.active').forEach(dot => {
    dot.style.borderColor = isDark ? 'var(--cream)' : '';
    dot.style.background = isDark ? 'var(--cream)' : '';
  });

  backBtn.style.color = isDark ? 'var(--cream)' : '';
  backBtn.style.background = isDark
    ? 'rgba(74, 14, 26, 0.6)'
    : '';
}

navDots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const page = parseInt(dot.dataset.page);
    showPage(page);
  });
});

backBtn.addEventListener('click', () => {
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
    showPage(currentPage + 1);
  } else if (diff < -threshold && currentPage > 0) {
    showPage(currentPage - 1);
  }
}

// ============ KEYBOARD NAVIGATION ============

document.addEventListener('keydown', (e) => {
  if (!resultScreen.classList.contains('active')) return;

  if (e.key === 'ArrowRight' && currentPage < pages.length - 1) {
    showPage(currentPage + 1);
  } else if (e.key === 'ArrowLeft' && currentPage > 0) {
    showPage(currentPage - 1);
  } else if (e.key === 'Escape') {
    showScreen(setupScreen);
  }
});
