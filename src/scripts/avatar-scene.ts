import {
  ACESFilmicToneMapping, Box3, CanvasTexture, DirectionalLight, HemisphereLight,
  MathUtils, Mesh, MeshBasicMaterial, OrthographicCamera, PCFShadowMap, PlaneGeometry,
  PMREMGenerator, Scene, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareImportedCar } from '../lib/avatar/imported-car';
import { createCarLighting } from '../lib/avatar/car-lighting';
import { setAvatarPresentation } from '../lib/avatar/presentation';

export async function mountAvatar(companion: HTMLElement, signal?: AbortSignal) {
  const host = companion.querySelector<HTMLElement>('[data-avatar-canvas]')!;
  const message = companion.querySelector<HTMLElement>('[data-avatar-message]')!;
  const hint = companion.querySelector<HTMLElement>('[data-avatar-hint]')!;
  const loadingDetail = companion.querySelector<HTMLElement>('[data-avatar-loading-detail]')!;
  const surface = companion.querySelector<HTMLButtonElement>('[data-avatar-greet]')!;
  const lightsButton = companion.querySelector<HTMLButtonElement>('[data-avatar-action="lights"]')!;
  const showcase = companion.dataset.variant === 'showcase';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  loadingDetail.textContent = '正在读取原始车模。';
  const asset = await new GLTFLoader().loadAsync(companion.dataset.avatarModelUrl!, progress => {
    if (!signal?.aborted && progress.total) {
      const percent = Math.floor(progress.loaded / progress.total * 100);
      loadingDetail.textContent = percent >= 100 ? '文件已下载，正在准备画面。' : `正在载入 · ${percent}%`;
    }
  });
  if (signal?.aborted) { releaseModel(asset.scene); return undefined; }
  const car = prepareImportedCar(asset.scene);
  const events = new AbortController();
  const eventSignal = events.signal;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: showcase ? 'high-performance' : 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, showcase ? 2 : 1.5));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.replaceChildren(renderer.domElement);
  const lighting = createCarLighting(car);

  const scene = new Scene();
  scene.add(car.root);
  const camera = new OrthographicCamera(-3, 3, 3, -3, .1, 40);
  camera.position.set(6.4, 3.3, 8.5);
  camera.lookAt(0, .96, 0);
  const key = new DirectionalLight('#fff5e9', 4.3);
  key.position.set(-3, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(showcase ? 1024 : 512, showcase ? 1024 : 512);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4, near: .1, far: 20 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias = .025;
  const rim = new DirectionalLight('#c9e1ff', 3.2);
  rim.position.set(5, 5, -4);
  const front = new DirectionalLight('#f4f7ff', 1.2);
  front.position.set(1, 2, 7);
  scene.add(key, rim, front, new HemisphereLight('#edf3ff', '#9b9587', 1.5));
  const pmrem = new PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1;
  room.dispose();
  pmrem.dispose();

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(15,23,35,.7)');
  gradient.addColorStop(.55, 'rgba(15,23,35,.3)');
  gradient.addColorStop(1, 'rgba(15,23,35,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const contactShadow = new CanvasTexture(shadowCanvas);
  const ground = new Mesh(new PlaneGeometry(3.7, 5.9), new MeshBasicMaterial({ map: contactShadow, transparent: true, opacity: .5, depthWrite: false, toneMapped: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = .008;
  scene.add(ground);
  const size = new Box3().setFromObject(car.root).getSize(new Vector3());

  let disposed = false, ready = false, visible = true, frame = 0, previousFrame = 0, lastUpdate = performance.now();
  let time = 0, heading = 0, targetHeading = 0, hoverTurn = 0;
  let lightsOn = true;
  let spin: { from: number; start: number } | undefined;
  let drag: { pointer: number; x: number; y: number; from: number; moved: boolean } | undefined;
  let suppressClick = false;
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  const homeMessage = '奔驰大 G，停在月湾等你。';
  const canMove = () => !reduced.matches && root.dataset.motion !== 'off';
  const render = () => { if (!disposed) renderer.render(scene, camera); };
  const say = (text: string) => {
    clearTimeout(bubbleTimer);
    message.textContent = text;
    bubbleTimer = setTimeout(() => { message.textContent = homeMessage; }, 4200);
  };

  function resize() {
    if (!host.clientWidth || !host.clientHeight || disposed) return;
    const aspect = host.clientWidth / host.clientHeight;
    // Reserve the diagonal footprint for a full turn, including the spare wheel.
    const diagonal = Math.hypot(size.x, size.z) * (showcase ? 1.015 : 1.08);
    const height = Math.max(size.y * .96 + diagonal * .28, diagonal / aspect) * (showcase ? 1.01 : 1.04);
    camera.left = -height * aspect / 2;
    camera.right = height * aspect / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    if (ready) render();
  }
  function applyPose(delta: number, immediate = false) {
    const target = targetHeading + (drag || spin ? 0 : hoverTurn);
    heading = immediate || drag ? target : MathUtils.damp(heading, target, 8, delta);
    car.body.rotation.y = heading;
  }
  function updateLightControls() {
    lightsButton.setAttribute('aria-pressed', String(lightsOn));
    lightsButton.querySelector('span')!.textContent = lightsOn ? '关闭车灯' : '点亮车灯';
    surface.setAttribute('aria-pressed', String(lightsOn));
  }
  function sync() {
    if (!ready || disposed) return;
    cancelAnimationFrame(frame);
    frame = 0;
    lastUpdate = performance.now();
    hint.textContent = canMove() ? '拖动旋转 · 轻点车身切换车灯' : '拖动查看车模 · 动画已随偏好关闭';
    if (!canMove()) { spin = undefined; hoverTurn = 0; applyPose(0, true); }
    render();
    request();
  }
  function request() {
    if (!frame && ready && canMove() && visible && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden || !canMove()) return;
    if (now - previousFrame < 1000 / 30) { request(); return; }
    previousFrame = now;
    const delta = Math.min((now - lastUpdate) / 1000, .06);
    lastUpdate = now;
    time += delta;
    if (spin) {
      const progress = Math.min(1, (time - spin.start) / 4.8);
      targetHeading = spin.from + Math.PI * 2 * smooth(progress);
      heading = targetHeading;
      if (progress === 1) { heading = targetHeading = targetHeading % (Math.PI * 2); spin = undefined; }
    }
    applyPose(delta);
    render();
    const turning = Math.abs(heading - targetHeading - (drag || spin ? 0 : hoverTurn)) > .0005;
    if (spin || turning) request();
  }
  function act(action: string) {
    if (action === 'lights') {
      lightsOn = !lightsOn;
      lighting.setEnabled(lightsOn);
      updateLightControls();
      say(lightsOn ? '车灯亮了，下一站去看看新的记录。' : '熄灯停靠，在月湾歇一会儿。');
    } else if (action === 'reset') {
      spin = undefined;
      hoverTurn = 0;
      targetHeading = Math.round(heading / (Math.PI * 2)) * Math.PI * 2;
      say('回到窗边熟悉的角度。');
    } else if (action === 'spin') {
      hoverTurn = 0;
      if (canMove()) spin = { from: heading, start: time };
      else heading = targetHeading += Math.PI / 2;
      say('换个角度，看看背后的备胎与尾灯。');
    }
    applyPose(0, !canMove());
    render();
    request();
  }

  surface.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    spin = undefined;
    suppressClick = false;
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, from: heading, moved: false };
    surface.setPointerCapture(event.pointerId);
  }, { signal: eventSignal });
  surface.addEventListener('pointermove', event => {
    if (drag && drag.pointer === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) drag.moved = true;
      if (!drag.moved) return;
      targetHeading = drag.from + dx / Math.max(180, host.clientWidth) * Math.PI * 1.8;
      hoverTurn = 0;
      applyPose(0, true);
      render();
    } else if (event.pointerType === 'mouse' && canMove() && !spin) {
      const bounds = surface.getBoundingClientRect();
      hoverTurn = MathUtils.clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5) * .16;
      request();
    }
  }, { signal: eventSignal, passive: true });
  function finishDrag(event: PointerEvent) {
    if (!drag || drag.pointer !== event.pointerId) return;
    suppressClick = drag.moved;
    drag = undefined;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
  }
  surface.addEventListener('pointerup', finishDrag, { signal: eventSignal });
  surface.addEventListener('pointercancel', finishDrag, { signal: eventSignal });
  surface.addEventListener('lostpointercapture', () => { drag = undefined; }, { signal: eventSignal });
  surface.addEventListener('pointerleave', () => { hoverTurn = 0; request(); }, { signal: eventSignal });
  surface.addEventListener('click', event => {
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    act('lights');
  }, { signal: eventSignal });
  surface.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    spin = undefined;
    targetHeading += (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 8;
    applyPose(0, true);
    render();
  }, { signal: eventSignal });
  companion.querySelectorAll<HTMLButtonElement>('[data-avatar-action]').forEach(button => {
    button.addEventListener('click', () => act(button.dataset.avatarAction!), { signal: eventSignal });
  });
  document.addEventListener('visibilitychange', sync, { signal: eventSignal });
  reduced.addEventListener('change', sync, { signal: eventSignal });
  const mutation = new MutationObserver(sync);
  mutation.observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-theme'] });
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  intersection.observe(host);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    clearTimeout(bubbleTimer);
    events.abort();
    mutation.disconnect(); intersection.disconnect(); resizeObserver.disconnect();
    signal?.removeEventListener('abort', dispose);
    lighting.dispose();
    const geometries = new Set<import('three').BufferGeometry>();
    const materials = new Set<import('three').Material>();
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of [object.material].flat()) materials.add(material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    contactShadow.dispose(); environment.dispose(); renderer.dispose();
    renderer.forceContextLoss();
    host.replaceChildren();
    setAvatarPresentation(companion, 'loading');
  }
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    dispose();
    setAvatarPresentation(companion, 'error');
  }, { signal: eventSignal });
  signal?.addEventListener('abort', dispose, { once: true });
  try {
    loadingDetail.textContent = '正在准备光影与画面。';
    resize();
    applyPose(0, true);
    await renderer.compileAsync(scene, camera);
    if (signal?.aborted || disposed) { dispose(); return undefined; }
    render();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (signal?.aborted || disposed) { dispose(); return undefined; }
    ready = true;
    updateLightControls();
    setAvatarPresentation(companion, 'ready');
    sync();
  } catch (error) {
    dispose();
    throw error;
  }
  return { dispose };
}

function smooth(value: number) { const t = MathUtils.clamp(value, 0, 1); return t * t * (3 - 2 * t); }

function releaseModel(model: import('three').Object3D) {
  const geometries = new Set<import('three').BufferGeometry>();
  const materials = new Set<import('three').Material>();
  model.traverse(part => {
    if (!(part instanceof Mesh)) return;
    geometries.add(part.geometry);
    for (const material of [part.material].flat()) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
