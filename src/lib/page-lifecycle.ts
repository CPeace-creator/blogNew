/** Page scripts are mounted once per document and released before Astro swaps it. */
export class PageScope {
  private controller = new AbortController();
  private cleanups: Array<() => void> = [];
  readonly signal = this.controller.signal;

  options(options?: boolean | AddEventListenerOptions): AddEventListenerOptions {
    return { ...(typeof options === 'boolean' ? { capture: options } : options), signal: this.signal };
  }
  cleanup(callback: () => void) { this.cleanups.push(callback); }
  observe<T extends { disconnect(): void }>(observer: T): T {
    this.cleanup(() => observer.disconnect());
    return observer;
  }
  onPageHide(callback: (event: PageTransitionEvent) => void) {
    this.cleanup(() => callback(new PageTransitionEvent('pagehide')));
  }
  setTimeout(callback: () => void, delay?: number): number {
    const id = window.setTimeout(() => { if (!this.signal.aborted) callback(); }, delay);
    this.cleanup(() => clearTimeout(id));
    return id;
  }
  setInterval(callback: () => void, delay?: number): number {
    const id = window.setInterval(callback, delay);
    this.cleanup(() => clearInterval(id));
    return id;
  }
  requestAnimationFrame(callback: FrameRequestCallback): number {
    const id = window.requestAnimationFrame(time => { if (!this.signal.aborted) callback(time); });
    // Frames are short lived. Abort guards avoid retaining one cleanup per frame.
    return id;
  }
  dispose() {
    if (this.signal.aborted) return;
    for (const cleanup of this.cleanups.reverse()) {
      try { cleanup(); } catch (error) { console.warn('Page cleanup failed.', error); }
    }
    this.controller.abort();
    this.cleanups = [];
  }
}

const mounts = new Set<() => void>();
const scopes = new Map<() => void, PageScope>();
let swapping = false;

export function onPageMount(callback: (scope: PageScope) => void) {
  const mount = () => {
    if (swapping || scopes.has(mount)) return;
    const scope = new PageScope();
    scopes.set(mount, scope);
    callback(scope);
  };
  mounts.add(mount);
  mount();
}

document.addEventListener('astro:before-swap', () => {
  swapping = true;
  for (const scope of scopes.values()) scope.dispose();
  scopes.clear();
  document.body.classList.remove('dialog-open');
  document.documentElement.removeAttribute('data-home-notebook-open');
});
document.addEventListener('astro:page-load', () => {
  swapping = false;
  for (const mount of mounts) mount();
});
window.addEventListener('pagehide', () => {
  for (const scope of scopes.values()) scope.dispose();
  scopes.clear();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) for (const mount of mounts) mount();
});
