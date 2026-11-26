import type { StudioObject } from '../lib/studio-content';
import { expandedWindow, fitWindow, initialWindow, isSheet, moveWindow, resizeWindow, scaleWindow, type WindowRect } from '../lib/drawer-geometry';

interface DrawerOptions { onChange: (id: string | undefined, expanded: boolean) => void }
interface ReadingPage { href: string; title: string; scroll: number }
type Mode = 'closed' | 'normal' | 'maximized' | 'minimized';
type Gesture = { kind: 'move' | 'resize'; x: number; y: number; rect: WindowRect; pointerId: number; handle: HTMLElement };

export function createStudioDrawer(root: HTMLElement, objects: StudioObject[], options: DrawerOptions) {
  const dialog = root.querySelector<HTMLDialogElement>('[data-studio-drawer]')!;
  const dock = root.querySelector<HTMLElement>('[data-drawer-dock]')!;
  const frame = dialog.querySelector<HTMLIFrameElement>('[data-drawer-frame]')!;
  const title = dialog.querySelector<HTMLElement>('[data-drawer-title]')!;
  const kicker = dialog.querySelector<HTMLElement>('[data-drawer-kicker]')!;
  const body = dialog.querySelector<HTMLElement>('[data-drawer-body]')!;
  const loading = dialog.querySelector<HTMLElement>('[data-drawer-loading]')!;
  const error = dialog.querySelector<HTMLElement>('[data-drawer-error]')!;
  const back = dialog.querySelector<HTMLButtonElement>('[data-drawer-back]')!;
  const maximize = dialog.querySelector<HTMLButtonElement>('[data-drawer-maximize]')!;
  const smaller = dialog.querySelector<HTMLButtonElement>('[data-drawer-smaller]')!;
  const larger = dialog.querySelector<HTMLButtonElement>('[data-drawer-larger]')!;
  const help = dialog.querySelector<HTMLElement>('[data-drawer-help]')!;
  const drag = dialog.querySelector<HTMLElement>('[data-drawer-drag]')!;
  const grip = dialog.querySelector<HTMLElement>('[data-drawer-resize]')!;
  const events = new AbortController();
  const parent = document.documentElement;
  // Keep the reading window out of the bookshop's clipping and stacking contexts.
  document.body.append(dialog, dock);

  const viewport = () => ({ width: document.documentElement.clientWidth, height: innerHeight });
  let mode: Mode = 'closed', beforeMinimize: 'normal' | 'maximized' = 'normal';
  let rect = initialWindow(viewport()), normalRect = { ...rect }, sheet = isSheet(viewport());
  let selected: string | undefined, opener: HTMLElement | undefined, pages: ReadingPage[] = [];
  let expected = '', loadTimer: ReturnType<typeof setTimeout> | undefined, openingTimer: ReturnType<typeof setTimeout> | undefined;
  let childEvents: AbortController | undefined, gesture: Gesture | undefined;
  let pendingRect: WindowRect | undefined, gestureFrame = 0, disposed = false;

  function applyRect(next: WindowRect) {
    rect = fitWindow(next, viewport());
    if (mode === 'normal') normalRect = { ...rect };
    Object.assign(dialog.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    dialog.dataset.mode = mode;
    maximize.setAttribute('aria-pressed', String(mode === 'maximized'));
    maximize.setAttribute('aria-label', mode === 'maximized' ? '还原内容窗口' : '最大化内容窗口');
    larger.disabled = mode === 'maximized' || (rect.width >= expandedWindow(viewport()).width - 1 && rect.height >= expandedWindow(viewport()).height - 1);
    smaller.disabled = rect.height <= Math.min(280, expandedWindow(viewport()).height) && (sheet || rect.width <= 380);
    help.textContent = sheet ? '拖动标题栏调整高度 · 点上方按钮放大阅读' : '拖动标题栏移动 · 拖动右下角调整大小 · Esc 关闭';
  }
  function updateTitle(text: string) {
    title.textContent = text;
    title.title = text;
    dock.querySelector('[data-drawer-dock-title]')!.textContent = text;
    frame.title = `书屋内容：${text}`;
  }
  function syncFrameAppearance() {
    const child = frame.contentDocument?.documentElement;
    if (!child || !expected) return;
    for (const key of ['theme', 'font', 'cards', 'layout']) {
      const value = parent.dataset[key];
      if (value && child.dataset[key] !== value) child.dataset[key] = value;
    }
    child.dataset.studioEmbed = 'true';
    const motion = mode === 'minimized' ? 'off' : parent.dataset.motion || 'on';
    if (child.dataset.motion !== motion) child.dataset.motion = motion;
    for (const key of ['--hue', '--reading-size']) {
      const value = parent.style.getPropertyValue(key) || getComputedStyle(parent).getPropertyValue(key);
      if (child.style.getPropertyValue(key) !== value) child.style.setProperty(key, value);
    }
  }
  function focusTitle() { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  function showWindow() {
    if (mode === 'minimized') mode = beforeMinimize;
    else if (mode === 'closed') mode = 'normal';
    dock.hidden = true;
    applyRect(mode === 'maximized' ? expandedWindow(viewport()) : normalRect);
    if (!dialog.open) {
      dialog.dataset.opening = '';
      dialog.show();
      clearTimeout(openingTimer);
      openingTimer = setTimeout(() => { delete dialog.dataset.opening; }, 250);
    }
    syncFrameAppearance();
    options.onChange(selected, true);
    focusTitle();
  }
  function finishGesture() {
    if (gestureFrame) cancelAnimationFrame(gestureFrame);
    gestureFrame = 0;
    if (pendingRect) applyRect(pendingRect);
    pendingRect = undefined;
    const previous = gesture;
    gesture = undefined;
    delete dialog.dataset.gesture;
    if (previous?.handle.hasPointerCapture(previous.pointerId)) previous.handle.releasePointerCapture(previous.pointerId);
  }
  function close() {
    if (mode === 'closed') return;
    finishGesture();
    mode = 'closed';
    if (dialog.open) dialog.close();
    dock.hidden = true;
    clearTimeout(loadTimer);
    clearTimeout(openingTimer);
    delete dialog.dataset.opening;
    childEvents?.abort();
    expected = '';
    frame.removeAttribute('src');
    frame.tabIndex = -1;
    pages = [];
    selected = undefined;
    options.onChange(undefined, false);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function minimize() {
    finishGesture();
    beforeMinimize = mode === 'maximized' ? 'maximized' : 'normal';
    mode = 'minimized';
    dialog.close();
    dock.hidden = false;
    syncFrameAppearance();
    options.onChange(selected, false);
    dock.querySelector<HTMLButtonElement>('[data-drawer-restore]')!.focus({ preventScroll: true });
  }
  function toggleMaximize() {
    finishGesture();
    mode = mode === 'maximized' ? 'normal' : 'maximized';
    applyRect(mode === 'maximized' ? expandedWindow(viewport()) : normalRect);
  }
  function scale(factor: number) {
    if (mode === 'maximized') { mode = 'normal'; rect = fitWindow(normalRect, viewport()); }
    applyRect(scaleWindow(rect, factor, viewport()));
  }
  function failLoad() {
    clearTimeout(loadTimer);
    body.dataset.state = 'error';
    loading.hidden = true;
    error.hidden = false;
    frame.tabIndex = -1;
  }
  function saveScroll() {
    const page = pages.at(-1);
    if (page && body.dataset.state === 'ready') page.scroll = frame.contentWindow?.scrollY || 0;
  }
  function loadPage(page: ReadingPage) {
    childEvents?.abort();
    const url = new URL(page.href, location.href);
    if (url.origin !== location.origin) return;
    url.searchParams.set('studio-embed', '1');
    expected = url.href;
    body.dataset.state = 'loading';
    loading.hidden = false;
    error.hidden = true;
    frame.tabIndex = -1;
    updateTitle(page.title);
    back.disabled = pages.length < 2;
    back.title = pages.length > 1 ? `返回：${pages.at(-2)!.title}` : '已经在目录页';
    clearTimeout(loadTimer);
    loadTimer = setTimeout(failLoad, 20000);
    const current = frame.contentWindow;
    if (current && frame.contentDocument?.documentElement.hasAttribute('data-blog-theme')) {
      const retained = new URL(current.location.href);
      if (retained.pathname === url.pathname && retained.search === url.search) {
        // Changing only an iframe fragment does not fire a new load event.
        // Reuse the document, rebind its navigation, and reveal the target section.
        current.location.hash = url.hash;
        loaded();
        return;
      }
    }
    frame.src = expected;
  }
  function navigate(href: string, label: string) {
    const next = new URL(href, location.href);
    if (next.origin !== location.origin) return;
    next.searchParams.delete('studio-embed');
    saveScroll();
    pages.push({ href: next.href, title: label, scroll: 0 });
    loadPage(pages.at(-1)!);
  }
  function backPage() {
    if (pages.length < 2) return;
    pages.pop();
    loadPage(pages.at(-1)!);
  }
  function escape(event: KeyboardEvent, child?: Document) {
    if (event.key !== 'Escape' || !dialog.open || event.defaultPrevented) return;
    // Image viewers and other nested modal controls get the first Escape.
    if (document.querySelector('dialog:modal') || child?.querySelector('dialog[open]')) return;
    event.preventDefault();
    close();
  }
  function loaded() {
    if (!expected || mode === 'closed') return;
    const doc = frame.contentDocument, win = frame.contentWindow;
    if (!doc || !win) { failLoad(); return; }
    const actual = new URL(win.location.href), desired = new URL(expected);
    if (actual.pathname.replace(/\/$/, '') !== desired.pathname.replace(/\/$/, '') || actual.search !== desired.search) return;
    if (!doc.documentElement.hasAttribute('data-blog-theme')) { failLoad(); return; }
    clearTimeout(loadTimer);
    childEvents?.abort();
    childEvents = new AbortController();
    const signal = childEvents.signal;
    syncFrameAppearance();
    const page = pages.at(-1)!;
    const targetSection = desired.hash ? doc.getElementById(decodeURIComponent(desired.hash.slice(1))) : undefined;
    const targetHeading = targetSection?.querySelector('h1,h2');
    page.title = (targetHeading || doc.querySelector('main h1'))?.textContent?.trim() || page.title;
    updateTitle(page.title);
    loading.hidden = error.hidden = true;
    body.dataset.state = 'ready';
    frame.tabIndex = 0;
    // Each page keeps its own original scripts, gallery, and 3D demonstrations.
    // Same-site links stay inside this reading window and form a local back stack.
    doc.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const node = event.target as Element | null;
      const anchor = node?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;
      const href = anchor.getAttribute('href')!;
      if (href.startsWith('#') || /^(mailto:|tel:)/i.test(href)) return;
      const target = new URL(anchor.href, win.location.href);
      if (target.origin !== location.origin || /\.(pdf|glb|xml|png|jpe?g|webp|zip)$/i.test(target.pathname)) {
        anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; return;
      }
      if (target.pathname === actual.pathname && target.hash && target.search === actual.search) return;
      event.preventDefault();
      navigate(target.href, anchor.textContent?.trim() || '接着阅读');
    }, { signal });
    doc.addEventListener('keydown', event => escape(event, doc), { signal });
    if (page.scroll) win.scrollTo({ top: page.scroll, behavior: 'instant' });
    else if (targetSection) targetSection.scrollIntoView({ block: 'start', behavior: 'instant' });
    else win.scrollTo({ top: 0, behavior: 'instant' });
  }

  function startGesture(event: PointerEvent, kind: Gesture['kind']) {
    if (event.button !== 0 || mode !== 'normal') return;
    event.preventDefault();
    finishGesture();
    delete dialog.dataset.opening;
    const handle = event.currentTarget as HTMLElement;
    gesture = { kind, x: event.clientX, y: event.clientY, rect: { ...rect }, pointerId: event.pointerId, handle };
    dialog.dataset.gesture = kind;
    handle.setPointerCapture(event.pointerId);
  }
  function moveGesture(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    pendingRect = gesture.kind === 'move' ? moveWindow(gesture.rect, dx, dy, viewport()) : resizeWindow(gesture.rect, dx, dy, viewport());
    if (!gestureFrame) gestureFrame = requestAnimationFrame(() => {
      gestureFrame = 0;
      if (pendingRect) applyRect(pendingRect);
      pendingRect = undefined;
    });
  }
  function keyGeometry(event: KeyboardEvent, kind: Gesture['kind']) {
    if (mode !== 'normal' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 16;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    applyRect(kind === 'move' ? moveWindow(rect, dx, dy, viewport()) : resizeWindow(rect, dx, dy, viewport()));
  }
  for (const [handle, kind] of [[drag, 'move'], [grip, 'resize']] as const) {
    handle.addEventListener('pointerdown', event => startGesture(event, kind), { signal: events.signal });
    handle.addEventListener('pointermove', moveGesture, { signal: events.signal });
    handle.addEventListener('pointerup', finishGesture, { signal: events.signal });
    handle.addEventListener('pointercancel', finishGesture, { signal: events.signal });
    handle.addEventListener('lostpointercapture', finishGesture, { signal: events.signal });
    handle.addEventListener('keydown', event => keyGeometry(event, kind), { signal: events.signal });
  }
  drag.addEventListener('dblclick', toggleMaximize, { signal: events.signal });
  dialog.querySelector('[data-drawer-minimize]')!.addEventListener('click', minimize, { signal: events.signal });
  maximize.addEventListener('click', toggleMaximize, { signal: events.signal });
  smaller.addEventListener('click', () => scale(1 / 1.12), { signal: events.signal });
  larger.addEventListener('click', () => scale(1.12), { signal: events.signal });
  back.addEventListener('click', backPage, { signal: events.signal });
  dialog.querySelector('[data-drawer-retry]')!.addEventListener('click', () => { if (pages.length) loadPage(pages.at(-1)!); }, { signal: events.signal });
  [...dialog.querySelectorAll('[data-drawer-close]'), ...dock.querySelectorAll('[data-drawer-close]')].forEach(button => button.addEventListener('click', close, { signal: events.signal }));
  dock.querySelector('[data-drawer-restore]')!.addEventListener('click', showWindow, { signal: events.signal });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }, { signal: events.signal });
  document.addEventListener('keydown', event => escape(event), { signal: events.signal });
  frame.addEventListener('load', loaded, { signal: events.signal });
  frame.addEventListener('error', failLoad, { signal: events.signal });
  window.addEventListener('resize', () => {
    finishGesture();
    const nextSheet = isSheet(viewport());
    if (sheet !== nextSheet) { sheet = nextSheet; normalRect = initialWindow(viewport()); }
    else normalRect = fitWindow(normalRect, viewport());
    if (dialog.open) applyRect(mode === 'maximized' ? expandedWindow(viewport()) : normalRect);
  }, { signal: events.signal, passive: true });
  const appearance = new MutationObserver(syncFrameAppearance);
  appearance.observe(parent, { attributes: true, attributeFilter: ['data-theme', 'data-font', 'data-motion', 'data-layout', 'data-cards', 'style'] });

  return {
    open(id: string, trigger?: HTMLElement, page?: { href: string; title: string }) {
      const object = objects.find(item => item.id === id);
      if (!object || disposed) return;
      opener = trigger || root.querySelector<HTMLElement>(`[data-studio-destination="${id}"]`) || undefined;
      const same = selected === id && pages.length > 0 && !page;
      selected = id;
      kicker.textContent = `${object.label} / 月湾书屋`;
      showWindow();
      if (!same) { pages = []; navigate(page?.href || object.href, page?.title || object.title); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      finishGesture();
      events.abort(); childEvents?.abort(); appearance.disconnect(); clearTimeout(loadTimer); clearTimeout(openingTimer);
      frame.removeAttribute('src');
      if (dialog.open) dialog.close();
      dialog.remove(); dock.remove();
    },
  };
}
