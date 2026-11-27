
import { onPageMount } from '../lib/page-lifecycle';

onPageMount(scope => {


const sceneRoot = document.documentElement;
const sceneHost = document.querySelector<HTMLElement>('[data-hero-scene]');
const studioWorld = document.querySelector<HTMLElement>('[data-hero-world]');
const sceneSurface = sceneHost?.closest<HTMLElement>('.home-hero');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const pointerPreference = matchMedia('(hover: hover) and (pointer: fine)');

if (sceneHost && studioWorld && sceneSurface) {
  let inView = true;
  let frame = 0;
  let x = 0;
  let y = 0;
  const canMove = () => sceneRoot.dataset.petals !== 'off' && !motionPreference.matches;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    studioWorld.style.removeProperty('--studio-rx');
    studioWorld.style.removeProperty('--studio-ry');
  };
  const sync = () => {
    sceneHost.dataset.active = String(inView && !document.hidden && canMove());
    if (!canMove() || !pointerPreference.matches || !inView || document.hidden) reset();
  };
  sceneSurface.addEventListener('pointermove', (event) => {
    if (!canMove() || !pointerPreference.matches || !inView) return;
    const rect = sceneSurface.getBoundingClientRect();
    x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    if (!frame) frame = scope.requestAnimationFrame(() => {
      frame = 0;
      studioWorld.style.setProperty('--studio-rx', `${-y * 5}deg`);
      studioWorld.style.setProperty('--studio-ry', `${x * 8}deg`);
    });
  }, scope.options({ passive: true }));
  sceneSurface.addEventListener('pointerleave', reset, scope.options());
  sceneSurface.addEventListener('pointercancel', reset, scope.options());
  if ('IntersectionObserver' in window) {
    scope.observe(new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: .01 })).observe(sceneSurface);
  }
  scope.observe(new MutationObserver(sync)).observe(sceneRoot, { attributes: true, attributeFilter: ['data-petals'] });
  motionPreference.addEventListener('change', sync, scope.options());
  pointerPreference.addEventListener('change', sync, scope.options());
  document.addEventListener('visibilitychange', sync, scope.options());
  sync();
}
});
