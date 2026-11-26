import {
  AdditiveBlending, Box3, DataTexture, Group, LinearFilter, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RingGeometry, Vector3,
} from 'three';
import type { Material } from 'three';
import type { prepareImportedCar } from './imported-car';

type Car = ReturnType<typeof prepareImportedCar>;

/** Give the actual lamps a visible on/off state without changing the source materials. */
export function createCarLighting(car: Car) {
  const front = new Set(car.frontLights);
  const rear = new Set(car.tailLights);
  const copies = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  const replaced = new Map<Mesh, Material | Material[]>();
  const lampBounds = [new Box3(), new Box3()];
  const point = new Vector3();
  car.body.updateWorldMatrix(true, true);
  const inverseBody = new Matrix4().copy(car.body.matrixWorld).invert();

  car.body.traverse(part => {
    if (!(part instanceof Mesh)) return;
    const original = part.material;
    const materials = [original].flat();
    // The rear fixture also contains white backing surfaces, outside its named emission materials.
    if (part.parent?.name === 'back_light_1') {
      for (const material of materials) if (material instanceof MeshStandardMaterial) rear.add(material);
    }
    if (materials.some(material => material.name === 'blue_emission')) {
      // Both lamp rings share one source mesh. Split its vertices into the two lamps.
      const transform = new Matrix4().multiplyMatrices(inverseBody, part.matrixWorld);
      const positions = part.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(transform);
        lampBounds[point.x < 0 ? 0 : 1].expandByPoint(point);
      }
    }
    const mapped = materials.map(material => {
      if (!(material instanceof MeshStandardMaterial) || (!front.has(material) && !rear.has(material))) return material;
      if (!copies.has(material)) copies.set(material, material.clone());
      replaced.set(part, original);
      return copies.get(material)!;
    });
    if (replaced.has(part)) part.material = Array.isArray(original) ? mapped : mapped[0];
  });

  const glow = new Group();
  glow.name = 'G63LampGlow';
  const texture = lampGlowTexture();
  const haloMaterial = new MeshBasicMaterial({
    map: texture, color: '#c4e5ff', transparent: true, opacity: .95,
    // Optical glare spreads over the housing instead of being clipped by its depth.
    blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const ringMaterial = new MeshBasicMaterial({ color: '#edf7ff', toneMapped: false });
  const geometries: Array<PlaneGeometry | RingGeometry> = [];
  for (const [index, bounds] of lampBounds.entries()) {
    if (bounds.isEmpty()) continue;
    const center = bounds.getCenter(new Vector3());
    const radius = bounds.getSize(new Vector3()).y / 2;
    center.z = bounds.max.z + .008;
    const ringGeometry = new RingGeometry(radius * .77, radius, 48);
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.name = `G63HeadlampRing${index}`;
    ring.position.copy(center);
    const haloGeometry = new PlaneGeometry(radius * 8, radius * 8);
    const halo = new Mesh(haloGeometry, haloMaterial);
    halo.name = `G63HeadlampHalo${index}`;
    halo.position.copy(center).add(new Vector3(0, 0, .002));
    halo.renderOrder = 1;
    geometries.push(ringGeometry, haloGeometry);
    glow.add(ring, halo);
  }
  car.body.add(glow);

  function setEnabled(enabled: boolean) {
    glow.visible = enabled;
    for (const [source, material] of copies) {
      if (front.has(source)) {
        material.color.set(enabled ? '#edf7ff' : '#18212b');
        material.emissive.set('#dcefff');
        material.emissiveIntensity = enabled ? 4 : 0;
      } else {
        material.color.set(enabled ? '#b51f2e' : '#4b1018');
        material.emissive.set('#ff263b');
        material.emissiveIntensity = enabled ? 2.5 : 0;
        if (material.transparent) material.opacity = enabled ? .65 : .3;
      }
    }
  }
  setEnabled(true);
  return {
    setEnabled,
    dispose() {
      glow.removeFromParent();
      for (const [mesh, material] of replaced) mesh.material = material;
      copies.forEach(material => material.dispose());
      geometries.forEach(geometry => geometry.dispose());
      texture.dispose();
      ringMaterial.dispose();
      haloMaterial.dispose();
    },
  };
}

function lampGlowTexture() {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
      pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - radius) ** 2 * 255)], offset);
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
