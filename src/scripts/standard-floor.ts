import {
  Box3, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Mesh, MeshStandardMaterial,
  Object3D, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FLOOR_DEFAULT_STEP, FLOOR_PACKAGE_BY_ELEMENT, FLOOR_STATUSES, getFloorSnapshot, type FloorColorMode } from '../lib/floor-demo';

export type FloorAxis = 'x' | 'y' | 'z';

export interface FloorScene {
  reset: () => void;
  select: (ids: readonly string[], locate?: boolean) => void;
  setColorMode: (mode: FloorColorMode) => void;
  setStep: (step: number) => void;
  setVisible: (ids: ReadonlySet<string> | null) => void;
  setSection: (axis: FloorAxis | null, fraction: number) => void;
  dispose: () => void;
}

function elementId(object: Object3D): string {
  for (let node: Object3D | null = object; node; node = node.parent) {
    if (node.userData.element_id != null) return String(node.userData.element_id);
    const match = /^element_(\d+)$/.exec(node.name);
    if (match) return match[1];
  }
  return '';
}

export async function mountStandardFloor(
  viewport: HTMLElement, url: string, onSelect: (id: string) => void,
  onProgress: (event: ProgressEvent<EventTarget>) => void,
): Promise<FloorScene> {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  const scene = new Scene();
  scene.background = new Color(0x14263e);
  scene.add(new HemisphereLight(0xe3f1ff, 0x5c6a81, 2.15));
  const sun = new DirectionalLight(0xfff6e9, 2.4);
  sun.position.set(7, 12, 9);
  scene.add(sun);

  const model = new Group();
  const meshes: Mesh[] = [];
  const elementMeshes = new Map<string, Mesh[]>();
  const ids = new Map<Mesh, string>();
  const originals = new Map<Mesh, Mesh['material']>();
  const selectionMaterial = new MeshStandardMaterial({ color: 0xffce5c, emissive: 0x5c3208, side: DoubleSide });
  const neutralMaterial = new MeshStandardMaterial({ color: 0x64768e, side: DoubleSide });
  const progressLow = new Color('#e0815d');
  const progressHigh = new Color('#36b869');
  const colors = new Map<string, MeshStandardMaterial>();
  const clippingPlane = new Plane();
  const modelBounds = new Box3();
  let visibleMeshes = meshes;
  let selected = new Set<string>();
  let mode: FloorColorMode = 'status';
  let step: number = FLOOR_DEFAULT_STEP;
  const releaseGeometry = () => {
    const materials = new Set([...originals.values()].flat());
    const textures = new Set([...materials].flatMap((material) => Object.values(material).filter((value) => value?.isTexture)));
    new Set(meshes.map((mesh) => mesh.geometry)).forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    selectionMaterial.dispose();
    neutralMaterial.dispose();
    colors.forEach((material) => material.dispose());
    renderer.dispose();
  };

  try {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'),
    ]);
    const geometry = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url, onProgress)).scene;
    model.add(geometry);
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      meshes.push(object);
      originals.set(object, object.material);
      const id = elementId(object);
      if (!id) return;
      ids.set(object, id);
      const parts = elementMeshes.get(id) ?? [];
      parts.push(object);
      elementMeshes.set(id, parts);
    });
    const bounds = new Box3().setFromObject(geometry);
    const size = bounds.getSize(new Vector3());
    const originalRadius = size.length() / 2;
    if (!meshes.length || !Number.isFinite(originalRadius) || originalRadius <= 0) {
      throw new Error('GLB has no renderable geometry');
    }
    // Normalize scale and center even when the published model uses survey coordinates.
    geometry.position.sub(bounds.getCenter(new Vector3()));
    model.scale.setScalar(8 / originalRadius);
    scene.add(model);
    model.updateWorldMatrix(true, true);
    modelBounds.setFromObject(model);
  } catch (error) {
    releaseGeometry();
    throw error;
  }

  viewport.append(canvas);
  const camera = new PerspectiveCamera(43, 1, 0.05, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = .6;
  controls.maxDistance = 170;
  const projection = new Vector3(1, .8, 1.1).normalize();
  let frame = 0;
  const redraw = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      renderer.render(scene, camera);
    });
  };
  const resize = () => {
    const { clientWidth: width, clientHeight: height } = viewport;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    redraw();
  };
  const reset = () => {
    controls.target.set(0, 0, 0);
    camera.position.copy(projection).multiplyScalar(23 * Math.max(1, 1 / camera.aspect));
    controls.update();
    redraw();
  };
  const paintMesh = (mesh: Mesh) => {
    const id = ids.get(mesh);
    if (id && selected.has(id)) {
      mesh.material = selectionMaterial;
      return;
    }
    if (mode === 'original') {
      mesh.material = originals.get(mesh)!;
      return;
    }
    const item = id ? FLOOR_PACKAGE_BY_ELEMENT.get(id) : undefined;
    if (!item) {
      mesh.material = neutralMaterial;
      return;
    }
    const snapshot = getFloorSnapshot(item, step);
    const key = mode === 'status' ? snapshot.status : `progress-${snapshot.actual}`;
    let material = colors.get(key);
    if (!material) {
      const color = mode === 'status' ? FLOOR_STATUSES[snapshot.status].color : progressLow.clone().lerp(progressHigh, snapshot.actual / 100);
      material = new MeshStandardMaterial({ color, side: DoubleSide });
      colors.set(key, material);
    }
    mesh.material = material;
  };
  const repaint = () => {
    meshes.forEach(paintMesh);
    redraw();
  };
  const select = (next: readonly string[], locate = false) => {
    const changed = new Set([...selected, ...next]);
    selected = new Set(next);
    changed.forEach((id) => elementMeshes.get(id)?.forEach(paintMesh));
    const parts = locate ? next.flatMap((id) => elementMeshes.get(id) ?? []) : [];
    if (parts.length) {
      const bounds = new Box3();
      parts.forEach((part) => bounds.expandByObject(part));
      const direction = camera.position.clone().sub(controls.target).normalize();
      const distance = Math.max(4, bounds.getSize(new Vector3()).length() * 1.7) * Math.max(1, 1 / camera.aspect);
      bounds.getCenter(controls.target);
      camera.position.copy(controls.target).addScaledVector(direction, distance);
      controls.update();
    }
    redraw();
  };
  resize();
  reset();
  repaint();
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  controls.addEventListener('change', redraw);
  canvas.addEventListener('webglcontextrestored', redraw);

  const ray = new Raycaster();
  const pointer = new Vector2();
  let press: { x: number; y: number; id: number } | undefined;
  canvas.addEventListener('pointerdown', (event) => {
    press = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : undefined;
  });
  canvas.addEventListener('pointercancel', () => { press = undefined; });
  canvas.addEventListener('pointerup', (event) => {
    const start = press;
    press = undefined;
    if (start?.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(visibleMeshes, false)
      .find(({ point }) => !renderer.clippingPlanes.length || clippingPlane.distanceToPoint(point) >= -1e-6)?.object as Mesh | undefined;
    onSelect(hit ? ids.get(hit) ?? '' : '');
  });

  return {
    reset,
    select,
    setColorMode(next) {
      mode = next;
      repaint();
    },
    setStep(next) {
      step = next;
      repaint();
    },
    setVisible(allowed) {
      visibleMeshes = meshes.filter((mesh) => {
        mesh.visible = !allowed || allowed.has(ids.get(mesh) ?? '');
        return mesh.visible;
      });
      redraw();
    },
    setSection(axis, fraction) {
      if (axis) {
        // Keep the lower side of the slider position in world coordinates.
        const limit = modelBounds.min[axis] + (modelBounds.max[axis] - modelBounds.min[axis]) * fraction;
        clippingPlane.normal.set(0, 0, 0);
        clippingPlane.normal[axis] = -1;
        clippingPlane.constant = limit;
        renderer.clippingPlanes = [clippingPlane];
      } else {
        renderer.clippingPlanes = [];
      }
      redraw();
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      cancelAnimationFrame(frame);
      releaseGeometry();
      canvas.remove();
    },
  };
}
