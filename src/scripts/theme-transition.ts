let active: ViewTransition | undefined;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stop = () => { if (reducedMotion.matches || document.documentElement.dataset.motion === 'off') active?.skipTransition(); };
reducedMotion.addEventListener('change', stop);
new MutationObserver(stop).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
addEventListener('pagehide', () => active?.skipTransition());

export function transitionTheme(change: () => void, event: MouseEvent) {
  const root = document.documentElement;
  active?.skipTransition();
  if (!document.startViewTransition || root.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) { change(); return; }
  const bounds = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
  const x = event.detail ? event.clientX : bounds ? bounds.left + bounds.width / 2 : innerWidth / 2;
  const y = event.detail ? event.clientY : bounds ? bounds.top + bounds.height / 2 : innerHeight / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  let committed = false;
  const commit = () => { if (!committed) { committed = true; change(); } };
  root.dataset.themeTransition = '';
  try {
    const transition = document.startViewTransition(commit);
    active = transition;
    void transition.ready.then(() => {
      if (active !== transition || root.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const animation = root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
        duration: 460, easing: 'cubic-bezier(.2,.65,.3,1)', pseudoElement: '::view-transition-new(theme-root)',
      });
      void animation.finished.catch(() => {});
    }).catch(() => {});
    void transition.finished.catch(() => {}).finally(() => {
      if (active === transition) { active = undefined; delete root.dataset.themeTransition; }
    });
  } catch { delete root.dataset.themeTransition; commit(); }
}
