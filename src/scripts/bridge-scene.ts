import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, EdgesGeometry, GridHelper, Group,
  LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, PerspectiveCamera, Raycaster,
  Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PIERS } from '../lib/bridge-demo';

export interface BridgeScene {
  select: (index: number) => void;
  showProgress: (enabled: boolean) => void;
  reset: () => void;
  dispose: () => void;
}

export function mountBridge(viewport: HTMLElement, onSelect: (index: number) => void, initial: number): BridgeScene {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new Scene();
  scene.background = new Color(0x101e35);
  const camera = new PerspectiveCamera(38, 1, 0.1, 130);
  viewport.append(canvas);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = 9;
  controls.maxDistance = 70;
  controls.maxPolarAngle = Math.PI * .49;
  controls.target.set(0, 2, 0);
  const sun = new DirectionalLight(0xd1f3ff, 2.4);
  sun.position.set(5, 12, 8);
  scene.add(sun, new AmbientLight(0x9eb8df, 1.6));
  const grid = new GridHelper(65, 65, 0x436783, 0x263a58);
  grid.position.y = -.03;
  scene.add(grid);

  const stone = new MeshStandardMaterial({ color: 0x768fa7 });
  const rail = new MeshStandardMaterial({ color: 0xa6bfce });
  const pierMaterial = PIERS.map(() => new MeshStandardMaterial({ color: 0x7996ae }));
  const deckMaterial = PIERS.map(() => new MeshStandardMaterial({ color: 0x637d9e }));
  const outlineMaterial = new LineBasicMaterial({ color: 0xbdfdf1 });
  const pierOutlines: Group[] = [];
  const clickable: Mesh[] = [];
  const addBox = (parent: Scene | Group, dimensions: [number, number, number], center: [number, number, number], surface: MeshStandardMaterial) => {
    const mesh = new Mesh(new BoxGeometry(...dimensions), surface);
    mesh.position.set(...center);
    parent.add(mesh);
    return mesh;
  };

  PIERS.forEach(({ position: x }, index) => {
    const outline = new Group();
    pierOutlines.push(outline);
    scene.add(outline);
    addBox(scene, [2.1, .28, 2.08], [x, .14, 0], stone);
    const pierParts = [
      addBox(scene, [1.05, 3.15, 1.12], [x, 1.855, 0], pierMaterial[index]),
      addBox(scene, [1.8, .42, 2.3], [x, 3.58, 0], pierMaterial[index]),
    ];
    for (const part of pierParts) {
      part.userData.pier = index;
      clickable.push(part);
      const edges = new LineSegments(new EdgesGeometry(part.geometry), outlineMaterial);
      edges.position.copy(part.position);
      outline.add(edges);
    }
    const deck = addBox(scene, [4.71, .53, 3.25], [x, 4.055, 0], deckMaterial[index]);
    deck.userData.pier = index;
    clickable.push(deck);
    addBox(scene, [4.71, .19, .1], [x, 4.42, 1.56], rail);
    addBox(scene, [4.71, .19, .1], [x, 4.42, -1.56], rail);
    for (const offset of [-1.45, 0, 1.45]) {
      addBox(scene, [.7, .018, .044], [x + offset, 4.328, 0], rail);
    }
  });

  let requestedFrame = 0;
  const redraw = () => {
    if (requestedFrame) return;
    requestedFrame = requestAnimationFrame(() => {
      requestedFrame = 0;
      renderer.render(scene, camera);
    });
  };
  controls.addEventListener('change', redraw);
  const observer = new ResizeObserver(() => {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    redraw();
  });
  observer.observe(viewport);

  const reset = () => {
    const aspect = viewport.clientWidth / Math.max(1, viewport.clientHeight);
    const distance = Math.max(1, 1.42 / aspect);
    camera.position.copy(new Vector3(13, 11, 19).multiplyScalar(distance));
    controls.update();
    redraw();
  };

  let selection = initial;
  let progressMode = false;
  const updateColors = () => {
    PIERS.forEach(({ color }, index) => {
      pierMaterial[index].color.setHex(progressMode ? color : index === selection ? 0x39d9c6 : 0x7996ae);
      deckMaterial[index].color.setHex(progressMode ? color : 0x637d9e);
      pierOutlines[index].visible = index === selection;
    });
    redraw();
  };

  const pointer = new Vector2();
  const ray = new Raycaster();
  let press: { x: number; y: number; id: number } | undefined;
  const pressStart = (event: PointerEvent) => {
    press = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : undefined;
  };
  const pressEnd = (event: PointerEvent) => {
    const start = press;
    press = undefined;
    if (start?.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(clickable, false)[0];
    if (hit) onSelect(Number(hit.object.userData.pier));
  };
  const cancelPress = () => { press = undefined; };
  canvas.addEventListener('pointerdown', pressStart);
  canvas.addEventListener('pointerup', pressEnd);
  canvas.addEventListener('pointercancel', cancelPress);
  canvas.addEventListener('webglcontextrestored', redraw);
  reset();
  updateColors();

  return {
    select(index) { selection = index; updateColors(); },
    showProgress(enabled) { progressMode = enabled; updateColors(); },
    reset,
    dispose() {
      observer.disconnect();
      controls.dispose();
      cancelAnimationFrame(requestedFrame);
      canvas.removeEventListener('pointerdown', pressStart);
      canvas.removeEventListener('pointerup', pressEnd);
      canvas.removeEventListener('pointercancel', cancelPress);
      canvas.removeEventListener('webglcontextrestored', redraw);
      scene.traverse((object) => {
        if (!(object instanceof Mesh || object instanceof LineSegments)) return;
        object.geometry.dispose();
      });
      [stone, rail, outlineMaterial, ...pierMaterial, ...deckMaterial, grid.material].forEach((material) => material.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
