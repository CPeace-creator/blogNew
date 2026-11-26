import { setAvatarPresentation } from '../lib/avatar/presentation';

const companion = document.querySelector<HTMLElement>('[data-avatar-root]');
if (companion) {
  let controller: { dispose: () => void } | undefined;
  let mountEvents: AbortController | undefined;
  let loading = false, closed = false;
  const start = async (): Promise<void> => {
    if (controller || loading || closed) return;
    loading = true;
    setAvatarPresentation(companion, 'loading');
    try {
      const { mountAvatar } = await import('./avatar-scene');
      if (closed) return;
      const mounting = new AbortController();
      mountEvents = mounting;
      const mounted = await mountAvatar(companion, mounting.signal);
      if (closed || mounting.signal.aborted) { mounted?.dispose(); return; }
      controller = mounted;
    } catch (error) {
      if (!closed) {
        console.warn('Car preview unavailable; offering a retry.', error);
        setAvatarPresentation(companion, 'error');
      }
    } finally {
      loading = false;
      if (!closed && !controller && mountEvents?.signal.aborted) void start();
    }
  };
  // Load the renderer when the welcome card is close to the viewport.
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void start(); }
  }, { rootMargin: '120px' });
  observer.observe(companion);
  companion.querySelector<HTMLButtonElement>('[data-avatar-retry]')!.addEventListener('click', () => {
    if (loading || closed) return;
    controller?.dispose();
    controller = undefined;
    void start();
  });
  window.addEventListener('pagehide', () => { closed = true; mountEvents?.abort(); observer.disconnect(); controller?.dispose(); controller = undefined; });
  window.addEventListener('pageshow', event => { if (event.persisted) { closed = false; void start(); } });
}
