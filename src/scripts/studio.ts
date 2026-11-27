import type { StudioObject } from '../lib/studio-content';
import { createStudioDrawer } from './studio-drawer';
import { createStudioDetails } from './studio-details';
import { onPageMount } from '../lib/page-lifecycle';
import { journeyPhase, moonState, setMoonNight } from '../lib/moon-events';

interface StudioController {
 reset(): void; setNight(night: boolean): void; setEntryProgress(progress: number): void;
 driveIn(): Promise<void>; parkCar(): Promise<void>; blowPetals(): void; dispose(): void;
}

onPageMount(scope => {
 document.querySelectorAll<HTMLElement>('[data-studio-root]').forEach(root => {
  const viewport = root.querySelector<HTMLElement>('[data-studio-viewport]')!;
  const host = root.querySelector<HTMLElement>('[data-studio-canvas]')!;
  const hotspots = root.querySelector<HTMLElement>('[data-studio-hotspots]')!;
  const tools = root.querySelector<HTMLElement>('[data-studio-tools]')!;
  const status = root.querySelector<HTMLElement>('[data-studio-status]')!;
  const retry = root.querySelector<HTMLButtonElement>('[data-studio-retry]')!;
  const caption = root.querySelector<HTMLElement>('[data-studio-caption]')!;
  const journeyStatus = root.querySelector<HTMLElement>('[data-journey-status]')!;
  const windButton = root.querySelector<HTMLButtonElement>('[data-studio-wind]')!;
  const nightButton = root.querySelector<HTMLButtonElement>('[data-studio-night]')!;
  const objects: StudioObject[] = JSON.parse(root.querySelector('[data-studio-content]')?.textContent || '[]');
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-studio-hotspot],[data-studio-destination]')];
  let selected: string | undefined, controller: StudioController | undefined;
  let startPromise: Promise<void> | undefined, closed = false, driving = false, entryFrame = 0;
  let night = moonState.night;
  let lastTheme = document.documentElement.dataset.theme;
  const highlight = (id?: string) => {
   links.forEach(link => {
    const active = (link.dataset.studioHotspot || link.dataset.studioDestination) === id;
    link.setAttribute('aria-expanded', String(active)); link.toggleAttribute('data-active', active);
   });
   const object = objects.find(item => item.id === id);
   caption.textContent = object ? `${object.label} · ${object.title}` : '在物件间停留，让故事慢慢展开。';
  };
  const drawer = createStudioDrawer(root, objects, { onChange: (id, expanded) => {
   selected = expanded ? id : undefined;
   links.forEach(link => link.setAttribute('aria-controls', expanded && (link.dataset.studioHotspot || link.dataset.studioDestination) === id ? 'studio-content-window' : 'studio-object-details'));
   highlight(selected);
  }});
  const details = createStudioDetails(root, objects, {
   onChange: highlight,
   onRead: (id, trigger, href, title) => drawer.open(id, trigger, href ? { href, title: title || '接着阅读' } : undefined),
  });
  function hover(id?: string, point?: { x: number; y: number }) {
   if (selected || driving) return;
   details.hover(id, links.find(link => link.dataset.studioHotspot === id && !link.hidden), point ? { left: point.x-12, right: point.x+12, top: point.y-12, bottom: point.y+12 } : undefined);
  }
  function syncEntry() {
   entryFrame = 0;
   if (!controller || driving) return;
   const bounds = viewport.getBoundingClientRect();
   controller.setEntryProgress(Math.max(0, Math.min(1, (innerHeight-bounds.top)/(innerHeight*.85))));
  }
  function requestEntry() { if (!entryFrame && !closed) entryFrame = scope.requestAnimationFrame(syncEntry); }
  function updateLighting() {
   viewport.dataset.lighting = night ? 'night' : 'day';
   nightButton.setAttribute('aria-pressed', String(night));
   root.querySelector('[data-studio-night-label]')!.textContent = night ? '日间模式' : '月夜模式';
   controller?.setNight(night);
  }
  function showFallback() {
   controller?.dispose(); controller = undefined;
   viewport.dataset.state = 'fallback'; tools.hidden = true; hotspots.hidden = true;
   retry.hidden = false; retry.disabled = false;
   status.textContent = '当前显示静态预览，下方栏目仍可打开内容。';
  }
  async function start(): Promise<void> {
   if (controller || closed) return;
   if (startPromise) return startPromise;
   startPromise = (async () => {
    retry.hidden = true; viewport.dataset.state = 'loading'; status.textContent = '正在走进书屋。';
    try {
     const { mountStudio } = await import('./studio-scene');
     if (closed) return;
     const mounted = await mountStudio(host, hotspots, root.dataset.studioModel!, {
      onSelect: id => details.toggle(id, links.find(link => link.dataset.studioDestination === id)),
      onHover: hover, onCarSelect: () => { void drive(); }, pageScroll: true, night,
      onProgress: progress => { status.textContent = progress ? `书屋正在准备中 · ${progress}%` : '书屋正在准备中。'; },
      onUnavailable: showFallback,
     });
     if (closed) { mounted.dispose(); return; }
     controller = mounted; viewport.dataset.state = 'ready'; tools.hidden = false; hotspots.hidden = false;
     updateLighting(); syncEntry();
     if ((moonState.arrived || !root.classList.contains('studio-experience--home')) && !driving) {
      await mounted.parkCar();
      if (!closed) { moonState.arrived = true; root.dataset.journey = 'parked'; journeyStatus.textContent = '大 G 停在樱花树旁，接着慢慢逛。'; }
     }
    } catch (error) { if (!closed) { console.warn('Studio unavailable.', error); showFallback(); } }
   })().finally(() => { startPromise = undefined; });
   return startPromise;
  }
  async function drive() {
   if (driving || closed) return;
   driving = true; windButton.disabled = true;
   details.close(); journeyStatus.textContent = '出发，去樱花树下坐坐。'; root.dataset.journey = 'departing';
   journeyPhase('departing');
   document.querySelector<HTMLAnchorElement>('[data-home-tab="studio"]')?.click();
   root.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off' ? 'instant' : 'smooth' });
   try {
    await start();
    if (closed) return;
    if (!controller) throw new Error('Studio did not load');
    root.dataset.journey = 'arriving'; journeyPhase('arriving'); journeyStatus.textContent = '大 G 正沿着月湾小路驶来。';
    await controller.driveIn();
    if (closed) return;
    root.dataset.journey = 'parked'; journeyPhase('parked');
    journeyStatus.textContent = '停靠樱花树旁，欢迎来书屋坐坐。';
   } catch (error) {
    if (!closed) { root.dataset.journey = 'error'; journeyPhase('error'); journeyStatus.textContent = '这次没能出发，可以重试，或先翻翻下方文章。'; console.warn('Arrival unavailable.', error); }
   } finally { driving = false; if (!closed) windButton.disabled = false; }
  }
  window.addEventListener('moon:drive', () => { void drive(); }, scope.options());
  links.forEach(link => {
   const id = link.dataset.studioHotspot || link.dataset.studioDestination;
   let pointerType = '';
   link.addEventListener('pointerenter', event => { if (!selected && !driving && details.canHover(event)) details.hover(id, link); }, scope.options());
   link.addEventListener('pointerleave', () => details.leave(), scope.options());
   link.addEventListener('pointerdown', event => { pointerType = event.pointerType; }, scope.options());
   link.addEventListener('blur', event => { if (!(event.relatedTarget as Element | null)?.closest('[data-studio-details]')) details.leave(); }, scope.options());
   link.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (id && (event.detail === 0 || pointerType === 'touch' || !details.canHover())) details.toggle(id, link, event.detail === 0);
   }, scope.options());
  });
  retry.addEventListener('click', start, scope.options());
  root.querySelector('[data-studio-reset]')!.addEventListener('click', () => { details.close(); controller?.reset(); }, scope.options());
  nightButton.addEventListener('click', () => setMoonNight(!night, 'studio'), scope.options());
  window.addEventListener('moon:lighting', event => { night = event.detail.night; updateLighting(); }, scope.options());
  const themeObserver = scope.observe(new MutationObserver(() => {
   const next = document.documentElement.dataset.theme;
   if (next !== lastTheme) { lastTheme = next; setMoonNight(next === 'dark', 'theme'); }
  }));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  windButton.addEventListener('click', async () => {
   windButton.disabled = true;
   try { await start(); if (closed) return; if (controller) { controller.blowPetals(); journeyStatus.textContent = '风穿过樱花树，花瓣落在月湾小路上。'; window.dispatchEvent(new CustomEvent('moon:wind')); } }
   finally { if (!closed) windButton.disabled = false; }
  }, scope.options());
  window.addEventListener('scroll', requestEntry, scope.options({ passive: true }));
  window.addEventListener('resize', requestEntry, scope.options({ passive: true }));
  document.addEventListener('home-panel-change', () => { details.close(); requestEntry(); }, scope.options());
  const preload = scope.observe(new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { preload.disconnect(); void start(); } }, { rootMargin: '160px 0px' }));
  preload.observe(viewport);
  updateLighting();
  scope.cleanup(() => {
   closed = true; cancelAnimationFrame(entryFrame); controller?.dispose(); details.dispose(); drawer.dispose();
   if (driving) journeyPhase('error');
  });
 });
});
