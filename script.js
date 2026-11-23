(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => Math.random() * (b - a) + a;

  // Event time in India Standard Time, so every guest sees the same countdown
  const EVENT_TIME = new Date('2026-12-18T12:00:00+05:30').getTime();

  const body = document.body;
  const main = $('#main');
  const curtains = $('#curtains');
  const ribbon = $('#ribbon');
  const audio = $('#bgm');
  const musicBtn = $('#musicBtn');
  let opened = false;

  /* ---------- Falling hearts and petals ---------- */
  function makeFx(kind, opts = {}) {
    const el = document.createElement('span');
    el.className = 'fx ' + kind;
    const w = window.innerWidth;
    el.style.setProperty('--s', opts.size + 'px');
    el.style.setProperty('--x', rand(0, w - 20) + 'px');
    el.style.setProperty('--dx', rand(-70, 70) + 'px');
    el.style.setProperty('--rot', rand(160, 520) * (Math.random() < 0.5 ? -1 : 1) + 'deg');
    el.style.setProperty('--t', opts.dur + 's');
    el.style.setProperty('--dl', opts.delay + 's');
    el.style.setProperty('--n', opts.once ? '1' : 'infinite');
    el.style.opacity = opts.opacity || 0.9;
    return el;
  }

  function startAmbient() {
    if (reduce) return;
    const layer = $('#ambient');
    const count = window.innerWidth < 600 ? 14 : 24;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const kind = r < 0.72 ? 'heart' : r < 0.9 ? 'petal' : 'flower';
      const size = kind === 'heart' ? rand(10, 24) : rand(12, 22);
      frag.appendChild(makeFx(kind, { size, dur: rand(10, 20), delay: -rand(0, 20), opacity: rand(0.55, 0.95) }));
    }
    layer.appendChild(frag);
  }

  function burst(kinds, count, maxDelay) {
    if (reduce) return;
    const layer = $('#burst');
    for (let i = 0; i < count; i++) {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const el = makeFx(kind, { size: rand(14, 30), dur: rand(5, 9), delay: rand(0, maxDelay), once: true });
      el.addEventListener('animationend', () => el.remove());
      layer.appendChild(el);
    }
  }

  /* ---------- Music ---------- */
  let fadeTimer;
  function fadeTo(target, ms) {
    clearInterval(fadeTimer);
    const start = audio.volume, steps = 20, dt = ms / steps;
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      audio.volume = Math.min(1, Math.max(0, start + (target - start) * (i / steps)));
      if (i >= steps) clearInterval(fadeTimer);
    }, dt);
  }
  function setMusicUI(on) {
    musicBtn.setAttribute('aria-pressed', String(on));
    musicBtn.setAttribute('aria-label', on ? 'Pause background music' : 'Play background music');
  }
  function playMusic() {
    audio.volume = 0;
    const p = audio.play();
    if (p && p.then) {
      p.then(() => { setMusicUI(true); fadeTo(0.35, 3000); }).catch(() => setMusicUI(false));
    }
  }
  musicBtn.addEventListener('click', () => {
    if (audio.paused) { audio.volume = 0.35; audio.play().then(() => setMusicUI(true)).catch(() => setMusicUI(false)); }
    else { audio.pause(); setMusicUI(false); }
  });
  audio.addEventListener('error', () => setMusicUI(false));

  /* ---------- Ribbon and curtains ---------- */
  function openInvitation() {
    if (opened) return;
    opened = true;
    ribbon.classList.add('untied');
    playMusic(); // started inside the tap, as mobile browsers require

    const t = (ms) => (reduce ? 0 : ms);
    setTimeout(() => {
      curtains.classList.add('open');
      burst(['petal', 'petal', 'flower', 'heart'], window.innerWidth < 600 ? 28 : 46, 2.5);
    }, t(900));
    setTimeout(() => {
      body.classList.remove('locked');
      body.classList.add('revealed');
      main.removeAttribute('inert');
      main.focus({ preventScroll: true });
      musicBtn.hidden = false;
      startAmbient();
      window.scrollTo(0, 0);
    }, t(1800));
    setTimeout(() => curtains.remove(), t(3400));
  }
  ribbon.addEventListener('click', openInvitation);

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
          if (e.target.classList.contains('with-love')) burst(['heart', 'heart', 'flower', 'petal'], 30, 2);
        }
      });
    }, { threshold: 0.2 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Countdown ---------- */
  const cd = { d: $('#cdD'), h: $('#cdH'), m: $('#cdM'), s: $('#cdS') };
  const celebrate = $('#celebrate');
  const cdWrap = $('#countdown');
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const diff = EVENT_TIME - Date.now();
    if (diff <= 0) {
      cdWrap.hidden = true;
      celebrate.hidden = false;
      return false;
    }
    const s = Math.floor(diff / 1000);
    cd.d.textContent = pad(Math.floor(s / 86400));
    cd.h.textContent = pad(Math.floor((s % 86400) / 3600));
    cd.m.textContent = pad(Math.floor((s % 3600) / 60));
    cd.s.textContent = pad(s % 60);
    return true;
  }
  if (tick()) {
    const timer = setInterval(() => { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* ---------- Scratch card ---------- */
  const card = $('#dateCard');
  const zone = $('#scratch');
  const canvas = $('#foil');
  const ctx = canvas.getContext('2d');
  let cw = 0, ch = 0, started = false;

  function drawFoil() {
    const r = zone.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; ch = r.height;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, '#f48fb1'); g.addColorStop(0.5, '#ffd6e3'); g.addColorStop(1, '#e8688d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(rand(0, cw), rand(0, ch), rand(.8, 2), 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#5c0f26';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 20px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('Tap to scratch and reveal', cw / 2, ch / 2 - 12);
    ctx.fillText('the countdown', cw / 2, ch / 2 + 14);
  }
  window.addEventListener('resize', () => {
    if (started) return;
    const w = zone.getBoundingClientRect().width;
    if (Math.abs(w - cw) > 1) drawFoil();
  });
  drawFoil();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!started) drawFoil(); });

  function scratch() {
    if (started) return;
    started = true;
    const dur = reduce ? 300 : 3000, rows = 6, t0 = performance.now();
    let prev = null;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(40, (ch / rows) * 1.8);
    function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      const f = p * rows, row = Math.min(Math.floor(f), rows - 1), q = f - row;
      const x = (row % 2 ? 1 - q : q) * cw;
      const y = ((row + 0.5) / rows) * ch + Math.sin(q * Math.PI * 6) * ch * 0.04;
      ctx.beginPath();
      ctx.moveTo(prev ? prev.x : x, prev ? prev.y : y);
      ctx.lineTo(x, y);
      ctx.stroke();
      prev = { x, y };
      if (p < 1) requestAnimationFrame(step);
      else {
        canvas.classList.add('gone');
        setTimeout(() => canvas.remove(), 700);
        card.classList.add('done');
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
        card.setAttribute('aria-label', 'Countdown to the ring ceremony');
        cdWrap.setAttribute('aria-live', 'off');
        burst(['heart'], 14, 1);
      }
    }
    requestAnimationFrame(step);
  }
  card.addEventListener('click', scratch);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scratch(); }
  });
})();
