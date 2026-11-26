import type { StudioObject } from '../lib/studio-content';

type Anchor = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
interface DetailsOptions {
  onChange: (id?: string) => void;
  onRead: (id: string, trigger?: HTMLElement, href?: string, title?: string) => void;
}

export function createStudioDetails(root: HTMLElement, objects: StudioObject[], options: DetailsOptions) {
  const card = root.querySelector<HTMLElement>('[data-studio-details]')!;
  const title = card.querySelector<HTMLElement>('[data-details-title]')!;
  const description = card.querySelector<HTMLElement>('[data-details-description]')!;
  const label = card.querySelector<HTMLElement>('[data-details-label]')!;
  const related = card.querySelector<HTMLElement>('[data-details-related]')!;
  const action = card.querySelector<HTMLElement>('[data-details-action]')!;
  const hoverMedia = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const events = new AbortController();
  const signal = events.signal;
  document.body.append(card);

  let selected: string | undefined, pending: string | undefined, dismissed: string | undefined;
  let opener: HTMLElement | undefined, anchor: Anchor | undefined;
  let input: 'hover' | 'tap' | 'keyboard' = 'hover', inside = false, frame = 0;
  let opening: ReturnType<typeof setTimeout> | undefined;
  let closing: ReturnType<typeof setTimeout> | undefined;
  let hiding: ReturnType<typeof setTimeout> | undefined;

  function clearIntent() { clearTimeout(opening); clearTimeout(closing); pending = undefined; }
  function position() {
    const margin = 12, gap = 12, width = document.documentElement.clientWidth;
    card.style.width = `${Math.min(340, width - margin * 2)}px`;
    // Layout dimensions stay stable while the entry transition scales the card.
    const size = { width: card.offsetWidth, height: card.offsetHeight };
    let x = (width - size.width) / 2, y = innerHeight - size.height - margin;
    if (input !== 'tap' && width > 640 && anchor) {
      const right = width - anchor.right - margin - gap, left = anchor.left - margin - gap;
      if (Math.max(right, left) >= Math.min(280, size.width)) {
        card.style.width = `${Math.min(340, Math.max(right, left))}px`;
        const measured = { width: card.offsetWidth, height: card.offsetHeight };
        x = right >= left ? anchor.right + gap : anchor.left - measured.width - gap;
        y = Math.max(margin, Math.min(innerHeight - measured.height - margin, anchor.top - 12));
      } else {
        // Narrow mouse-driven layouts place the card above or below its source.
        const below = innerHeight - anchor.bottom - gap - margin, above = anchor.top - gap - margin;
        card.style.maxHeight = `${Math.max(100, Math.min(innerHeight - margin * 2, Math.max(above, below)))}px`;
        const measured = { width: card.offsetWidth, height: card.offsetHeight };
        x = Math.max(margin, Math.min(width - measured.width - margin, anchor.left));
        y = below >= above ? anchor.bottom + gap : anchor.top - measured.height - gap;
      }
    }
    card.style.left = `${Math.max(margin, Math.min(width - card.offsetWidth - margin, x))}px`;
    card.style.top = `${Math.max(margin, Math.min(innerHeight - card.offsetHeight - margin, y))}px`;
  }
  function hide(restoreFocus = false) {
    clearIntent();
    cancelAnimationFrame(frame);
    if (!selected && !card.matches(':popover-open')) return;
    selected = undefined;
    inside = false;
    card.dataset.state = 'closing';
    options.onChange();
    clearTimeout(hiding);
    hiding = setTimeout(() => card.hidePopover(), 160);
    if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function show(id: string, source?: HTMLElement, target?: Anchor) {
    const object = objects.find(item => item.id === id);
    if (!object || dismissed === id) return;
    clearIntent();
    clearTimeout(hiding);
    if (selected === id && card.dataset.state === 'open') return;
    selected = id;
    opener = source;
    anchor = target || source?.getBoundingClientRect();
    card.dataset.input = input;
    card.querySelector<HTMLElement>('.studio-details-hint')!.textContent = input === 'keyboard' ? 'Tab 浏览详情 · Esc 关闭并返回物件' : '移出物件与详情卡片即可收起 · Esc 关闭';
    title.textContent = object.title;
    description.textContent = object.description;
    label.textContent = `${object.label} / 月湾书屋`;
    action.textContent = object.action;
    related.replaceChildren(...object.links.map(link => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${link.title} ↗`;
      button.addEventListener('click', () => read(link.href, link.title));
      return button;
    }));
    card.style.maxHeight = '';
    const wasOpen = card.matches(':popover-open');
    if (!wasOpen) { card.dataset.state = 'opening'; card.showPopover(); }
    position();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { card.dataset.state = 'open'; });
    options.onChange(id);
    if (input !== 'hover') card.querySelector<HTMLButtonElement>('[data-details-close]')!.focus({ preventScroll: true });
  }
  function leave() {
    clearTimeout(opening);
    pending = undefined;
    dismissed = undefined;
    if (input === 'tap' || inside || card.contains(document.activeElement)) return;
    clearTimeout(closing);
    closing = setTimeout(() => hide(), 180);
  }
  function read(href?: string, text?: string) {
    if (!selected) return;
    const id = selected, trigger = opener;
    dismissed = id;
    hide();
    options.onRead(id, trigger, href, text);
  }
  function dismiss(restoreFocus: boolean) {
    dismissed = selected || pending;
    hide(restoreFocus);
  }

  card.addEventListener('pointerenter', () => { inside = true; clearTimeout(closing); }, { signal });
  card.addEventListener('pointerleave', () => { inside = false; leave(); }, { signal });
  card.addEventListener('focusin', () => clearTimeout(closing), { signal });
  card.addEventListener('focusout', event => {
    if (card.contains(event.relatedTarget as Node)) return;
    if (input === 'keyboard') hide();
    else leave();
  }, { signal });
  card.querySelector('[data-details-close]')!.addEventListener('click', () => dismiss(input !== 'hover'), { signal });
  card.querySelector('[data-details-read]')!.addEventListener('click', () => read(), { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) { event.preventDefault(); dismiss(input !== 'hover'); }
  }, { signal });
  document.addEventListener('pointerdown', event => {
    const target = event.target as Node;
    if (target instanceof Element && root.contains(target) && target.closest('[data-studio-hotspot],[data-studio-destination]')) return;
    if (!card.contains(target) && !opener?.contains(target)) hide();
  }, { signal });
  // Scrolling invalidates a 3D object's screen-space anchor. Touch sheets stay put.
  window.addEventListener('scroll', () => { if (input === 'hover') hide(); }, { signal, passive: true });
  window.addEventListener('resize', () => hide(), { signal, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); }, { signal });
  hoverMedia.addEventListener('change', () => hide(), { signal });

  return {
    canHover: (event?: PointerEvent) => hoverMedia.matches && (!event || event.pointerType === 'mouse' || event.pointerType === 'pen'),
    hover(id?: string, source?: HTMLElement, target?: Anchor) {
      if (!id) { leave(); return; }
      clearTimeout(closing);
      if (selected === id || pending === id || dismissed === id) return;
      clearTimeout(opening);
      input = 'hover';
      pending = id;
      opening = setTimeout(() => show(id, source, target), 220);
    },
    toggle(id: string, source: HTMLElement | undefined, keyboard = false) {
      if (selected === id) { dismiss(true); return; }
      dismissed = undefined;
      input = keyboard ? 'keyboard' : 'tap';
      show(id, source);
    },
    leave,
    close: () => { dismissed = undefined; hide(); },
    dispose() { events.abort(); clearIntent(); clearTimeout(hiding); cancelAnimationFrame(frame); card.remove(); },
  };
}
