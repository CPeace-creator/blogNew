const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const motionEnabled = () => !reducedMotion.matches && finePointer.matches && document.documentElement.dataset.petals !== 'off';
const resetEffects: Array<() => void> = [];

function attachDepth(surface: HTMLElement, target: HTMLElement, scene = false) {
  let bounds: DOMRect | undefined;
  let frame = 0;
  let x = .5;
  let y = .5;
  const reset = () => {
    if (!bounds && !frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
    bounds = undefined;
    target.style.removeProperty(scene ? '--scene-x' : '--tilt-x');
    target.style.removeProperty(scene ? '--scene-y' : '--tilt-y');
    target.style.removeProperty('--shine-x');
    target.style.removeProperty('--shine-y');
  };
  resetEffects.push(reset);
  surface.addEventListener('pointerenter', () => {
    if (motionEnabled()) bounds = surface.getBoundingClientRect();
  });
  surface.addEventListener('pointermove', (event) => {
    if (!motionEnabled()) return;
    bounds ??= surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      target.style.setProperty(scene ? '--scene-x' : '--tilt-x', `${(.5 - y) * (scene ? 12 : 4)}deg`);
      target.style.setProperty(scene ? '--scene-y' : '--tilt-y', `${(x - .5) * (scene ? 18 : 5)}deg`);
      if (!scene) {
        target.style.setProperty('--shine-x', `${x * 100}%`);
        target.style.setProperty('--shine-y', `${y * 100}%`);
      }
    });
  });
  surface.addEventListener('pointerleave', reset);
  surface.addEventListener('pointercancel', reset);
}

document.querySelectorAll<HTMLElement>('[data-post-card], [data-depth-card]').forEach((card) => attachDepth(card, card));
const headerStage = document.querySelector<HTMLElement>('[data-header-stage]');
const headerWorld = document.querySelector<HTMLElement>('[data-header-world]');
if (headerStage && headerWorld) attachDepth(headerStage, headerWorld, true);

const resetAll = () => resetEffects.forEach((reset) => reset());
reducedMotion.addEventListener('change', resetAll);
finePointer.addEventListener('change', resetAll);
addEventListener('resize', resetAll, { passive: true });
addEventListener('scroll', resetAll, { passive: true });
new MutationObserver(() => { if (!motionEnabled()) resetAll(); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['data-petals'] });
