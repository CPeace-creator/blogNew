
import { onPageMount } from '../lib/page-lifecycle';

onPageMount(scope => {


const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const motionEnabled = () => !reducedMotion.matches && root.dataset.motion !== 'off';
const resets: Array<() => void> = [];
const cardResets: Array<() => void> = [];

document.querySelectorAll<HTMLElement>('[data-post-card], .landing-profile').forEach(card => {
  let frame = 0;
  let bounds: DOMRect | undefined;
  let x = .5;
  let y = .5;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    bounds = undefined;
    card.removeAttribute('data-tilt-active');
    for (const name of ['--card-rx', '--card-ry', '--shine-x', '--shine-y']) card.style.removeProperty(name);
  };
  resets.push(reset);
  cardResets.push(reset);
  card.addEventListener('pointermove', event => {
    if (!motionEnabled() || !finePointer.matches || event.pointerType !== 'mouse' || document.querySelector('dialog[open]')) return;
    bounds ??= card.getBoundingClientRect();
    x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    if (frame) return;
    frame = scope.requestAnimationFrame(() => {
      frame = 0;
      card.dataset.tiltActive = '';
      card.style.setProperty('--card-rx', `${(.5 - y) * 4}deg`);
      card.style.setProperty('--card-ry', `${(x - .5) * 5}deg`);
      card.style.setProperty('--shine-x', `${x * 100}%`);
      card.style.setProperty('--shine-y', `${y * 100}%`);
    });
  }, scope.options());
  card.addEventListener('pointerleave', reset, scope.options());
  card.addEventListener('pointercancel', reset, scope.options());
});

const hero = document.querySelector<HTMLElement>('.landing-hero');
if (hero) {
  let visible = false;
  let frame = 0;
  let x = 0;
  let y = 0;
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    x = y = 0;
    for (const name of ['--hero-x', '--hero-y', '--hero-scroll']) root.style.removeProperty(name);
  };
  resets.push(reset);
  const request = () => {
    if (frame || !visible || !motionEnabled() || !finePointer.matches || document.hidden) return;
    frame = scope.requestAnimationFrame(() => {
      frame = 0;
      root.style.setProperty('--hero-x', String(x));
      root.style.setProperty('--hero-y', String(y));
      root.style.setProperty('--hero-scroll', String(Math.min(scrollY, hero.offsetHeight)));
    });
  };
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const bounds = hero.getBoundingClientRect();
    x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    request();
  }, scope.options());
  hero.addEventListener('pointerleave', reset, scope.options());
  addEventListener('scroll', request, scope.options({ passive: true }));
  if ('IntersectionObserver' in window) scope.observe(new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) request(); else reset();
  })).observe(hero);
}

const entries = [...document.querySelectorAll<HTMLElement>('.feed-grid > div, .notes-list > article, .project-list > div')];
let revealObserver: IntersectionObserver | undefined;
const showAll = () => {
  revealObserver?.disconnect();
  entries.forEach(entry => { entry.dataset.reveal = 'shown'; entry.style.removeProperty('--entry-delay'); });
};
if (motionEnabled() && 'IntersectionObserver' in window) {
  revealObserver = scope.observe(new IntersectionObserver(records => {
    for (const record of records) {
      if (!record.isIntersecting) continue;
      (record.target as HTMLElement).dataset.reveal = 'shown';
      revealObserver!.unobserve(record.target);
    }
  }, { threshold: .06 }));
  entries.forEach((entry, index) => {
    entry.dataset.reveal = 'pending';
    entry.style.setProperty('--entry-delay', `${index % 2 * 65}ms`);
    revealObserver!.observe(entry);
    entry.addEventListener('focusin', () => { entry.dataset.reveal = 'shown'; revealObserver?.unobserve(entry); }, scope.options());
  });
}
const resetAll = () => { resets.forEach(reset => reset()); if (!motionEnabled()) showAll(); };
scope.observe(new MutationObserver(resetAll)).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-image', 'data-layout', 'data-wallpaper'] });
reducedMotion.addEventListener('change', resetAll, scope.options());
finePointer.addEventListener('change', resetAll, scope.options());
addEventListener('resize', resetAll, scope.options({ passive: true }));
addEventListener('scroll', () => cardResets.forEach(reset => reset()), scope.options({ passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); }, scope.options());
scope.onPageHide(() => { resetAll(); showAll(); });
addEventListener('pageshow', event => { if (event.persisted) showAll(); }, scope.options());
});
