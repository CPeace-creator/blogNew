import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { Object3D } from 'three';

export const G63_SOURCE = {
  title: 'Mercedes-Benz G-Class G63 AMG',
  author: 'pranav27',
  authorUrl: 'https://sketchfab.com/pranav27',
  url: 'https://sketchfab.com/3d-models/mercedes-benz-g-class-g63-amg-fa70ea228e5749c2b4951a895385b055',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  modelUrl: '/models/mercedes-g63-amg.glb?v=original-4fec52ebf5c0',
} as const;

/** Preserve the author's geometry and materials; normalize only display placement. */
export function prepareImportedCar(model: Object3D) {
  const initialBounds = new Box3().setFromObject(model);
  const initialSize = initialBounds.getSize(new Vector3());
  if (![initialSize.x, initialSize.y, initialSize.z].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('The car model has invalid dimensions.');
  }
  model.scale.multiplyScalar(4.9 / initialSize.z);
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const center = bounds.getCenter(new Vector3());
  model.position.sub(new Vector3(center.x, bounds.min.y, center.z));
  model.updateMatrixWorld(true);

  const body = new Group();
  body.name = 'G63Turntable';
  body.add(model);
  const root = new Group();
  root.name = 'MercedesG63AMG';
  root.add(body);
  const materials = new Set<MeshStandardMaterial>();
  const frontLights: MeshStandardMaterial[] = [];
  const tailLights: MeshStandardMaterial[] = [];
  model.traverse(part => {
    if (!(part instanceof Mesh)) return;
    part.castShadow = part.receiveShadow = true;
    for (const material of [part.material].flat()) {
      if (material instanceof MeshStandardMaterial) materials.add(material);
    }
  });

  for (const material of materials) {
    if (material.name === 'white_emission' || material.name === 'blue_emission') {
      frontLights.push(material);
    } else if (material.name === 'red_emission' || material.name === 'back_light_transparent') {
      tailLights.push(material);
    }
  }

  return { root, body, frontLights, tailLights };
}
