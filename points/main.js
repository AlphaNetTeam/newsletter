/* ═══════════════════════════════════════════════════════════
   ALPHANET — interactions
   topo-line hero canvas · reveals · count-ups · live AI DEX book
   ═══════════════════════════════════════════════════════════ */
(() => {
'use strict';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 1 · nav scroll state ─────────────────────────────────── */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ── 2 · mobile menu ──────────────────────────────────────── */
const burger  = document.getElementById('burger');
const overlay = document.getElementById('menu-overlay');
burger.addEventListener('click', () => {
  const open = overlay.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});
overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  overlay.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}));

/* ── 3 · staggered reveals ────────────────────────────────── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

// stagger siblings inside shared parents
const groups = new Map();
document.querySelectorAll('.reveal').forEach(el => {
  const p = el.parentElement;
  if (!groups.has(p)) groups.set(p, 0);
  const i = groups.get(p);
  el.style.setProperty('--d', `${Math.min(i * 0.09, 0.55)}s`);
  groups.set(p, i + 1);
  io.observe(el);
});

/* ── 4 · count-up stats ───────────────────────────────────── */
const counters = document.querySelectorAll('.count');
const cio = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const to  = parseFloat(e.target.dataset.to);
    const dec = parseInt(e.target.dataset.dec || '0', 10);
    if (reduced) { e.target.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1600;
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      e.target.textContent = (to * ease).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.4 });
counters.forEach(c => cio.observe(c));

/* ── 4.5 · workflow stepper — auto-advancing, hover/click to drive ── */
const stepsWrap = document.getElementById('steps');
if (stepsWrap) {
  const steps  = [...stepsWrap.querySelectorAll('[data-step]')];
  const beam   = stepsWrap.querySelector('.steps-beam');
  const status = document.getElementById('steps-status-txt');
  let cur = -1, stepTimer = null, pauseUntil = 0;

  const setStep = i => {
    cur = i;
    steps.forEach((s, k) => {
      s.classList.toggle('active', k === i);
      s.classList.toggle('done', k < i);
    });
    if (status) {
      const name = steps[i].querySelector('h3').textContent.toUpperCase();
      status.textContent = `STEP 0${i + 1} / 0${steps.length} — ${name}`;
    }
    if (beam) {
      const node = steps[i].querySelector('.step-n');
      const wrapBox = stepsWrap.getBoundingClientRect();
      const nodeBox = node.getBoundingClientRect();
      const railL = wrapBox.width * 0.02;
      beam.style.width = Math.max(0, (nodeBox.left - wrapBox.left) + nodeBox.width / 2 - railL) + 'px';
    }
  };
  const startSteps = () => {
    if (stepTimer || reduced) return;
    stepTimer = setInterval(() => {
      if (performance.now() < pauseUntil) return;
      setStep((cur + 1) % steps.length);
    }, 3400);
  };
  const stopSteps = () => { clearInterval(stepTimer); stepTimer = null; };

  steps.forEach((s, k) => {
    s.addEventListener('mouseenter', () => { setStep(k); pauseUntil = performance.now() + 6000; });
    s.addEventListener('click',      () => { setStep(k); pauseUntil = performance.now() + 9000; });
  });
  window.addEventListener('resize', () => { if (cur >= 0) setStep(cur); }, { passive: true });

  const sio = new IntersectionObserver(es => {
    es.forEach(e => {
      if (e.isIntersecting) { if (cur < 0) setStep(0); startSteps(); }
      else stopSteps();
    });
  }, { threshold: 0.3 });
  sio.observe(stepsWrap);
  if (reduced) setStep(0);
}

/* ── 5 · hero background — original AlphaNet video (optimized) ── */
const bgVideo = document.getElementById('topo');
const pauseBtn = document.getElementById('pause-bg');
let paused = reduced;

if (bgVideo && pauseBtn) {
  const setPaused = p => {
    paused = p;
    pauseBtn.textContent = p ? 'PLAY BACKGROUND' : 'PAUSE BACKGROUND';
    pauseBtn.setAttribute('aria-pressed', String(p));
    if (p) bgVideo.pause();
    else { const pr = bgVideo.play(); if (pr) pr.catch(() => {}); }
  };
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  if (reduced) setPaused(true);
}

/* ── 6 · floating telemetry numbers ───────────────────────── */
const floaters = document.getElementById('floaters');
if (floaters && !reduced) {
  const vals = () => (Math.random() * 90 + 5).toFixed(Math.random() < 0.5 ? 4 : 2);
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.className = 'floater';
    s.textContent = vals();
    s.style.left = `${(Math.random() * 94 + 2).toFixed(1)}%`;
    s.style.setProperty('--dur', `${(22 + Math.random() * 26).toFixed(1)}s`);
    s.style.setProperty('--del', `${(-Math.random() * 40).toFixed(1)}s`);
    s.style.setProperty('--op', (0.1 + Math.random() * 0.14).toFixed(2));
    floaters.appendChild(s);
  }
}

/* ── 7 · AI DEX — live order book ─────────────────────────── */
const asksEl = document.getElementById('asks');
const bidsEl = document.getElementById('bids');
const midEl  = document.getElementById('mid-price');
const sprEl  = document.getElementById('mid-spread');
const ROWS = 4;
let mid = 3412.86;

if (asksEl && bidsEl && midEl && sprEl) {
const mkRow = (price, size, max) => {
  const row = document.createElement('div');
  row.className = 'book-row';
  const bar = document.createElement('i');
  bar.className = 'bar';
  bar.style.width = `${(size / max * 100).toFixed(1)}%`;
  const p = document.createElement('span'); p.textContent = price.toFixed(1);
  const q = document.createElement('span'); q.textContent = size.toFixed(3);
  row.append(bar, p, q);
  return { row, bar };
};

function renderBook() {
  asksEl.innerHTML = ''; bidsEl.innerHTML = '';
  // cumulative offsets from mid — keeps both sides strictly ordered
  const offs = [];
  let acc = 0.6 + Math.random() * 0.4;
  for (let i = 0; i < ROWS; i++) { offs.push(acc); acc += 0.7 + Math.random() * 0.9; }
  const mkSizes = () => Array.from({ length: ROWS }, () => 0.4 + Math.random() * 8);

  // asks: furthest from mid on top, closest at the bottom
  const sa = mkSizes(), ma = Math.max(...sa);
  for (let i = ROWS - 1; i >= 0; i--) asksEl.appendChild(mkRow(mid + offs[i], sa[i], ma).row);
  // bids: closest to mid on top, furthest at the bottom
  const sb = mkSizes(), mb = Math.max(...sb);
  for (let i = 0; i < ROWS; i++) bidsEl.appendChild(mkRow(mid - offs[i], sb[i], mb).row);

  midEl.textContent = mid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  sprEl.textContent = `SPREAD ${(offs[0] * 2).toFixed(1)}`;
}
renderBook();
if (!reduced) {
  setInterval(() => {
    mid = Math.max(3000, mid + (Math.random() - 0.5) * 6);
    renderBook();
  }, 1600);
}
}

/* ── 9 · footer year ──────────────────────────────────────── */
document.getElementById('year').textContent = new Date().getFullYear();

})();
