const scheduleScene = () => {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void import('./hero-scene');
  };
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };
  const useIdle = typeof idleWindow.requestIdleCallback === 'function';

  if (useIdle) {
    idleWindow.requestIdleCallback?.(start, { timeout: 1200 });
  }
  window.setTimeout(start, useIdle ? 1250 : 350);
};

if (document.readyState === 'complete') {
  scheduleScene();
} else {
  window.addEventListener('load', scheduleScene, { once: true });
}
