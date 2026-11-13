const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}
document.querySelectorAll('.filter-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach((filter) => filter.setAttribute('aria-pressed', String(filter === button)));
    document.querySelectorAll('.project-card').forEach((card) => {
      card.hidden = selected !== 'all' && !card.dataset.category.split(' ').includes(selected);
    });
  });
});
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
