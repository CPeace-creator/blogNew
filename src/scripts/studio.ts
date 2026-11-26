import type { StudioObject } from '../lib/studio-content';
import { createStudioDrawer } from './studio-drawer';
import { createStudioDetails } from './studio-details';
interface StudioController {
    reset: () => void;
    setNight: (night: boolean) => void;
    setEntryProgress: (progress: number) => void;
    dispose: () => void;
}
document.querySelectorAll<HTMLElement>('[data-studio-root]').forEach(root => {
    const viewport = root.querySelector<HTMLElement>('[data-studio-viewport]')!;
    const host = root.querySelector<HTMLElement>('[data-studio-canvas]')!;
    const hotspots = root.querySelector<HTMLElement>('[data-studio-hotspots]')!;
    const tools = root.querySelector<HTMLElement>('[data-studio-tools]')!;
    const status = root.querySelector<HTMLElement>('[data-studio-status]')!;
    const retry = root.querySelector<HTMLButtonElement>('[data-studio-retry]')!;
    const caption = root.querySelector<HTMLElement>('[data-studio-caption]')!;
    const nightButton = root.querySelector<HTMLButtonElement>('[data-studio-night]')!;
    const objects: StudioObject[] = JSON.parse(root.querySelector('[data-studio-content]')?.textContent || '[]');
    const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-studio-hotspot],[data-studio-destination]')];
    let selected: string | undefined;
    function highlight(id?: string) {
        links.forEach(link => {
            const active = (link.dataset.studioHotspot || link.dataset.studioDestination) === id;
            link.setAttribute('aria-expanded', String(active));
            link.toggleAttribute('data-active', active);
        });
        const object = objects.find(item => item.id === id);
        caption.textContent = object ? `${object.label} · ${object.title}` : '在物件间停留，让故事慢慢展开。';
    }
    const drawer = createStudioDrawer(root, objects, { onChange: (id, expanded) => {
        selected = expanded ? id : undefined;
        links.forEach(link => link.setAttribute('aria-controls', expanded && (link.dataset.studioHotspot || link.dataset.studioDestination) === id ? 'studio-content-window' : 'studio-object-details'));
        highlight(expanded ? id : undefined);
    } });
    const details = createStudioDetails(root, objects, {
        onChange: highlight,
        onRead: (id, trigger, href, title) => drawer.open(id, trigger, href ? { href, title: title || '接着阅读' } : undefined),
    });
    let controller: StudioController | undefined;
    let loading = false;
    let pageClosed = false;
    let entryFrame = 0;
    let night = document.documentElement.dataset.theme === 'dark';
    let preload: IntersectionObserver | undefined;
    function hover(id?: string, point?: { x: number; y: number }) {
        if (selected) return;
        const source = links.find(link => link.dataset.studioHotspot === id && !link.hidden);
        details.hover(id, source, point ? { left: point.x - 12, right: point.x + 12, top: point.y - 12, bottom: point.y + 12 } : undefined);
    }
    function syncEntry() {
        entryFrame = 0;
        if (!controller)
            return;
        const bounds = viewport.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight * .85)));
        controller.setEntryProgress(progress);
    }
    function requestEntry() {
        if (!entryFrame && !pageClosed)
            entryFrame = requestAnimationFrame(syncEntry);
    }
    function updateLighting() {
        viewport.dataset.lighting = night ? 'night' : 'day';
        nightButton.setAttribute('aria-pressed', String(night));
        root.querySelector('[data-studio-night-label]')!.textContent = night ? '日间模式' : '月夜模式';
        controller?.setNight(night);
    }
    function showFallback() {
        controller?.dispose();
        controller = undefined;
        viewport.dataset.state = 'fallback';
        tools.hidden = true;
        hotspots.hidden = true;
        retry.hidden = false;
        retry.disabled = false;
        status.textContent = '当前显示静态预览，下方栏目仍可打开内容。';
    }
    async function start() {
        if (loading || controller || pageClosed)
            return;
        preload?.disconnect();
        loading = true;
        retry.hidden = true;
        viewport.dataset.state = 'loading';
        status.textContent = '正在走进书屋。';
        try {
            const { mountStudio } = await import('./studio-scene');
            if (pageClosed)
                return;
            controller = await mountStudio(host, hotspots, root.dataset.studioModel!, {
                onSelect: id => details.toggle(id, links.find(link => link.dataset.studioDestination === id)),
                onHover: hover,
                pageScroll: true,
                night,
                onProgress: progress => { status.textContent = progress ? `书屋正在准备中 · ${progress}%` : '书屋正在准备中。'; },
                onUnavailable: showFallback,
            });
            if (pageClosed) {
                controller.dispose();
                controller = undefined;
                return;
            }
            viewport.dataset.state = 'ready';
            tools.hidden = false;
            hotspots.hidden = false;
            updateLighting();
            syncEntry();
        }
        catch {
            showFallback();
        }
        finally {
            loading = false;
        }
    }
    links.forEach(link => {
        const id = link.dataset.studioHotspot || link.dataset.studioDestination;
        let pointerType = '';
        link.addEventListener('pointerenter', event => { if (!selected && details.canHover(event)) details.hover(id, link); });
        link.addEventListener('pointerleave', () => details.leave());
        link.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
        link.addEventListener('blur', event => {
            if (!(event.relatedTarget as Element | null)?.closest('[data-studio-details]')) details.leave();
        });
        link.addEventListener('click', event => {
            if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (id && (event.detail === 0 || pointerType === 'touch' || !details.canHover())) details.toggle(id, link, event.detail === 0);
        });
    });
    retry.addEventListener('click', start);
    root.querySelector('[data-studio-reset]')!.addEventListener('click', () => { details.close(); controller?.reset(); });
    nightButton.addEventListener('click', () => { night = !night; updateLighting(); });
    const themeObserver = new MutationObserver(() => { night = document.documentElement.dataset.theme === 'dark'; updateLighting(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('scroll', requestEntry, { passive: true });
    addEventListener('resize', requestEntry, { passive: true });
    document.addEventListener('home-panel-change', () => { details.close(); requestEntry(); });
    if ('IntersectionObserver' in window) {
        preload = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting))
            void start(); }, { rootMargin: '160px 0px', threshold: 0 });
        preload.observe(viewport);
    }
    else {
        void start();
    }
    addEventListener('pagehide', event => {
        if (event.persisted)
            return;
        pageClosed = true;
        cancelAnimationFrame(entryFrame);
        preload?.disconnect();
        themeObserver.disconnect();
        removeEventListener('scroll', requestEntry);
        removeEventListener('resize', requestEntry);
        controller?.dispose();
        details.dispose();
        drawer.dispose();
    });
});
