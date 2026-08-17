const scheduleScene = () => {
  const start = () => void import('./hero-scene');
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(start, { timeout: 1200 });
  } else {
    window.setTimeout(start, 350);
  }
};

if (document.readyState === 'complete') {
  scheduleScene();
} else {
  window.addEventListener('load', scheduleScene, { once: true });
}
