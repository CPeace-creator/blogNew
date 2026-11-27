import { moonState } from '../lib/moon-events';

// This controller and its audio node survive client-side page navigation.
const root = document.querySelector<HTMLElement>('[data-site-music]');
if (root && root.dataset.controller !== 'ready' && document.documentElement.dataset.studioEmbed !== 'true') {
 root.dataset.controller = 'ready';
 const audio = root.querySelector<HTMLAudioElement>('[data-bgm]')!;
 const slider = root.querySelector<HTMLInputElement>('[data-music-volume]')!;
 const status = root.querySelector<HTMLElement>('[data-music-status]')!;
 const details = root.querySelector<HTMLElement>('.music-details')!;
 const storageKey = 'moon-bgm';
 let wanted = true, waiting = false, videoPaused = false, playPending = false;
 const activeVideos = new Set<Element>();
 try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); wanted = saved.wanted !== false; if (Number.isFinite(saved.volume)) slider.value = String(Math.max(0, Math.min(100, saved.volume))); } catch {}
 audio.volume = Number(slider.value) / 100;
 const save = () => { try { localStorage.setItem(storageKey, JSON.stringify({ wanted, volume: Number(slider.value) })); } catch {} };
 function show(state: string, message: string) {
  root!.dataset.state = state;
  status.textContent = message;
  const playing = !audio.paused && !audio.error;
  root!.querySelectorAll<HTMLButtonElement>('[data-music-toggle]').forEach(button => {
   button.setAttribute('aria-pressed', String(playing));
   button.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
  });
  moonState.playing = playing;
  window.dispatchEvent(new CustomEvent('moon:music', { detail: { playing } }));
 }
 async function play() {
  if (!wanted || playPending || activeVideos.size) return;
  if (!audio.getAttribute('src')) { show('unavailable', '这首音乐暂时无法载入，可以打开音乐来源收听。'); return; }
  playPending = true;
  show('loading', '音乐正在靠近。');
  try { await audio.play(); waiting = false; }
  catch (error) {
   if (error instanceof DOMException && error.name === 'NotAllowedError') { waiting = true; show('waiting', '轻点页面，让音乐陪你逛一会儿。'); }
   else if (error instanceof DOMException && error.name === 'AbortError') { /* A quick pause or navigation superseded this play. */ }
   else { waiting = false; show('error', '音乐暂未载入，轻点播放重试。'); }
  } finally { playPending = false; }
 }
 function toggle() {
  if (!audio.paused || playPending) { wanted = false; waiting = false; audio.pause(); show('paused', '音乐已暂停。'); }
  else { wanted = true; videoPaused = false; activeVideos.clear(); if (audio.error) audio.load(); void play(); }
  save();
 }
 root.querySelectorAll('[data-music-toggle]').forEach(button => button.addEventListener('click', toggle));
 window.addEventListener('moon:music-toggle', toggle);
 root.querySelectorAll('[data-music-expand]').forEach(button => button.addEventListener('click', () => {
  details.hidden = !details.hidden;
  root.querySelector('[aria-controls="music-details"]')!.setAttribute('aria-expanded', String(!details.hidden));
 }));
 document.addEventListener('click', event => {
  if (!(event.target as Element)?.closest('[data-open-music]')) return;
  details.hidden = !details.hidden;
  root.querySelector('[aria-controls="music-details"]')!.setAttribute('aria-expanded', String(!details.hidden));
  if (!details.hidden) root.querySelector<HTMLButtonElement>('[data-music-toggle]')?.focus({ preventScroll: true });
 });
 slider.addEventListener('input', () => { audio.volume = Number(slider.value) / 100; root.querySelector('[data-music-volume-label]')!.textContent = `${slider.value}%`; save(); });
 root.querySelector('[data-music-volume-label]')!.textContent = `${slider.value}%`;
 audio.addEventListener('playing', () => { if (!wanted || activeVideos.size) { audio.pause(); return; } show('playing', '正在播放，慢慢逛就好。'); });
 audio.addEventListener('pause', () => show('paused', videoPaused ? '看视频时，音乐先休息一会儿。' : '音乐已暂停。'));
 audio.addEventListener('waiting', () => show('loading', '正在缓冲音乐。'));
 audio.addEventListener('error', () => { waiting = false; show('error', '音乐暂未载入，轻点播放重试。'); });
 audio.addEventListener('volumechange', () => save());
 const unlock = (event: Event) => {
  if (!event.isTrusted || !waiting || !wanted || (event.target as Element)?.closest?.('[data-site-music], [data-companion-music]')) return;
  if (event instanceof KeyboardEvent && ['Shift','Control','Alt','Meta','Tab'].includes(event.key)) return;
  void play();
 };
 document.addEventListener('click', unlock);
 document.addEventListener('keydown', unlock);
 function videoEvent(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLVideoElement) && !(target instanceof HTMLIFrameElement)) return;
  const playing = event.type === 'play' || event.type === 'moon:video-play';
  if (playing) { activeVideos.add(target); if (!audio.paused) { videoPaused = true; audio.pause(); } }
  else { activeVideos.delete(target); if (!activeVideos.size && videoPaused && wanted) { videoPaused = false; void play(); } }
 }
 for (const type of ['play','pause','ended','moon:video-play','moon:video-pause']) document.addEventListener(type, videoEvent, true);
 document.addEventListener('astro:before-swap', () => { activeVideos.clear(); videoPaused = false; });
 document.addEventListener('astro:page-load', () => {
  if (wanted && audio.paused && !waiting) void play();
  window.dispatchEvent(new CustomEvent('moon:music', { detail: { playing: !audio.paused } }));
 });
 window.addEventListener('pagehide', save);
 if (wanted) void play(); else show('paused', '音乐已暂停。');
}
