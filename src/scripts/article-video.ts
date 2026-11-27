
import { onPageMount } from '../lib/page-lifecycle';

onPageMount(scope => {

function notifyParentVideo(playing: boolean) {
 if (window.parent === window) return;
 try {
  playing ||= [...document.querySelectorAll<HTMLVideoElement>('video')].some(video => !video.paused && !video.ended);
  const frame = [...window.parent.document.querySelectorAll('iframe')].find(item => item.contentWindow === window);
  frame?.dispatchEvent(new CustomEvent(playing ? 'moon:video-play' : 'moon:video-pause', { bubbles: true }));
 } catch { /* A third-party host owns playback coordination. */ }
}
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
  }, scope.options());
});

document.querySelectorAll<HTMLVideoElement>('[data-article-video-player]').forEach(video => {
  video.addEventListener('play', () => notifyParentVideo(true), scope.options());
  video.addEventListener('pause', () => notifyParentVideo(false), scope.options());
  video.addEventListener('ended', () => notifyParentVideo(false), scope.options());
  const error = video.parentElement?.querySelector<HTMLElement>('[data-video-error]');
  const revealError = () => { if (error) error.hidden = false; };
  video.addEventListener('error', revealError, scope.options());
  // A source element reports format/network failures separately in some browsers.
  video.querySelector('source')?.addEventListener('error', revealError, scope.options());
  video.addEventListener('loadeddata', () => { if (error) error.hidden = true; }, scope.options());
  scope.onPageHide(() => { video.pause(); notifyParentVideo(false); });
});
});
