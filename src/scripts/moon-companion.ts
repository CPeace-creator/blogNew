import { moonState, setMoonNight } from '../lib/moon-events';
import type { WhaleController } from '../lib/whale-live2d';
import type { WhaleMood, WhaleMotion } from '../lib/whale-reactions';

const root = document.querySelector<HTMLElement>('[data-moon-companion]');
if (root && root.dataset.controller !== 'ready' && document.documentElement.dataset.studioEmbed !== 'true') {
 root.dataset.controller = 'ready';
 const character = root.querySelector<HTMLButtonElement>('[data-companion-character]')!;
 const bubble = root.querySelector<HTMLElement>('[data-companion-bubble]')!;
 const speech = root.querySelector<HTMLElement>('[data-companion-speech]')!;
 const menu = root.querySelector<HTMLElement>('[data-companion-menu]')!;
 const menuToggle = root.querySelector<HTMLButtonElement>('[data-companion-menu-toggle]')!;
 const storageKey = 'moon-companion';
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let timer = 0, reaction = 0, gazeFrame = 0;
 let compact = matchMedia('(max-width:640px)').matches;
 let position: { x: number; y: number } | undefined;
 let drag: { id: number; x: number; y: number; left: number; top: number; moved: boolean } | undefined;
 let suppressClick = false;
 let clickTimer = 0, holdTimer = 0, held = false, faceTaps = 0, bodyTaps = 0, headPats = 0, lastPat = 0;
 let reactionId = 0;
 let modelController: WhaleController | undefined, loadingModel: Promise<void> | undefined;
 let modelEvents: AbortController | undefined;
 const host = root.querySelector<HTMLElement>('[data-live2d-host]')!;
 const modelStatus = root.querySelector<HTMLElement>('[data-live2d-status]')!;
 async function startModel(): Promise<void> {
  if (modelController || compact || document.hidden || loadingModel) return loadingModel;
  root!.dataset.modelState = 'loading'; character.disabled = true;
  modelStatus.textContent = '小汐正在准备中';
  loadingModel = (async () => {
   try {
    const { mountWhale } = await import('../lib/whale-live2d');
    const events = new AbortController(); modelEvents = events;
    modelController = await mountWhale(root!,host,events.signal);
    if (!modelController || events.signal.aborted) return;
    root!.dataset.modelState = 'ready'; character.disabled = false;
   } catch (error) {
    root!.dataset.modelState = 'error'; modelStatus.textContent = '小汐暂时没能赶来';
    console.warn('Whale Live2D could not load.',error);
   }
  })().finally(() => { loadingModel = undefined; });
  return loadingModel;
 }
 try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (typeof saved.compact === 'boolean') compact = saved.compact; if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) position = { x: saved.x, y: saved.y }; } catch {}
 function save() { try { localStorage.setItem(storageKey, JSON.stringify({ compact, x: position?.x, y: position?.y })); } catch {} }
 function closeMenu() {
  const restoreFocus = menu.contains(document.activeElement);
  menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menuToggle.focus({ preventScroll:true });
 }
 function openMenu() { menu.hidden = false; menuToggle.setAttribute('aria-expanded','true'); bubble.hidden = true; positionMenu(); menu.querySelector<HTMLElement>('button')?.focus({ preventScroll:true }); }
 function positionMenu() {
  const bounds = root!.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const width = menu.offsetWidth, height = menu.offsetHeight;
  const fitsAbove = bounds.top >= height+16;
  const preferredX = fitsAbove ? bounds.right-width : bounds.left+bounds.width/2 < viewportWidth/2 ? bounds.right+8 : bounds.left-width-8;
  const left = Math.max(8,Math.min(viewportWidth-width-8,preferredX));
  const top = fitsAbove ? bounds.top-height-8 : Math.max(8,Math.min(innerHeight-height-8,bounds.top));
  menu.style.left = `${left-bounds.left}px`; menu.style.top = `${top-bounds.top}px`;
  menu.style.right = 'auto'; menu.style.bottom = 'auto';
 }
 function say(text: string, mood: WhaleMood = 'idle') {
  clearTimeout(timer); clearTimeout(reaction);
  speech.textContent = text; bubble.hidden = false; root!.dataset.mood = mood;
  timer = window.setTimeout(() => { bubble.hidden = true; }, 6000);
  reaction = window.setTimeout(() => { root!.dataset.mood = 'idle'; }, 3000);
 }
 const reactions: Record<string,{text:string;mood:WhaleMood;motion?:WhaleMotion}> = {
  wave:{text:'收到！送你一个双倍的耶。',mood:'wave'},
  happy:{text:'摸摸头收到啦，今天也要有好心情。',mood:'happy'},
  shy:{text:'脸颊有点热，先躲一下下。',mood:'shy'},
  stars:{text:'眼睛里装满小星星，分你一颗。',mood:'stars'},
  wink:{text:'眨一下眼，这是我们的小暗号。',mood:'wink'},
  heart:{text:'喜欢和你一起待在月湾。',mood:'heart'},
  curious:{text:'嗯？今天想聊点什么？',mood:'curious'},
  bubble:{text:'呼，送你一颗小泡泡。',mood:'idle',motion:'bubble'},
  selfie:{text:'看这里——咔嚓，记住今天的好心情。',mood:'idle',motion:'selfie'},
  splash:{text:'尾巴有点痒！噗，溅起一朵小水花。',mood:'curious',motion:'splash'},
  reset:{text:'好啦，乖乖坐好，继续陪你。',mood:'idle'},
 };
 async function react(action: string, message?: string) {
  const choice = reactions[action];
  if (!choice) return;
  const currentReaction = ++reactionId;
  clearTimeout(clickTimer);
  closeMenu();
  if (!modelController) await startModel();
  if (currentReaction !== reactionId || compact || document.hidden) return;
  root!.dataset.mood = 'idle';
  modelController?.reset();
  root!.dataset.lastReaction = action;
  say(message || choice.text,choice.mood);
  if (choice.motion) {
   try {
    const started = await modelController?.motion(choice.motion);
    if (currentReaction !== reactionId) return;
    if (!started) say(root!.dataset.quiet==='true' ? '动态已经收起，我就安静陪着你。' : '等我准备一下，再陪你玩。',choice.mood);
   } catch { if (currentReaction === reactionId) say('这次没做好，再试一次好不好？','curious'); }
  }
 }
 function place() {
  root!.dataset.collapsed = String(compact);
  if (!position) {
   for (const property of ['left','top','right','bottom']) { root!.style.removeProperty(property); bubble.style.removeProperty(property); }
   if (!menu.hidden) positionMenu();
   return;
  }
  const bounds = root!.getBoundingClientRect();
  position.x = Math.max(8, Math.min(document.documentElement.clientWidth - bounds.width - 8, position.x));
  position.y = Math.max(60, Math.min(innerHeight - bounds.height - 10, position.y));
  root!.style.left = `${position.x}px`; root!.style.top = `${position.y}px`; root!.style.right = 'auto'; root!.style.bottom = 'auto';
  bubble.style.right = position.x < innerWidth / 2 ? 'auto' : '4px';
  bubble.style.left = position.x < innerWidth / 2 ? '0' : 'auto';
  bubble.style.bottom = position.y < 130 ? 'auto' : 'calc(100% + 10px)';
  bubble.style.top = position.y < 130 ? 'calc(100% + 8px)' : 'auto';
  if (!menu.hidden) positionMenu();
 }
 function cancelGesture() {
  clearTimeout(clickTimer); clearTimeout(holdTimer);
  const pointer = drag?.id;
  drag = undefined; held = false; suppressClick = true; root!.dataset.dragging = 'false';
  if (pointer !== undefined && character.hasPointerCapture(pointer)) character.releasePointerCapture(pointer);
 }
 function setCompact(value: boolean) {
  cancelGesture(); reactionId++; modelController?.reset();
  compact = value; closeMenu(); bubble.hidden = true; position = undefined; place(); save();
  if (!value) void startModel();
  else root!.querySelector<HTMLElement>('[data-companion-restore]')!.focus({ preventScroll:true });
 }
 root.querySelector('[data-live2d-retry]')!.addEventListener('click', () => { modelEvents?.abort(); modelController = undefined; void startModel(); });
 root.querySelector('[data-companion-collapse]')!.addEventListener('click', () => setCompact(true));
 root.querySelector('[data-companion-restore]')!.addEventListener('click', () => { setCompact(false); say('我在这里。想去书屋，还是翻一篇文章？', 'wave'); character.focus({ preventScroll: true }); });
 menuToggle.addEventListener('click', () => { if (menu.hidden) openMenu(); else closeMenu(); });
 document.addEventListener('pointerdown', event => { if (!root!.contains(event.target as Node)) closeMenu(); });
 document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuToggle.focus({ preventScroll: true }); } });
 root.querySelector('[data-companion-music]')!.addEventListener('click', () => { window.dispatchEvent(new CustomEvent('moon:music-toggle')); closeMenu(); });
 menu.addEventListener('click',event => {
  const action = (event.target as Element).closest<HTMLElement>('[data-companion-action]')?.dataset.companionAction;
  if (action) void react(action);
 });
 root.querySelector('[data-companion-top]')!.addEventListener('click', () => { scrollTo({ top: 0, behavior: reduced.matches || document.documentElement.dataset.motion === 'off' ? 'instant' : 'smooth' }); closeMenu(); });
 root.querySelector<HTMLAnchorElement>('[data-companion-random]')!.addEventListener('click', event => {
  const posts: Array<{ title: string; href: string }> = JSON.parse(document.querySelector('[data-companion-posts]')?.textContent || '[]');
  const candidates = posts.filter(post => new URL(post.href, location.href).pathname !== location.pathname);
  const post = candidates[Math.floor(Math.random() * candidates.length)];
  if (post) { (event.currentTarget as HTMLAnchorElement).href = post.href; say(`一起翻翻《${post.title}》。`, 'happy'); }
  closeMenu();
 });
 character.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary || drag) return;
  clearTimeout(clickTimer); clearTimeout(holdTimer); held = false;
  const rect = root!.getBoundingClientRect();
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
  suppressClick = false;
  character.setPointerCapture(event.pointerId);
  holdTimer = window.setTimeout(() => {
   if (!drag || drag.moved) return;
   held = true; suppressClick = true; openMenu();
  },550);
 });
 character.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX-drag.x, dy = event.clientY-drag.y;
  if (!drag.moved && Math.hypot(dx,dy) > 7) { clearTimeout(holdTimer); clearTimeout(clickTimer); drag.moved = true; closeMenu(); bubble.hidden = true; root!.dataset.dragging = 'true'; }
  if (drag.moved) { position = { x: drag.left + dx, y: drag.top + dy }; place(); }
 });
 function finishDrag(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  if (event.type === 'pointercancel') { cancelGesture(); return; }
  clearTimeout(holdTimer);
  suppressClick = drag.moved || held;
  if (drag.moved && position) {
   const width = document.documentElement.clientWidth;
   position.x = position.x + root!.offsetWidth / 2 < width / 2 ? 12 : width-root!.offsetWidth-12;
   place(); save();
   if (event.type !== 'pointercancel') void react('wave','这里风景不错，就在这里陪着你吧。');
  }
  drag = undefined; root!.dataset.dragging = 'false';
  if (character.hasPointerCapture(event.pointerId)) character.releasePointerCapture(event.pointerId);
 }
 character.addEventListener('pointerup', finishDrag);
 character.addEventListener('pointercancel', finishDrag);
 character.addEventListener('lostpointercapture', () => { clearTimeout(holdTimer); drag = undefined; root!.dataset.dragging = 'false'; });
 character.addEventListener('contextmenu',event => { event.preventDefault(); clearTimeout(holdTimer); clearTimeout(clickTimer); held=true; suppressClick=true; openMenu(); });
 character.addEventListener('click', event => {
  if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
  if (!event.detail) { void react('wave'); return; }
  if (event.detail>1) return;
  const zone = modelController?.hitZone(event.clientX,event.clientY);
  if (!zone) return;
  clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => {
   if (zone==='head') {
    const now = performance.now(); headPats = now-lastPat<5000 ? headPats+1 : 1; lastPat=now;
    void react(headPats>=3 ? 'heart' : 'happy',headPats>=3 ? '今天已经收到好多摸摸头啦，喜欢你。' : undefined);
   } else if (zone==='face') void react(['wink','shy','heart'][faceTaps++%3]);
   else if (zone==='tail') void react('splash');
   else void react(bodyTaps++%2 ? 'stars' : 'curious',moonState.arrived ? '车停好啦，要不要一起翻一篇文章？' : undefined);
  },230);
 });
 character.addEventListener('dblclick',event => { clearTimeout(clickTimer); if (!suppressClick && modelController?.hitZone(event.clientX,event.clientY)) void react('selfie'); });
 character.addEventListener('keydown', event => {
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); cancelGesture(); openMenu(); return; }
  if (event.key === 'Home') { event.preventDefault(); position = undefined; place(); save(); return; }
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault(); const rect = root!.getBoundingClientRect(); position = { x: rect.left, y: rect.top };
  const step = event.shiftKey ? 30 : 12;
  position.x += event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
  position.y += event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
  place(); save();
 });
 document.addEventListener('pointermove', event => {
  if (gazeFrame || drag || compact || reduced.matches || document.documentElement.dataset.motion === 'off' || event.pointerType !== 'mouse' || root!.dataset.obscured === 'true') return;
  const { clientX, clientY } = event;
  gazeFrame = requestAnimationFrame(() => {
   gazeFrame = 0; const bounds = character.getBoundingClientRect();
   const x = Math.max(-1, Math.min(1, (clientX-bounds.left-bounds.width/2)/Math.max(200,innerWidth*.5)));
   const y = Math.max(-1, Math.min(1, (clientY-bounds.top-bounds.height*.3)/Math.max(200,innerHeight*.5)));
   modelController?.look(x,y);
  });
 }, { passive: true });
 window.addEventListener('moon:journey', event => {
  if (event.detail.phase === 'departing') say('出发！我在樱花树下等你。', 'wave');
  if (event.detail.phase === 'parked') say('到啦，欢迎来月湾书屋。今天想翻哪一篇？', 'wave');
  if (event.detail.phase === 'error') { root!.dataset.mood = 'idle'; }
 });
 window.addEventListener('moon:wind', () => say('看，花瓣落下来了。', 'happy'));
 window.addEventListener('moon:lighting', event => { root!.dataset.night = String(event.detail.night); if (event.detail.source !== 'theme') say(event.detail.night ? '月湾亮灯了，车灯也一起点亮。' : '天亮啦，继续慢慢逛。', 'idle'); });
 window.addEventListener('moon:music', event => { root!.dataset.playing = String(event.detail.playing); const button = root!.querySelector('[data-companion-music]')!; button.setAttribute('aria-pressed', String(event.detail.playing)); button.querySelector('span')!.textContent = event.detail.playing ? '暂停背景音乐' : '听一会儿音乐'; });
 const sync = () => {
  root!.dataset.quiet = String(document.hidden || reduced.matches || document.documentElement.dataset.motion === 'off');
  root!.dataset.obscured = String(Boolean(document.querySelector('dialog[open]')));
  root!.dataset.night = String(moonState.night);
 };
 let lastTheme = document.documentElement.dataset.theme;
 const observer = new MutationObserver(() => {
  const next = document.documentElement.dataset.theme;
  if (next !== lastTheme) { lastTheme = next; setMoonNight(next === 'dark', 'theme'); }
  sync();
 });
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion','data-theme'] });
 // Observe dialog state, not animation styles, to keep this inexpensive.
 const dialogs = new MutationObserver(sync);
 function page() {
  cancelGesture();
  root!.dataset.reading = String(document.documentElement.hasAttribute('data-reading-page'));
  root!.dataset.playing = String(moonState.playing);
  dialogs.disconnect(); document.querySelectorAll('dialog').forEach(dialog => dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  closeMenu(); sync(); place();
 }
 document.addEventListener('astro:page-load', page);
 document.addEventListener('visibilitychange', sync);
 document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelGesture(); reactionId++; modelController?.reset(); closeMenu(); }
  else if (!modelController && !compact) void startModel();
 });
 reduced.addEventListener('change', sync);
 window.addEventListener('resize', place);
 page();
 if (!compact) void startModel();
 window.addEventListener('pagehide',event => { if (!event.persisted) modelEvents?.abort(); });
 if (!compact) say('你好，我是小汐。沿着月湾小路，来书屋坐坐吧。', 'wave');
}
