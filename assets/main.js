/* Site scripts: menu, theme, globe, sliders, map, filters, contact form. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.remove('no-js');

  /* ---------- Toast ---------- */
  let toastEl, toastTimer;
  const toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  };

  /* ---------- Theme ---------- */
  const setTheme = (t) => {
    root.dataset.theme = t;
    try { localStorage.setItem('su-theme', t); } catch (e) {}
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = t === 'light' ? '#f5f7fb' : '#05070d';
    $$('.theme-toggle').forEach((b) => b.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme'));
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  };
  $$('.theme-toggle').forEach((b) => b.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light')));
  setTheme(root.dataset.theme || 'dark');

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-toggle'), nav = $('.nav-links');
  if (menuBtn && nav) {
    const setOpen = (open) => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menuBtn.focus(); } });
    document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !e.target.closest('.nav-shell')) setOpen(false); });
  }

  /* ---------- Scroll: header, progress, back-to-top ---------- */
  const header = $('.site-header'), bar = $('.progress'), toTop = $('.to-top');
  const onScroll = () => {
    const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    if (header) header.classList.toggle('scrolled', y > 20);
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (toTop) toTop.classList.toggle('show', y > 700);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (toTop) toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  /* ---------- Active nav link (one-page sections) ---------- */
  const navLinks = $$('.nav-links a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { navLinks.forEach((a) => a.classList.remove('active')); const a = map.get(en.target.id); if (a) a.classList.add('active'); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  const runCounter = (el) => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
    const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    if (reduced) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = 1600;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(end * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if (counters.length) {
    if (!('IntersectionObserver' in window)) counters.forEach(runCounter);
    else { const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { runCounter(e.target); io.unobserve(e.target); } }), { threshold: 0.6 }); counters.forEach((c) => io.observe(c)); }
  }

  /* ---------- Typed roles ---------- */
  const typed = $('.typed');
  if (typed) {
    const words = (typed.dataset.words || '').split('|').filter(Boolean);
    if (words.length && !reduced) {
      let w = 0, i = words[0].length, del = true;
      const tick = () => {
        const word = words[w];
        if (del) { i--; if (i <= 0) { del = false; w = (w + 1) % words.length; } }
        else { i++; if (i >= words[w].length) { del = true; typed.textContent = words[w]; return setTimeout(tick, 2200); } }
        typed.textContent = (del ? word : words[w]).slice(0, Math.max(0, i));
        setTimeout(tick, del ? 35 : 70);
      };
      setTimeout(tick, 2400);
    }
  }

  /* ---------- Card spotlight ---------- */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.project-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`); card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ---------- Project filter + search ---------- */
  const grid = $('#project-grid');
  const refreshProjects = () => {
    if (!grid) return;
    const active = $('.chip[aria-pressed="true"]'), f = active ? active.dataset.filter : 'all';
    const q = (($('#project-search') || {}).value || '').trim().toLowerCase();
    let shown = 0;
    $$('.project-card', grid).forEach((card) => {
      const cats = (card.dataset.category || '').split(' ');
      const ok = (f === 'all' || cats.includes(f)) && (!q || card.textContent.toLowerCase().includes(q));
      card.hidden = !ok; if (ok && card.dataset.slug) shown++;
    });
    $$('.chip[data-filter]').forEach((c) => {
      const n = c.dataset.filter === 'all' ? $$('.project-card[data-slug]', grid).length : $$('.project-card[data-slug]', grid).filter((k) => (k.dataset.category || '').split(' ').includes(c.dataset.filter)).length;
      const s = $('.count', c); if (s) s.textContent = n;
    });
    const empty = $('.empty-state'); if (empty) empty.classList.toggle('show', shown === 0);
  };
  $$('.chip[data-filter]').forEach((b) => b.addEventListener('click', () => { $$('.chip[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); refreshProjects(); }));
  const search = $('#project-search'); if (search) search.addEventListener('input', refreshProjects);
  refreshProjects();

  /* ---------- Before / after sliders ---------- */
  const initBA = (ba) => {
    const range = $('input[type=range]', ba); if (!range) return;
    const set = () => ba.style.setProperty('--pos', range.value + '%');
    range.addEventListener('input', set); set();
  };
  $$('.ba').forEach(initBA);
  const compareTabs = $$('.compare-tab');
  if (compareTabs.length) {
    const ba = $('#compare-ba');
    const select = (tab) => {
      compareTabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      const d = tab.dataset;
      const [before, after] = [$('.ba-before', ba), $('.ba-after', ba)];
      before.src = d.before; before.alt = d.beforeAlt; after.src = d.after; after.alt = d.afterAlt;
      $('.ba-tag.l', ba).textContent = d.beforeLabel; $('.ba-tag.r', ba).textContent = d.afterLabel;
      $('#compare-caption').innerHTML = d.caption;
      const legend = $('#compare-legend'); legend.hidden = !d.legend;
      const range = $('input', ba); range.value = 50; ba.style.setProperty('--pos', '50%');
    };
    compareTabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault(); const n = compareTabs[(i + (e.key === 'ArrowDown' ? 1 : compareTabs.length - 1)) % compareTabs.length]; n.focus(); select(n);
      });
    });
  }

  /* ---------- Copy email + contact form ---------- */
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast(b.dataset.copyLabel || 'Copied');
      if (b.classList.contains('copy')) { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 2000); }
    } catch (err) { toast(b.dataset.copy); }
  }));
  const form = $('#contact-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const v = (n) => (form.elements[n].value || '').trim();
    const subject = `${v('topic')} (from ${v('name')})`;
    const body = `${v('message')}\n\n${v('name')}${v('email') ? ` (${v('email')})` : ''}`;
    location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast('Opening your email app…');
  });

  /* ---------- Lightbox for figures ---------- */
  const figImgs = $$('.detail-figure img, .inline-figure img');
  if (figImgs.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Enlarged figure');
    lb.innerHTML = '<button class="icon-btn" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div><img alt=""><p></p></div>';
    document.body.appendChild(lb);
    let last;
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; if (last) last.focus(); };
    figImgs.forEach((img) => {
      img.tabIndex = 0; img.setAttribute('role', 'button'); img.setAttribute('aria-label', 'Enlarge figure: ' + (img.alt || ''));
      const open = () => { last = img; $('img', lb).src = img.currentSrc || img.src; $('img', lb).alt = img.alt; const cap = img.closest('figure') && $('figcaption', img.closest('figure')); $('p', lb).textContent = cap ? cap.textContent : ''; lb.classList.add('open'); document.body.style.overflow = 'hidden'; $('button', lb).focus(); };
      img.addEventListener('click', open);
      img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    lb.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
  }

  /* ---------- Table of contents on case studies ---------- */
  const side = $('.detail-side'), heads = $$('.detail-main > h2');
  if (side && heads.length > 2) {
    const toc = document.createElement('ul'); toc.className = 'toc';
    heads.forEach((h, i) => { h.id = h.id || 'sec-' + (i + 1) + '-' + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-'); toc.insertAdjacentHTML('beforeend', `<li><a href="#${h.id}">${h.textContent}</a></li>`); });
    const title = $('h3', side); (title ? title.after(toc) : side.prepend(toc));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) $$('a', toc).forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-20% 0px -70% 0px' });
      heads.forEach((h) => io.observe(h));
    }
  }

  /* ---------- Year ---------- */
  $$('.year-now').forEach((y) => (y.textContent = new Date().getFullYear()));

  /* ---------- Interactive globe with satellite imagery (hero) ---------- */
  const canvas = $('#globe');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d'), D = Math.PI / 180;
    const places = [
      { n: 'Islamabad', lat: 33.68, lon: 73.05, c: '#34d399' },
      { n: 'Karachi', lat: 24.86, lon: 67.0, c: '#22d3ee' },
      { n: 'Bali', lat: -8.4, lon: 115.2, c: '#a3e635' }
    ];
    const pts = []; const N = 1500, G = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), p = i * G; pts.push([Math.asin(y), Math.atan2(Math.sin(p) * r, Math.cos(p) * r)]); }
    let W, H, R, cx, cy, lon0 = 82 * D, lat0 = 16 * D, dragging = false, lastX = 0, lastY = 0, visible = true, raf;
    const resize = () => { const dpr = Math.min(2, devicePixelRatio || 1), b = canvas.getBoundingClientRect(); W = b.width; H = b.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); R = Math.min(W, H) * 0.36; cx = W / 2; cy = H / 2; };
    const proj = (lat, lon, h = 1) => {
      const l = lon - lon0, cl = Math.cos(lat);
      const x = cl * Math.sin(l), y = Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * cl * Math.cos(l), z = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * cl * Math.cos(l);
      return { x: cx + R * h * x, y: cy - R * h * y, z, vis: z > 0 || (x * x + y * y) * h * h > 1 };
    };
    const vec = (lat, lon) => [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    const arc = (a, b, n = 48) => {
      const A = vec(a.lat * D, a.lon * D), B = vec(b.lat * D, b.lon * D), om = Math.acos(A[0] * B[0] + A[1] * B[1] + A[2] * B[2]), out = [];
      for (let i = 0; i <= n; i++) { const t = i / n, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om); const v = [A[0] * s1 + B[0] * s2, A[1] * s1 + B[1] * s2, A[2] * s1 + B[2] * s2]; out.push([Math.asin(v[2]), Math.atan2(v[1], v[0]), 1 + 0.22 * Math.sin(Math.PI * t) * om / 1.6, t]); }
      return out;
    };
    const arcs = [arc(places[0], places[1]), arc(places[0], places[2]), arc(places[1], places[2])];
    let node = 40 * D;

    // Earth imagery: an equirectangular world image wrapped onto the sphere pixel by pixel.
    // Per-pixel latitude and longitude offsets are cached and only rebuilt when the size or tilt changes.
    let tex = null, TW = 0, TH = 0, off, offCtx, img, P, ROW, DL, SH, CNT = 0, preKey = '';
    if (canvas.dataset.texture) {
      const earth = new Image();
      earth.onload = () => {
        const c = document.createElement('canvas'); c.width = TW = earth.naturalWidth; c.height = TH = earth.naturalHeight;
        const x = c.getContext('2d'); x.drawImage(earth, 0, 0);
        try { tex = x.getImageData(0, 0, TW, TH).data; } catch (e) { tex = null; }
        if (reduced) draw(0);
      };
      earth.src = canvas.dataset.texture;
    }
    const prep = () => {
      const S = Math.max(64, Math.min(560, Math.round(2 * R * Math.min(devicePixelRatio || 1, 1.5))));
      const key = `${S}:${TW}:${lat0.toFixed(4)}`; if (key === preKey) return; preKey = key;
      if (!off || off.width !== S) {
        off = document.createElement('canvas'); off.width = off.height = S; offCtx = off.getContext('2d'); img = offCtx.createImageData(S, S);
        P = new Int32Array(S * S); ROW = new Int32Array(S * S); DL = new Float32Array(S * S); SH = new Float32Array(S * S);
      } else img.data.fill(0);
      const sL = Math.sin(lat0), cL = Math.cos(lat0); let k = 0;
      for (let py = 0; py < S; py++) {
        const y = 1 - (py + 0.5) / S * 2;
        for (let px = 0; px < S; px++) {
          const x = (px + 0.5) / S * 2 - 1, r2 = x * x + y * y; if (r2 > 1) continue;
          const z = Math.sqrt(1 - r2), lat = Math.asin(Math.max(-1, Math.min(1, z * sL + y * cL)));
          P[k] = (py * S + px) * 4;
          ROW[k] = Math.min(TH - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * TH))) * TW;
          DL[k] = Math.atan2(x, z * cL - y * sL) / (2 * Math.PI);
          SH[k] = 0.35 + 0.65 * Math.pow(z, 0.5); k++;
        }
      }
      CNT = k;
    };
    const paintEarth = () => {
      prep();
      const buf = img.data, k0 = (lon0 + Math.PI) / (2 * Math.PI);
      for (let i = 0; i < CNT; i++) {
        let f = DL[i] + k0; f -= Math.floor(f);
        const t = (ROW[i] + ((f * TW) | 0)) * 4, s = SH[i], q = P[i];
        buf[q] = tex[t] * s; buf[q + 1] = tex[t + 1] * s; buf[q + 2] = tex[t + 2] * s; buf[q + 3] = 255;
      }
      offCtx.putImageData(img, 0, 0);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, cx - R, cy - R, 2 * R, 2 * R);
      // soft highlight on the lit side
      const hl = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx - R * 0.35, cy - R * 0.4, R * 1.1);
      hl.addColorStop(0, 'rgba(255,255,255,.10)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      ctx.restore();
    };

    const draw = (time) => {
      const light = root.dataset.theme === 'light', t = time / 1000;
      const ink = light ? '15,23,42' : '148,163,184';
      ctx.clearRect(0, 0, W, H);
      // atmosphere
      const g = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.25);
      g.addColorStop(0, light ? 'rgba(8,145,178,.12)' : 'rgba(34,211,238,.18)'); g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
      if (tex) paintEarth();
      else { ctx.fillStyle = light ? 'rgba(255,255,255,.6)' : 'rgba(10,15,26,.85)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); }
      ctx.strokeStyle = tex ? 'rgba(125,211,252,.35)' : `rgba(${ink},.25)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      // graticule
      ctx.fillStyle = tex ? 'rgba(255,255,255,.16)' : `rgba(${ink},.18)`;
      for (let la = -60; la <= 60; la += 30) for (let lo = -180; lo < 180; lo += 3) { const p = proj(la * D, lo * D); if (p.z > 0) ctx.fillRect(p.x, p.y, 1, 1); }
      for (let lo = -180; lo < 180; lo += 30) for (let la = -87; la <= 87; la += 3) { const p = proj(la * D, lo * D); if (p.z > 0) ctx.fillRect(p.x, p.y, 1, 1); }
      // dotted sphere, only until the imagery has loaded
      if (!tex) for (const [la, lo] of pts) { const p = proj(la, lo); if (p.z > 0) { ctx.fillStyle = `rgba(${ink},${(0.15 + p.z * 0.55).toFixed(2)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 0.6 + p.z * 0.9, 0, 7); ctx.fill(); } }
      // arcs with travelling pulse
      arcs.forEach((a, k) => {
        ctx.lineWidth = 1.4; ctx.strokeStyle = light ? 'rgba(5,150,105,.55)' : 'rgba(52,211,153,.55)'; ctx.beginPath(); let pen = false;
        for (const [la, lo, h] of a) { const p = proj(la, lo, h); if (p.vis) { pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); pen = true; } else pen = false; }
        ctx.stroke();
        const q = a[Math.floor(((t * 0.35 + k / 3) % 1) * (a.length - 1))], p = proj(q[0], q[1], q[2]);
        if (p.vis) { ctx.fillStyle = '#a3e635'; ctx.shadowColor = '#a3e635'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
      });
      // places
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      places.forEach((pl, i) => {
        const p = proj(pl.lat * D, pl.lon * D); if (p.z <= 0) return;
        const ph = (t * 0.8 + i * 0.33) % 1;
        ctx.strokeStyle = pl.c; ctx.globalAlpha = (1 - ph) * p.z; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + ph * 16, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = pl.c; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
        if (p.z > 0.25) {
          ctx.globalAlpha = Math.min(1, (p.z - 0.25) * 3);
          if (tex) { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 4; ctx.fillStyle = '#fff'; }
          else ctx.fillStyle = light ? 'rgba(15,23,42,.9)' : 'rgba(232,237,245,.92)';
          ctx.fillText(pl.n, p.x + 10, p.y + 4); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
      });
      // sun-synchronous satellite (98° inclination) with trail
      const inc = 98 * D, u0 = t * 0.5, h = 1.16;
      for (let j = 60; j >= 0; j--) {
        const u = u0 - j * 0.02, la = Math.asin(Math.sin(inc) * Math.sin(u)), lo = node + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)), p = proj(la, lo, h);
        if (!p.vis) continue;
        if (j === 0) { ctx.fillStyle = '#fff'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(34,211,238,.9)'; ctx.fillRect(p.x - 9, p.y - 1, 18, 2); }
        else { ctx.fillStyle = `rgba(34,211,238,${((60 - j) / 60 * 0.6).toFixed(2)})`; ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
      }
    };
    const loop = (time) => { if (!dragging) lon0 += 0.0016; node -= 0.0002; draw(time); if (visible) raf = requestAnimationFrame(loop); };
    resize(); addEventListener('resize', () => { resize(); if (reduced) draw(0); });
    if (reduced) { draw(0); document.addEventListener('themechange', () => draw(0)); }
    else {
      raf = requestAnimationFrame(loop);
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) raf = requestAnimationFrame(loop); }).observe(canvas);
      document.addEventListener('visibilitychange', () => { if (document.hidden) { visible = false; cancelAnimationFrame(raf); } else { visible = true; raf = requestAnimationFrame(loop); } });
    }
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      lon0 -= (e.clientX - lastX) * 0.006; lat0 = Math.max(-60 * D, Math.min(60 * D, lat0 + (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY; if (reduced) draw(0);
    });
    const end = () => (dragging = false); canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  }

  /* ---------- Leaflet map (lazy-loaded) ---------- */
  const mapEl = $('#work-map');
  if (mapEl) {
    const PLACES = JSON.parse($('#map-data').textContent);
    // Open, key-free basemaps: OpenStreetMap, OpenTopoMap and EOX Sentinel-2 cloudless.
    const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const loadCSS = () => new Promise((res) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; l.crossOrigin = ''; l.onload = res; l.onerror = res; document.head.appendChild(l); });
    const loadJS = () => new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; s.crossOrigin = ''; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const start = () => Promise.all([loadCSS(), loadJS()]).then(() => {
      const L = window.L; mapEl.innerHTML = '';
      const map = L.map(mapEl, { scrollWheelZoom: false, worldCopyJump: true, zoomControl: true, attributionControl: true });
      const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'osm-tiles', attribution: OSM_ATTR }).addTo(map);
      const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, subdomains: 'abc', attribution: OSM_ATTR + ', <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' });
      const sat = L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg', { maxZoom: 15, attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2020)' });
      L.control.layers({ 'Map': osm, 'Topographic': topo, 'Satellite (Sentinel-2)': sat }, null, { position: 'topright' }).addTo(map);
      const setDark = (t) => mapEl.classList.toggle('map-dark', t !== 'light');
      setDark(root.dataset.theme);
      document.addEventListener('themechange', (e) => setDark(e.detail));
      map.on('click', () => map.scrollWheelZoom.enable());
      const markers = PLACES.map((p) => {
        const icon = L.divIcon({ className: '', html: `<div class="map-pin" style="background:${p.color}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] });
        const html = `<b>${p.name}</b><br><span style="color:var(--muted)">${p.type}</span><br>${p.text}${p.link ? `<br><a href="${p.link}">${p.linkText || 'Open'} →</a>` : ''}`;
        return L.marker([p.lat, p.lon], { icon, title: p.name, alt: p.name }).addTo(map).bindPopup(html);
      });
      const bounds = L.latLngBounds(PLACES.map((p) => [p.lat, p.lon])); map.fitBounds(bounds, { padding: [50, 50] });
      $$('.place').forEach((btn, i) => btn.addEventListener('click', () => {
        $$('.place').forEach((b) => b.classList.toggle('on', b === btn));
        map.flyTo([PLACES[i].lat, PLACES[i].lon], PLACES[i].zoom || 9, { duration: reduced ? 0 : 1.4 });
        markers[i].openPopup();
      }));
    }).catch(() => { mapEl.innerHTML = '<div class="map-fallback">The interactive map could not load. Check your internet connection.</div>'; });
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' }); io.observe(mapEl); }
    else start();
  }

  window.SU = { refreshProjects, toast };
})();
