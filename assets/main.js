const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
if (menuButton && nav) {
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  menuButton.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menuButton.focus(); } });
}
document.querySelectorAll('.filter-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach((f) => f.setAttribute('aria-pressed', String(f === button)));
    document.querySelectorAll('#project-grid .project-card').forEach((card) => {
      card.hidden = selected !== 'all' && !(card.dataset.category || '').split(' ').includes(selected);
    });
  });
});
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
