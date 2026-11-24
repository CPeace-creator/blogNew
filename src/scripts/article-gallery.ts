import { clampView, fittedSize, gestureView, MAX_ZOOM, type GalleryView, type Point, type Size } from '../lib/gallery-geometry';

const gallery = document.querySelector<HTMLDialogElement>('[data-article-gallery]');
const stage = gallery?.querySelector<HTMLElement>('[data-gallery-stage]');
const caption = gallery?.querySelector('[data-gallery-caption]');
const closeButton = gallery?.querySelector<HTMLButtonElement>('[data-gallery-close]');
const previous = gallery?.querySelector<HTMLButtonElement>('[data-gallery-prev]');
const next = gallery?.querySelector<HTMLButtonElement>('[data-gallery-next]');
const zoomIn = gallery?.querySelector<HTMLButtonElement>('[data-gallery-zoom-in]');
const zoomOut = gallery?.querySelector<HTMLButtonElement>('[data-gallery-zoom-out]');
const resetButton = gallery?.querySelector<HTMLButtonElement>('[data-gallery-reset]');
const zoomLabel = gallery?.querySelector<HTMLElement>('[data-gallery-zoom]');
const pictures = [...document.querySelectorAll<HTMLImageElement>('.prose img')]
  .filter(picture => !picture.closest('a, button, [data-comparison]'));

if (gallery && stage && caption && closeButton && previous && next && zoomIn && zoomOut && resetButton && zoomLabel) {
  let current = 0;
  let trigger: HTMLButtonElement | undefined;
  let image: HTMLImageElement | undefined;
  let view: GalleryView = { scale: 1, x: 0, y: 0 };
  let imageSize: Size = { width: 0, height: 0 };
  let frameSize: Size = { width: 0, height: 0 };
  const pointers = new Map<number, Point>();
  let startView = { ...view };
  let startPoint: Point = { x: 0, y: 0 };
  let startDistance = 1;
  let swipeStart: Point | undefined;
  let swipeTime = 0;
  let didPinch = false;

  function render() {
    const loaded = Boolean(image?.naturalWidth && imageSize.width);
    view = clampView(view, frameSize, imageSize);
    if (image) image.style.transform = `translate(-50%, -50%) translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`;
    zoomLabel!.textContent = `${Math.round(view.scale * 100)}%`;
    zoomIn!.disabled = !loaded || view.scale >= MAX_ZOOM;
    zoomOut!.disabled = !loaded || view.scale <= 1;
    resetButton!.disabled = !loaded || view.scale === 1;
    stage!.dataset.zoomed = String(view.scale > 1);
    stage!.dataset.dragging = String(pointers.size > 0);
  }
  function fit() {
    if (!image?.naturalWidth || !gallery!.open) return;
    frameSize = { width: stage!.clientWidth, height: stage!.clientHeight };
    imageSize = fittedSize({ width: image.naturalWidth, height: image.naturalHeight }, frameSize);
    image.style.width = `${imageSize.width}px`;
    image.style.height = `${imageSize.height}px`;
    render();
  }
  function reset() { view = { scale: 1, x: 0, y: 0 }; render(); }
  function releasePointers() {
    for (const id of pointers.keys()) if (stage!.hasPointerCapture(id)) stage!.releasePointerCapture(id);
    pointers.clear();
  }
  function show(index: number) {
    if (index < 0 || index >= pictures.length) return;
    releasePointers();
    current = index;
    const source = pictures[index];
    const variants = source.srcset.split(',').map(candidate => {
      const [url, width] = candidate.trim().split(/\s+/);
      return { url, width: Number.parseInt(width, 10) };
    }).filter(candidate => candidate.url && Number.isFinite(candidate.width));
    const nextImage = new Image();
    image = nextImage;
    imageSize = { width: 0, height: 0 };
    view = { scale: 1, x: 0, y: 0 };
    nextImage.alt = source.alt || `文章配图 ${index + 1}`;
    nextImage.draggable = false;
    nextImage.decoding = 'async';
    nextImage.addEventListener('load', () => { if (image === nextImage) fit(); });
    nextImage.addEventListener('error', () => {
      if (image !== nextImage) return;
      stage!.textContent = '图片暂时无法加载，请关闭后重试。';
      image = undefined;
      render();
    });
    stage!.replaceChildren(nextImage);
    nextImage.src = variants.sort((a, b) => b.width - a.width)[0]?.url || source.currentSrc || source.src;
    caption!.textContent = `${index + 1} / ${pictures.length} · ${nextImage.alt}`;
    previous!.disabled = index === 0;
    next!.disabled = index === pictures.length - 1;
    render();
    if ((previous!.disabled && document.activeElement === previous) || (next!.disabled && document.activeElement === next)) closeButton!.focus();
  }
  function local(point: Point): Point {
    const bounds = stage!.getBoundingClientRect();
    return { x: point.x - bounds.left - bounds.width / 2, y: point.y - bounds.top - bounds.height / 2 };
  }
  function zoom(scale: number, anchor: Point = { x: 0, y: 0 }) {
    if (!image?.naturalWidth) return;
    view = gestureView(view, scale, anchor, anchor, frameSize, imageSize);
    render();
  }
  function rebase() {
    startView = { ...view };
    const points = [...pointers.values()];
    if (points.length === 1) startPoint = local(points[0]);
    if (points.length === 2) {
      startPoint = local({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      startDistance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
    }
  }
  pictures.forEach((picture, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-image-trigger';
    button.setAttribute('aria-label', `放大${picture.alt ? `「${picture.alt}」` : `第 ${index + 1} 张配图`}`);
    picture.before(button);
    button.append(picture);
    button.addEventListener('click', () => {
      trigger = button;
      gallery!.showModal();
      document.body.classList.add('dialog-open');
      show(index);
      closeButton!.focus();
    });
  });
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  closeButton.addEventListener('click', () => gallery.close());
  zoomIn.addEventListener('click', () => zoom(view.scale * 1.4));
  zoomOut.addEventListener('click', () => zoom(view.scale / 1.4));
  resetButton.addEventListener('click', reset);
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
    zoom(view.scale * Math.exp(-Math.max(-100, Math.min(100, delta)) * .003), local({ x: event.clientX, y: event.clientY }));
  }, { passive: false });
  stage.addEventListener('dblclick', event => {
    if (view.scale > 1) reset(); else zoom(2, local({ x: event.clientX, y: event.clientY }));
  });
  stage.addEventListener('pointerdown', event => {
    if (!image?.naturalWidth || pointers.size >= 2 || event.button !== 0) return;
    if (pointers.size === 0) { swipeStart = { x: event.clientX, y: event.clientY }; swipeTime = performance.now(); didPinch = false; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    if (pointers.size === 2) didPinch = true;
    rebase();
    render();
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()];
    const midpoint = points.length === 2 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
    const distance = points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : startDistance;
    view = gestureView(startView, startView.scale * distance / startDistance, startPoint, local(midpoint), frameSize, imageSize);
    render();
  });
  function endPointer(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (stage!.hasPointerCapture(event.pointerId)) stage!.releasePointerCapture(event.pointerId);
    if (!pointers.size && event.type === 'pointerup' && event.pointerType === 'touch' && !didPinch && view.scale === 1 && swipeStart) {
      const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
      if (performance.now() - swipeTime < 650 && Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) show(current + (dx < 0 ? 1 : -1));
    }
    rebase();
    render();
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('lostpointercapture', endPointer);
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(current + (event.key === 'ArrowLeft' ? -1 : 1)); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(view.scale * 1.4); }
    if (event.key === '-') { event.preventDefault(); zoom(view.scale / 1.4); }
    if (event.key === '0') { event.preventDefault(); reset(); }
  });
  gallery.addEventListener('close', () => {
    releasePointers();
    stage.replaceChildren();
    image = undefined;
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    trigger?.focus({ preventScroll: true });
  });
  if ('ResizeObserver' in window) new ResizeObserver(() => { releasePointers(); fit(); }).observe(stage);
}
