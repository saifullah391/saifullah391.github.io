// Renders projects from data/projects.json (edited through /admin/).
// - index.html: adds a card for every project not already written into the page.
// - project.html?p=<slug>: renders the full detail page for a project added through /admin/.
(function () {
  const root = document.documentElement.dataset.root || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const url = (u) => {
    if (!u) return '';
    const s = String(u).trim();
    if (/^(https?:|mailto:)/i.test(s)) return s;
    if (/^[a-z]+:/i.test(s)) return '';            // block javascript:, data: etc.
    return root + s.replace(/^\//, '');
  };
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, href) => {
      const h = url(href.replace(/&amp;/g, '&'));
      return h ? `<a href="${esc(h)}">${txt}</a>` : txt;
    });
  // Small, safe Markdown subset: ## headings, paragraphs, - lists, **bold**, *italic*, `code`, [links](url).
  const markdown = (md) => String(md || '').replace(/\r/g, '').split(/\n{2,}/).map((block) => {
    const b = block.trim();
    if (!b) return '';
    const h = b.match(/^(#{2,3})\s+(.*)$/);
    if (h) return `<h2>${inline(h[2])}</h2>`;
    if (/^[-*] /.test(b)) return '<ul>' + b.split('\n').map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('') + '</ul>';
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('');
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
  const LABEL = { geoai: 'GeoAI', remote: 'Remote sensing', gis: 'GIS & analysis' };
  const link = (p) => p.page ? url(p.page) : `${root}project.html?p=${encodeURIComponent(p.slug)}`;
  const card = (p) => {
    const a = document.createElement('article');
    a.className = 'project-card reveal in';
    a.dataset.slug = p.slug;
    a.dataset.category = p.category || 'gis';
    const thumb = p.thumbnail ? `<img src="${esc(url(p.thumbnail))}" width="800" height="450" alt="" loading="lazy">` : '<span class="thumb-placeholder" aria-hidden="true">SU</span>';
    const year = p.date ? String(p.date).slice(0, 4) : '';
    a.innerHTML = `<div class="project-art">${thumb}<span class="art-label">${esc(LABEL[p.category] || 'Project')}${year ? ' · ' + esc(year) : ''}</span></div><div class="project-body"><p class="card-kicker">${esc(p.kicker)}</p><h3><a href="${esc(link(p))}">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p><div class="tag-list">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div><span class="project-link">View case study ${arrow}</span></div>`;
    return a;
  };
  const load = () => fetch(root + 'data/projects.json', { cache: 'no-cache' }).then((r) => r.json()).then((d) => d.projects || []);

  const grid = document.getElementById('project-grid');
  if (grid) {
    load().then((list) => {
      const have = new Set([...grid.querySelectorAll('[data-slug]')].map((e) => e.dataset.slug));
      const first = grid.querySelector('.project-card:not(.featured)');
      list.filter((p) => p.slug && !have.has(p.slug)).forEach((p) => first ? grid.insertBefore(card(p), first) : grid.appendChild(card(p)));
      if (window.SU) window.SU.refreshProjects();
    }).catch(() => {});
  }

  const detail = document.getElementById('project-detail');
  if (detail) {
    const slug = new URLSearchParams(location.search).get('p');
    load().then((list) => {
      const p = list.find((x) => x.slug === slug);
      if (!p) { detail.innerHTML = `<section class="center-page"><div><p class="eyebrow">Project</p><h1>Not <span class="grad-text">found.</span></h1><p>This project doesn’t exist or has been renamed.</p><div class="hero-cta"><a class="btn btn-primary" href="${root}index.html#work">Back to projects ${arrow}</a></div></div></section>`; return; }
      if (p.page) { location.replace(url(p.page)); return; }
      document.title = `${p.title} | Saif Ullah`;
      const md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', p.summary || '');
      const cover = p.cover || p.thumbnail;
      const figs = (p.images || []).map((i) => `<figure class="inline-figure"><img src="${esc(url(i.image))}" alt="${esc(i.alt)}" loading="lazy">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}</figure>`).join('');
      const side = [['Study area', p.study_area], ['Date', p.date], ['Data', p.data], ['Tools', p.tools]].filter(([, v]) => v).map(([k, v]) => `<p><strong>${k}</strong>${esc(v)}</p>`).join('');
      const code = (p.code || []).filter((c) => c.file).map((c) => `<a href="${esc(url(c.file))}">${esc(c.label || c.file.split('/').pop())}</a>`).join(' · ');
      const links = (p.links || []).filter((l) => url(l.url)).map((l) => `<a href="${esc(url(l.url))}">${esc(l.label || l.url)} ↗</a>`).join('<br>');
      detail.innerHTML = `<section class="detail-hero"><a class="back-link" href="${root}index.html#work">← All projects</a><p class="eyebrow">${esc(p.kicker)}</p><h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p></section>`
        + (cover ? `<figure class="detail-figure"><img src="${esc(url(cover))}" alt="${esc(p.thumbnail_alt || p.title)}"></figure>` : '')
        + `<section class="detail-content"><div class="detail-main">${markdown(p.body)}${figs}</div><aside class="detail-side"><h3>Project details</h3>${side}${code ? `<p><strong>Source code</strong>${code}</p>` : ''}${links ? `<p><strong>Links</strong>${links}</p>` : ''}<a class="btn btn-primary btn-sm" href="${root}index.html#contact">Ask about this project</a></aside></section>`;
    }).catch(() => { detail.innerHTML = '<section class="center-page"><div><h1>Could not load.</h1><p>This project could not be loaded. Please try again.</p></div></section>'; });
  }
})();
