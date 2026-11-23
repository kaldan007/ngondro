const $ = (id) => document.getElementById(id);

const practice = $('practice');
const passages = [...document.querySelectorAll('.passage')];
const sizes = [18, 20, 22, 24, 27, 30, 34, 38];
const narrow = matchMedia('(max-width: 44rem)');

// A viewer's own settings; the page works the same if storage is unavailable.
function remembered(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function remember(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private window */ }
}

const state = {
  at: 0,
  view: remembered('view', 'overlay'),
  size: Number(remembered('size', 27)),
  dim: Number(remembered('dim', 72)),
  theme: remembered('theme', 'dark') === 'light' ? 'light' : 'dark',
  started: 0,
};

function show(screen) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-active', s === screen));
  screen.querySelector('h1')?.focus();
}

function writeUrl() {
  const inPractice = practice.classList.contains('is-active');
  const hash = inPractice ? `#at=${state.at + 1}&view=${state.view}` : '';
  history.replaceState(null, '', hash || location.pathname + location.search);
}

function renderPassage() {
  const passage = passages[state.at];
  const last = state.at === passages.length - 1;
  passages.forEach((p) => p.classList.toggle('is-current', p === passage));
  $('reading').scrollTop = 0;
  $('jump').value = passage.dataset.section;
  $('count').textContent = `${state.at + 1} of ${passages.length}`;
  $('meter').style.setProperty('--progress', (state.at + 1) / passages.length);
  $('prev').disabled = state.at === 0;
  $('next').textContent = last ? 'End practice' : 'Next';
  writeUrl();
}

function go(at) {
  state.at = Math.min(Math.max(at, 0), passages.length - 1);
  renderPassage();
}

function renderView() {
  // Side by side has no room on a phone, so it falls back to top and bottom.
  const view = state.view === 'side' && narrow.matches ? 'stack' : state.view;
  practice.dataset.view = view;
  $(`view-${view}`).checked = true;
  if (view === 'stack') centreThangka();
  writeUrl();
}

// In the top band only part of the image shows; open it on the central figure.
function centreThangka() {
  const figure = $('thangka');
  figure.scrollTop = (figure.scrollHeight - figure.clientHeight) * 0.56;
}

function renderSize() {
  document.documentElement.style.setProperty('--reading-size', `${state.size}px`);
  const step = sizes.indexOf(state.size);
  $('smaller').disabled = step === 0;
  $('larger').disabled = step === sizes.length - 1;
}

function renderDim() {
  document.documentElement.style.setProperty('--dim', state.dim / 100);
  $('dim').value = state.dim;
}

function renderTheme() {
  const light = state.theme === 'light';
  document.documentElement.dataset.theme = state.theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = light ? '#f4efe4' : '#00091b';
  document.querySelectorAll('.theme').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(light));
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  });
}

function startedAt() {
  try { return Number(sessionStorage.getItem('started')) || Date.now(); } catch { return Date.now(); }
}

function begin(at = 0, started = Date.now()) {
  state.started = started;
  try { sessionStorage.setItem('started', started); } catch { /* private window */ }
  setMenu(false, { focus: false });
  show(practice);
  renderView();
  go(at);
}

function duration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'You practised for less than a minute.';
  if (minutes < 60) return `You practised for ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `You practised for ${hourText}${rest ? ` ${rest} ${rest === 1 ? 'minute' : 'minutes'}` : ''}.`;
}

function end() {
  setMenu(false, { focus: false });
  $('duration').textContent = duration(Date.now() - state.started);
  show($('closing'));
  writeUrl();
}

$('begin').addEventListener('click', () => {
  practice.classList.add('unveiling');
  begin();
});
$('again').addEventListener('click', () => begin());
$('resume').addEventListener('click', () => begin(state.at, state.started));
$('end').addEventListener('click', end);
$('prev').addEventListener('click', () => go(state.at - 1));
$('next').addEventListener('click', () => (state.at === passages.length - 1 ? end() : go(state.at + 1)));

$('jump').addEventListener('change', (e) => {
  go(passages.findIndex((p) => p.dataset.section === e.target.value));
  setMenu(false);
});

document.querySelectorAll('input[name="view"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.view = radio.value;
    remember('view', state.view);
    renderView();
  });
});

function resize(by) {
  state.size = sizes[sizes.indexOf(state.size) + by];
  remember('size', state.size);
  renderSize();
}
$('smaller').addEventListener('click', () => resize(-1));
$('larger').addEventListener('click', () => resize(1));

$('dim').addEventListener('input', (e) => {
  state.dim = Number(e.target.value);
  remember('dim', state.dim);
  renderDim();
});

document.querySelectorAll('.theme').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    remember('theme', state.theme);
    renderTheme();
  });
});

const menu = $('practice-menu');
const menuToggle = $('menu-toggle');

function setMenu(open, { focus = true } = {}) {
  menu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close practice menu' : 'Open practice menu');
  if (!focus) return;
  if (open) menu.querySelector('select, button, input')?.focus();
  else menuToggle.focus();
}

menuToggle.addEventListener('click', () => setMenu(menu.hidden));

document.addEventListener('click', (e) => {
  if (menu.hidden || e.target.closest('#practice-menu, #menu-toggle')) return;
  setMenu(false, { focus: false });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    e.preventDefault();
    return;
  }
  if (!practice.classList.contains('is-active') || !menu.hidden) return;
  if (e.target.matches('input, select') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') go(state.at + 1);
  if (e.key === 'ArrowLeft') go(state.at - 1);
});

narrow.addEventListener('change', renderView);

if (!sizes.includes(state.size)) state.size = 27;
if (!['overlay', 'side', 'stack', 'text'].includes(state.view)) state.view = 'overlay';
renderSize();
renderDim();
renderTheme();

// A link or a reload mid-practice returns to the same passage and layout.
const saved = new URLSearchParams(location.hash.slice(1));
if (saved.has('view') && ['overlay', 'side', 'stack', 'text'].includes(saved.get('view'))) {
  state.view = saved.get('view');
}
if (saved.has('at')) begin((Number(saved.get('at')) || 1) - 1, startedAt());

let deferredInstall = null;

function runningInstalled() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function isIos() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function showInstall(show) {
  document.querySelectorAll('.install-slot').forEach((slot) => {
    slot.hidden = !show;
  });
  if (!show) {
    document.querySelectorAll('.install-hint').forEach((hint) => {
      hint.hidden = true;
    });
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {
    /* file or private window */
  });
}

if (!runningInstalled()) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event;
    showInstall(true);
  });
  if (isIos()) showInstall(true);
}

window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  showInstall(false);
});

document.querySelectorAll('.install').forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (!deferredInstall) {
      if (!isIos()) return;
      const hint = btn.closest('.install-slot')?.querySelector('.install-hint');
      if (hint) hint.hidden = !hint.hidden;
      return;
    }
    const prompt = deferredInstall;
    deferredInstall = null;
    prompt.prompt();
    await prompt.userChoice;
    showInstall(false);
  });
});
