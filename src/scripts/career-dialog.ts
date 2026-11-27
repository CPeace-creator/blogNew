import { onPageMount } from '../lib/page-lifecycle';

onPageMount(scope => {
  const dialog = document.querySelector<HTMLDialogElement>('[data-career-dialog]');
  const trigger = document.querySelector<HTMLAnchorElement>('[data-career-open]');
  if (!dialog || !trigger) return;

  const root = document.documentElement;
  let closing: number | undefined;
  let backdropPressed = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'off';

  // The welcome card moves with the pointer; keep the modal outside that scene.
  document.body.append(dialog);
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.setAttribute('aria-expanded', 'false');

  function reset() {
    clearTimeout(closing);
    delete dialog!.dataset.closing;
    root.removeAttribute('data-career-open');
    trigger!.setAttribute('aria-expanded', 'false');
    backdropPressed = false;
  }

  function open() {
    clearTimeout(closing);
    delete dialog!.dataset.closing;
    if (dialog!.open) return;
    dialog!.showModal();
    dialog!.querySelector('.career-dialog-body')!.scrollTop = 0;
    root.setAttribute('data-career-open', '');
    trigger!.setAttribute('aria-expanded', 'true');
  }

  function close(immediate = false) {
    if (!dialog!.open) return;
    if (immediate) {
      dialog!.close();
      reset();
    } else if (!dialog!.hasAttribute('data-closing')) {
      dialog!.dataset.closing = '';
      if (reduced()) dialog!.close();
      else closing = scope.setTimeout(() => dialog!.close(), 160);
    }
  }

  function outside(event: MouseEvent) {
    const bounds = dialog!.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  trigger.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open();
  }, scope.options());
  trigger.addEventListener('keydown', event => {
    if (event.key !== ' ') return;
    event.preventDefault();
    open();
  }, scope.options());
  dialog.querySelector('[data-career-close]')!.addEventListener('click', () => close(), scope.options());
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, scope.options());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const first = dialog.querySelector<HTMLButtonElement>('[data-career-close]')!;
    const last = dialog.querySelector<HTMLAnchorElement>('.career-dialog-footer a')!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, scope.options());
  dialog.addEventListener('pointerdown', event => { backdropPressed = outside(event); }, scope.options());
  dialog.addEventListener('click', event => {
    if (backdropPressed && outside(event)) close();
    backdropPressed = false;
  }, scope.options());
  dialog.addEventListener('close', () => {
    reset();
    trigger.focus({ preventScroll: true });
  }, scope.options());
  scope.cleanup(() => { close(true); reset(); });
});
