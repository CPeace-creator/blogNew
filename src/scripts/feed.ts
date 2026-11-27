
import { onPageMount } from '../lib/page-lifecycle';

onPageMount(scope => {

const entries = [...document.querySelectorAll<HTMLElement>('[data-feed-entry]')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-feed-category]')];
const pagination = document.querySelector('[data-feed-pagination]');
if (entries.length && pagination) {
  const mobile = matchMedia('(max-width: 640px)');
  const count = document.querySelector('[data-feed-count]');
  const empty = document.querySelector<HTMLElement>('[data-feed-empty]');
  let category = '全部', page = 1, size = mobile.matches ? 3 : 6;

  function render(move = false) {
    const keepFocus = move && pagination!.contains(document.activeElement);
    const matches = entries.filter(entry => category === '全部' || entry.dataset.category === category);
    const pages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.min(page, pages);
    entries.forEach(entry => { entry.hidden = true; });
    matches.slice((page - 1) * size, page * size).forEach(entry => { entry.hidden = false; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.feedCategory === category)));
    if (count) count.textContent = `共 ${matches.length} 篇文章`;
    if (empty) empty.hidden = matches.length > 0;
    pagination!.replaceChildren();

    function add(label: string, target: number, disabled = false, current = false) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      if (current) button.setAttribute('aria-current', 'page');
      button.setAttribute('aria-label', label === '‹' ? '上一页' : label === '›' ? '下一页' : `第 ${label} 页`);
      button.addEventListener('click', () => { page = target; render(true); }, scope.options());
      pagination!.append(button);
    }
    add('‹', page - 1, page === 1);
    for (let number = 1; number <= pages; number++) add(String(number), number, false, number === page);
    add('›', page + 1, page === pages);
    if (keepFocus) pagination!.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus({ preventScroll: true });
    if (move) {
      // Scroll to the filters above the grid so the sticky page tabs never cover
      // a new page's title or the current category controls.
      const heading = document.querySelector('.home-desk-bar') || document.querySelector('[data-feed-grid]');
      heading?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off' ? 'instant' : 'smooth' });
    }
  }
  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.feedCategory || '全部';
    page = 1;
    render();
  }, scope.options()));
  mobile.addEventListener('change', () => {
    const first = (page - 1) * size;
    size = mobile.matches ? 3 : 6;
    page = Math.floor(first / size) + 1;
    render();
  }, scope.options());
  render();
}
});
