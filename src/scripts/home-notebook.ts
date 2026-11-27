
import { onPageMount } from '../lib/page-lifecycle';

onPageMount(scope => {
const notebook = document.querySelector<HTMLDialogElement>('[data-home-notebook]');
const trigger = document.querySelector<HTMLButtonElement>('[data-home-notebook-open]');

if (notebook && trigger) {
  const root = document.documentElement;
  let closing: number | undefined;
  let backdropPressed = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';

  // Keep the notebook out of the article grid and any animated panel ancestors.
  document.body.append(notebook);
  trigger.hidden = false;

  function open() {
    clearTimeout(closing);
    delete notebook!.dataset.closing;
    if (notebook!.open) return;
    notebook!.showModal();
    root.setAttribute('data-home-notebook-open', '');
    trigger!.setAttribute('aria-expanded', 'true');
  }

  function close(immediate = false) {
    if (!notebook!.open || notebook!.hasAttribute('data-closing')) return;
    notebook!.dataset.closing = '';
    if (immediate || reduced()) notebook!.close();
    else closing = scope.setTimeout(() => notebook!.close(), 180);
  }

  function outside(event: MouseEvent) {
    const bounds = notebook!.getBoundingClientRect();
    return event.target === notebook && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  trigger.addEventListener('click', open, scope.options());
  notebook.querySelector('[data-home-notebook-close]')!.addEventListener('click', () => close(), scope.options());
  notebook.addEventListener('cancel', event => { event.preventDefault(); close(); }, scope.options());
  notebook.addEventListener('pointerdown', event => { backdropPressed = outside(event); }, scope.options());
  notebook.addEventListener('click', event => {
    if (backdropPressed && outside(event)) close();
    backdropPressed = false;
  }, scope.options());
  notebook.addEventListener('close', () => {
    clearTimeout(closing);
    root.removeAttribute('data-home-notebook-open');
    delete notebook.dataset.closing;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({ preventScroll: true });
  }, scope.options());
  document.addEventListener('home-panel-change', () => close(true), scope.options());
  scope.onPageHide(() => close(true));
}
});
