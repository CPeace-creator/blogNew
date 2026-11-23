const gallery = document.querySelector<HTMLDialogElement>('[data-article-gallery]');
const stage = gallery?.querySelector('[data-gallery-stage]');
const caption = gallery?.querySelector('[data-gallery-caption]');
const closeButton = gallery?.querySelector<HTMLButtonElement>('[data-gallery-close]');
const previous = gallery?.querySelector<HTMLButtonElement>('[data-gallery-prev]');
const next = gallery?.querySelector<HTMLButtonElement>('[data-gallery-next]');
const pictures = [...document.querySelectorAll<HTMLImageElement>('.prose img')]
  .filter((picture) => !picture.closest('a, button, [data-comparison]'));

if (gallery && stage && caption && closeButton && previous && next && typeof gallery.showModal === 'function') {
  let current = 0;
  let trigger: HTMLButtonElement | undefined;

  function largestVariant(picture: HTMLImageElement) {
    const variants = picture.srcset.split(',').map((candidate) => {
      const [url, width] = candidate.trim().split(/\s+/);
      return { url, width: Number.parseInt(width, 10) };
    }).filter(({ url, width }) => url && Number.isFinite(width));
    return variants.sort((a, b) => b.width - a.width)[0]?.url || picture.currentSrc || picture.src;
  }

  const show = (index: number) => {
    if (index < 0 || index >= pictures.length) return;
    current = index;
    const source = pictures[index];
    const image = new window.Image();
    image.alt = source.alt || `文章配图 ${index + 1}`;
    image.decoding = 'async';
    image.addEventListener('error', () => {
      if (image.isConnected) stage.textContent = '图片暂时无法加载';
    });
    stage.replaceChildren(image);
    image.src = largestVariant(source);
    caption.textContent = `${index + 1} / ${pictures.length} · ${image.alt}`;
    previous.disabled = index === 0;
    next.disabled = index === pictures.length - 1;
    if ((previous.disabled && document.activeElement === previous) || (next.disabled && document.activeElement === next)) closeButton.focus();
  };

  pictures.forEach((picture, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-image-trigger';
    button.setAttribute('aria-label', `放大${picture.alt ? `「${picture.alt}」` : `第 ${index + 1} 张配图`}`);
    picture.before(button);
    button.append(picture);
    button.addEventListener('click', () => {
      trigger = button;
      show(index);
      gallery.showModal();
      closeButton.focus();
    });
  });
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  closeButton.addEventListener('click', () => gallery.close());
  gallery.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  gallery.addEventListener('close', () => {
    stage.replaceChildren();
    trigger?.focus();
  });
}
