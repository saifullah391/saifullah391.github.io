// Renders projects from data/projects.json.
// - portfolio.html: adds a card for every project not already written into the page.
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
  const link = (p) => p.page ? url(p.page) : `${root}project.html?p=${encodeURIComponent(p.slug)}`;
  const card = (p) => {
    const a = document.createElement('article');
    a.className = 'project-card';
    a.dataset.slug = p.slug;
    a.dataset.category = p.category || 'gis';
    const thumb = p.thumbnail ? `<img src="${esc(url(p.thumbnail))}" width="800" height="420" alt="" loading="lazy">` : '<span class="thumb-placeholder" aria-hidden="true">SU</span>';
    a.innerHTML = `<a class="project-art" href="${esc(link(p))}" tabindex="-1" aria-hidden="true">${thumb}</a><div class="project-body"><p class="card-kicker">${esc(p.kicker)}</p><h3><a href="${esc(link(p))}">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p><div class="tag-list">${(p.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div><a class="project-link" href="${esc(link(p))}">VIEW PROJECT <span aria-hidden="true">↗</span></a></div>`;
    return a;
  };
  const load = () => fetch(root + 'data/projects.json', { cache: 'no-cache' }).then((r) => r.json()).then((d) => d.projects || []);

  const grid = document.getElementById('project-grid');
  if (grid) {
    load().then((list) => {
      const have = new Set([...grid.querySelectorAll('[data-slug]')].map((e) => e.dataset.slug));
      list.filter((p) => p.slug && !have.has(p.slug)).forEach((p) => grid.prepend(card(p)));
      const active = document.querySelector('.filter-btn[aria-pressed="true"]');
      if (active) active.click();
    }).catch(() => {});
  }

  const detail = document.getElementById('project-detail');
  if (detail) {
    const slug = new URLSearchParams(location.search).get('p');
    load().then((list) => {
      const p = list.find((x) => x.slug === slug);
      if (!p) { detail.innerHTML = '<section class="detail-hero"><h1>Project <span class="accent">not found.</span></h1><p class="lead"><a class="text-link" href="portfolio.html#work">← BACK TO PORTFOLIO</a></p></section>'; return; }
      if (p.page) { location.replace(url(p.page)); return; }
      document.title = `${p.title} | Saif Ullah`;
      const md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', p.summary || '');
      const cover = p.cover || p.thumbnail;
      const figs = (p.images || []).map((i) => `<figure class="inline-figure"><img src="${esc(url(i.image))}" alt="${esc(i.alt)}" loading="lazy">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}</figure>`).join('');
      const side = [['Study area', p.study_area], ['Date', p.date], ['Data', p.data], ['Tools', p.tools]].filter(([, v]) => v).map(([k, v]) => `<p><strong>${k}</strong><br>${esc(v)}</p>`).join('');
      const code = (p.code || []).filter((c) => c.file).map((c) => `<a href="${esc(url(c.file))}">${esc(c.label || c.file.split('/').pop())}</a>`).join(' · ');
      const links = (p.links || []).filter((l) => url(l.url)).map((l) => `<a href="${esc(url(l.url))}">${esc(l.label || l.url)} ↗</a>`).join('<br>');
      detail.innerHTML = `<section class="detail-hero"><a class="back-link" href="portfolio.html#work">← BACK TO PORTFOLIO</a><p class="eyebrow" style="margin-top:34px">${esc(p.kicker)}</p><h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p></section>`
        + (cover ? `<figure class="detail-figure detail-img"><img src="${esc(url(cover))}" alt="${esc(p.thumbnail_alt || p.title)}"></figure>` : '')
        + `<section class="detail-content"><div class="detail-main">${markdown(p.body)}${figs}</div><aside class="detail-side"><h3>PROJECT DETAILS</h3>${side}${code ? `<p><strong>Source code</strong><br>${code}</p>` : ''}${links ? `<p><strong>Links</strong><br>${links}</p>` : ''}<a class="text-link" href="portfolio.html#contact">ASK ABOUT THIS PROJECT ↗</a></aside></section>`;
    }).catch(() => { detail.innerHTML = '<p class="lead">This project could not be loaded.</p>'; });
  }
})();
