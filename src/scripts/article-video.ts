document.querySelectorAll<HTMLElement>('[data-video-embed]').forEach(stage => {
  const button = stage.querySelector<HTMLButtonElement>('[data-video-load]');
  button?.addEventListener('click', () => {
    if (stage.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = stage.dataset.videoTitle || '演示视频';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = stage.dataset.videoEmbedUrl!;
    stage.replaceChildren(frame);
    frame.focus({ preventScroll: true });
  });
});

document.querySelectorAll<HTMLVideoElement>('[data-article-video-player]').forEach(video => {
  const error = video.parentElement?.querySelector<HTMLElement>('[data-video-error]');
  const revealError = () => { if (error) error.hidden = false; };
  video.addEventListener('error', revealError);
  // A source element reports format/network failures separately in some browsers.
  video.querySelector('source')?.addEventListener('error', revealError);
  video.addEventListener('loadeddata', () => { if (error) error.hidden = true; });
  window.addEventListener('pagehide', () => video.pause());
});
