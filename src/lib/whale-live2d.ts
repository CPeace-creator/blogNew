import { withBase } from './paths';
import { whaleFaceValues, whaleHitZone, WHALE_MOTION_SECONDS, type WhaleMotion, type WhaleZone } from './whale-reactions';

interface PointControl { set(x: number, y?: number): void }
interface CoreModel {
 setParameterValueById(id: string, value: number): void;
 getModel(): { parameters: { ids: string[]; defaultValues: Float32Array } };
 saveParameters(): void;
}
interface WhaleModel {
 anchor: PointControl; position: PointControl; scale: PointControl;
 update(milliseconds: number): void;
 motion(group: string, index: number, priority: number): Promise<boolean>;
 destroy(options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void;
 internalModel: {
  originalWidth: number; originalHeight: number; coreModel: CoreModel;
  focusController: { x: number; y: number; targetX: number; targetY: number };
  eyeBlink?: unknown;
  on(event: string, callback: () => void): void;
  motionManager: { stopAllMotions(): void; isFinished(): boolean };
 };
}
interface PixiApplication {
 view: HTMLCanvasElement;
 stage: { addChild(model: WhaleModel): void };
 renderer: {
  gl: WebGLRenderingContext; resolution: number;
  resize(width: number, height: number): void; render(stage: unknown): void;
 };
 destroy(removeView: boolean, options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void;
}
interface PixiRuntime {
 Ticker: unknown;
 Application: new (options: Record<string, unknown>) => PixiApplication;
 live2d: { Live2DModel: { registerTicker(ticker: unknown): void; from(url: string, options: Record<string, unknown>): Promise<WhaleModel> } };
}

const scripts = new Map<string, Promise<void>>();
function loadScript(path: string): Promise<void> {
 const url = withBase(path);
 const existing = scripts.get(url);
 if (existing) return existing;
 const loading = new Promise<void>((resolve, reject) => {
  const script = document.createElement('script');
  script.src = url; script.async = true;
  script.onload = () => resolve();
  script.onerror = () => { script.remove(); scripts.delete(url); reject(new Error(`Live2D runtime could not load: ${path}`)); };
  document.head.append(script);
 });
 scripts.set(url, loading);
 return loading;
}

export interface WhaleController {
 look(x: number, y: number): void;
 hitZone(clientX: number, clientY: number): WhaleZone | undefined;
 motion(group: WhaleMotion): Promise<boolean>;
 reset(): void;
 dispose(): void;
}

/** Mount the repository's unmodified Cubism model in the persistent blog widget. */
export async function mountWhale(root: HTMLElement, host: HTMLElement, signal: AbortSignal): Promise<WhaleController | undefined> {
 await loadScript('/vendor/live2d/live2dcubismcore.min.js');
 await loadScript('/vendor/live2d/pixi.min.js');
 await loadScript('/vendor/live2d/cubism4.min.js');
 if (signal.aborted) return;
 const PIXI = (window as unknown as { PIXI: PixiRuntime }).PIXI;
 const app = new PIXI.Application({
  width: 768, height: 768, resolution: 1, backgroundAlpha: 0,
  antialias: true, autoDensity: true, preserveDrawingBuffer: true,
  autoStart: false, sharedTicker: false, powerPreference: 'low-power',
 });
 let model: WhaleModel | undefined;
 let disposed = false, frame = 0, lastPaint = 0, elapsed = 0;
 let targetX = 0, targetY = 0, gazeX = 0, gazeY = 0;
 let actionPlaying = false, actionEndsAt = 0, lastPointerAt = 0, motionVersion = 0;
 let loadingMotion: Promise<boolean> = Promise.resolve(false);
 let restorePose = () => {};
 let painted = { left: 0, top: 0, width: 1, height: 1 };
 let content = { left: 0, top: 0, right: 768, bottom: 768 };
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const moving = () => !reduced.matches && root.dataset.quiet !== 'true' && root.dataset.collapsed !== 'true' && root.dataset.obscured !== 'true' && !document.hidden;
 const render = () => { if (!disposed) app.renderer.render(app.stage); };
 let preferences: MutationObserver | undefined, resize: ResizeObserver | undefined;
 function dispose() {
  if (disposed) return;
  disposed = true; cancelAnimationFrame(frame);
  preferences?.disconnect(); resize?.disconnect();
  reduced.removeEventListener('change', sync);
  document.removeEventListener('visibilitychange', sync);
  signal.removeEventListener('abort', dispose);
  const gl = app.renderer.gl;
  app.destroy(true, { children: true, texture: true, baseTexture: true });
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  host.replaceChildren();
 }
 function request() { if (!frame && !disposed && moving()) frame = requestAnimationFrame(tick); }
 function tick(now: number) {
  frame = 0;
  if (disposed || !moving() || !model) return;
  if (now - lastPaint < 1000 / 24) { request(); return; }
  const delta = Math.min(50, now-lastPaint || 16);
  lastPaint = now; elapsed += delta;
  const idle = elapsed-lastPointerAt > 12000;
  const lookX = idle ? Math.sin(elapsed/4700)*.09 : targetX;
  const lookY = idle ? Math.cos(elapsed/6300)*.05 : targetY;
  gazeX += (lookX-gazeX)*.16; gazeY += (lookY-gazeY)*.16;
  const focus = model.internalModel.focusController;
  focus.x = focus.targetX = gazeX*.32;
  focus.y = focus.targetY = -gazeY*.22 + (root.dataset.reading === 'true' ? -.06 : 0);
  model.update(delta); render(); request();
 }
 function fit() {
  if (disposed || !model || !host.clientWidth || !host.clientHeight) return;
  const width = host.clientWidth, height = host.clientHeight;
  app.renderer.resolution = Math.min(devicePixelRatio || 1, 1.5);
  app.renderer.resize(width, height);
  const scale = Math.min((width-10)/(content.right-content.left), (height-10)/(content.bottom-content.top));
  model.scale.set(scale);
  painted = { left:(width-(content.right-content.left)*scale)/2, top:height-5-(content.bottom-content.top)*scale, width:(content.right-content.left)*scale, height:(content.bottom-content.top)*scale };
  model.position.set(painted.left-content.left*scale,painted.top-content.top*scale);
  render();
 }
 function sync() {
  cancelAnimationFrame(frame); frame = 0; lastPaint = performance.now();
  if (disposed || !model || document.hidden || root.dataset.collapsed === 'true' || root.dataset.obscured === 'true') return;
  model.update(16); render(); request();
 }
 signal.addEventListener('abort', dispose, { once: true });
 try {
  PIXI.live2d.Live2DModel.registerTicker(PIXI.Ticker);
  model = await PIXI.live2d.Live2DModel.from(withBase('/companions/whale-girl/c_0120.model3.json'), {
   autoInteract: false, autoUpdate: false, motionPreload: 'NONE', idleMotionGroup: '__blog_idle__',
  });
  if (disposed || signal.aborted) { model.destroy({ children: true, texture: true, baseTexture: true }); return; }
  app.stage.addChild(model);
  model.internalModel.motionManager.stopAllMotions();
  model.internalModel.eyeBlink = undefined;
  const core = model.internalModel.coreModel;
  const parameters = core.getModel().parameters;
  const defaults = new Map(parameters.ids.map((id,index) => [id,parameters.defaultValues[index]]));
  const set = (id: string, value: number) => { if (defaults.has(id)) core.setParameterValueById(id,value); };
  restorePose = () => { for (const [id,value] of defaults) core.setParameterValueById(id,value); core.saveParameters(); };
  let blinkStart = 4200;
  model.internalModel.on('beforeModelUpdate', () => {
   if (actionPlaying && !model!.internalModel.motionManager.isFinished() && elapsed<actionEndsAt) return;
   if (actionPlaying) {
    model!.internalModel.motionManager.stopAllMotions();
    restorePose(); actionPlaying = false; root.dataset.modelAction = 'idle';
   }
   const animate = moving(), mood = root.dataset.mood || 'idle';
   const greeting = mood === 'wave' && animate;
   let blink = 1;
   if (animate && elapsed >= blinkStart) {
    const phase = (elapsed-blinkStart)/220;
    if (phase >= 1) blinkStart = elapsed+4000+Math.random()*2500;
    else blink = Math.abs(phase*2-1);
   }
   for (const [id,value] of whaleFaceValues(mood,defaults,blink)) set(id,value);
   set('point',greeting ? 0 : 1);
   set('phone7',greeting ? 1 : 0);
   set('baleite',1);
   set('ParamBodyAngleZ',animate && root.dataset.playing === 'true' ? Math.sin(elapsed/600)*1.2 : 0);
   if (!animate) { set('ParamAngleX',0); set('ParamAngleY',0); set('ParamAngleZ',0); }
  });
  for (const [id,value] of defaults) core.setParameterValueById(id,value);
  core.saveParameters();
  model.anchor.set(0,0); model.position.set(0,0);
  const measureScale = Math.min(768/model.internalModel.originalWidth,768/model.internalModel.originalHeight);
  model.scale.set(measureScale);
  model.update(16); render();
  // Fit actual alpha, not the Cubism canvas, which includes offscreen prop space.
  const gl = app.renderer.gl, pixels = new Uint8Array(768*768*4);
  gl.readPixels(0,0,768,768,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let left = 768, top = 768, right = 0, bottom = 0;
  for (let y=0;y<768;y+=2) for (let x=0;x<768;x+=2) {
   if (pixels[(y*768+x)*4+3] < 24) continue;
   left = Math.min(left,x); right = Math.max(right,x+2);
   top = Math.min(top,767-y); bottom = Math.max(bottom,769-y);
  }
  if (right>left && bottom>top) content = { left:(left-12)/measureScale, top:(top-12)/measureScale, right:(right+12)/measureScale, bottom:(bottom+12)/measureScale };
  else throw new Error('The Live2D model did not produce a visible frame');
  app.view.setAttribute('aria-hidden','true');
  app.view.className = 'companion-art';
  host.replaceChildren(app.view);
  fit();
  resize = new ResizeObserver(fit); resize.observe(host);
  preferences = new MutationObserver(sync);
  preferences.observe(root,{attributes:true,attributeFilter:['data-collapsed','data-quiet','data-obscured','data-mood','data-reading','data-playing','data-night']});
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  app.view.addEventListener('webglcontextlost', event => { event.preventDefault(); dispose(); root.dataset.modelState = 'error'; });
  sync();
  return {
   look(x,y) { targetX=x;targetY=y;lastPointerAt=elapsed;request(); },
   hitZone(clientX,clientY) {
    const bounds = app.view.getBoundingClientRect();
    return whaleHitZone((clientX-bounds.left-painted.left)/painted.width,(clientY-bounds.top-painted.top)/painted.height);
   },
   reset() {
    if (disposed || !model) return;
    motionVersion++; actionPlaying = false;
    model.internalModel.motionManager.stopAllMotions(); restorePose();
    targetX=targetY=gazeX=gazeY=0;
    root.dataset.modelAction='idle'; sync();
   },
   motion(group) {
    const version = ++motionVersion;
    // Finish a resource load before starting the latest request; stale actions cannot overwrite it.
    loadingMotion = loadingMotion.catch(() => false).then(async () => {
     if (disposed || !model || !moving() || version !== motionVersion) return false;
     model.internalModel.motionManager.stopAllMotions(); restorePose();
     const started = await model.motion(group,0,3);
     if (disposed) return false;
     if (version !== motionVersion || !moving()) { model.internalModel.motionManager.stopAllMotions(); restorePose(); return false; }
     if (started) { actionPlaying=true; actionEndsAt=elapsed+WHALE_MOTION_SECONDS[group]*1000+150; root.dataset.modelAction=group;request(); }
     return started;
    });
    return loadingMotion;
   },
   dispose,
  };
 } catch (error) { dispose(); throw error; }
}
