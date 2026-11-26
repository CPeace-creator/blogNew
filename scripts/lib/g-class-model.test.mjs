import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareImportedCar } from '../../src/lib/avatar/imported-car.ts';
import { createCarLighting } from '../../src/lib/avatar/car-lighting.ts';

const binary = await readFile(new URL('../../public/models/mercedes-g63-amg.glb', import.meta.url));
const document = JSON.parse(binary.subarray(20, 20 + binary.readUInt32LE(12)).toString('utf8').trim());
const loader = new GLTFLoader();
const decoded = await loader.parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength), '');

function scene() { return decoded.scene.clone(true); }

test('the light switch changes visible lamp faces and glow while preserving the author materials', () => {
  const car = prepareImportedCar(scene());
  const sourceMaterials = [...car.frontLights, ...car.tailLights];
  car.body.traverse(part => {
    if (part instanceof Mesh && part.parent?.name === 'back_light_1') {
      for (const material of [part.material].flat()) if (!sourceMaterials.includes(material)) sourceMaterials.push(material);
    }
  });
  const originals = sourceMaterials.map(material => material.toJSON());
  const lighting = createCarLighting(car);
  const glow = car.body.getObjectByName('G63LampGlow');
  assert.equal(glow.children.length, 4, 'Two headlamps must each have a ring and a halo');
  for (const name of ['G63HeadlampRing0', 'G63HeadlampRing1']) {
    const ring = car.body.getObjectByName(name);
    assert.ok(Math.abs(Math.abs(ring.position.x) - .584) < .01, 'Glow must be anchored to the actual source lamp');
    assert.ok(ring.position.y > .88 && ring.position.y < .91);
    assert.ok(ring.position.z > 2.15 && ring.position.z < 2.18);
  }
  const lamps = new Set();
  car.body.traverse(part => {
    if (part instanceof Mesh) for (const material of [part.material].flat()) {
      if (sourceMaterials.some(source => source.name === material.name)) lamps.add(material);
    }
  });
  assert.equal(lamps.size, 6, 'The rear light backing surfaces must switch with the outer lenses');
  for (let i = 0; i < 3; i++) {
    lighting.setEnabled(false);
    assert.equal(glow.visible, false);
    for (const material of lamps) {
      assert.equal(material.emissiveIntensity, 0);
      assert.ok(Math.max(...material.color.toArray()) < .1, 'An unlit lamp must not remain a white reflective dot');
    }
    lighting.setEnabled(true);
    assert.equal(glow.visible, true);
    assert.ok([...lamps].every(material => material.emissiveIntensity > 0));
  }
  assert.equal(glow.children.length, 4, 'Repeated switching must not duplicate lamp geometry');
  sourceMaterials.forEach((material, index) => assert.deepEqual(material.toJSON(), originals[index]));
  lighting.dispose();
  assert.equal(car.body.getObjectByName('G63LampGlow'), undefined);
  const restored = new Set();
  car.body.traverse(part => {
    if (part instanceof Mesh) for (const material of [part.material].flat()) if (sourceMaterials.includes(material)) restored.add(material);
  });
  assert.equal(restored.size, 6, 'Disposal must restore the original materials for model cleanup');
});

test('the published G63 is the exact uncompressed author download', () => {
  assert.equal(binary.toString('ascii', 0, 4), 'glTF');
  assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(binary.readUInt32LE(8), binary.length);
  assert.equal(binary.length, 10315296);
  assert.equal(createHash('sha256').update(binary).digest('hex'), '4fec52ebf5c009cdf8a867bb5d8bb24dbb8a4464223f9d6a40312ba8231034d7');
  assert.equal(document.asset.version, '2.0');
  assert.ok(!document.extensionsUsed?.includes('EXT_meshopt_compression'));
  assert.ok(!document.extensionsUsed?.includes('KHR_mesh_quantization'));
  assert.equal(document.materials.length, 17);
  assert.ok(document.buffers.every(buffer => !buffer.uri));
  assert.ok(!document.images?.length, 'The author download contains no image textures');
});

test('the original creator, source and license remain with the unmodified download', async () => {
  assert.match(document.asset.extras.author, /pranav27/);
  assert.match(document.asset.extras.license, /CC-BY-4\.0/);
  assert.match(document.asset.extras.source, /fa70ea228e5749c2b4951a895385b055$/);
  const notice = await readFile(new URL('../../public/models/mercedes-g63-amg.LICENSE.txt', import.meta.url), 'utf8');
  assert.match(notice, /pranav27/);
  assert.match(notice, /CC BY 4\.0/);
  assert.match(notice, /Display changes/);
  assert.match(notice, /byte-for-byte copy/);
  assert.ok(notice.includes(createHash('sha256').update(binary).digest('hex')));
});

test('the original model loads without a decoder and retains every named mesh', () => {
  let triangles = 0, meshes = 0;
  const model = scene();
  model.traverse(part => {
    if (!(part instanceof Mesh)) return;
    meshes++;
    triangles += (part.geometry.index?.count || part.geometry.attributes.position.count) / 3;
    assert.ok([...part.geometry.attributes.position.array].every(Number.isFinite));
  });
  assert.equal(meshes, 54);
  assert.equal(triangles, 187887);
  for (const name of ['front_body_48', 'front_tyre_25', 'back_tyre_6', 'showcase_wheel_40', 'window_1_44', 'front_door_20']) assert.ok(model.getObjectByName(name), `Missing source part: ${name}`);
  assert.equal(decoded.animations.length, 0, 'The source must not be advertised as having supplied animations');
});

test('display preparation preserves every original material value', () => {
  const model = scene();
  const materials = new Set();
  model.traverse(part => {
    if (part instanceof Mesh) for (const material of [part.material].flat()) materials.add(material);
  });
  const before = new Map([...materials].map(material => [material, material.toJSON()]));
  prepareImportedCar(model);
  assert.equal(materials.size, 17);
  for (const [material, value] of before) assert.deepEqual(material.toJSON(), value, `Original material changed: ${material.name}`);
});

test('the imported model is centered, grounded, and exposes only its actual light materials', () => {
  const car = prepareImportedCar(scene());
  const bounds = new Box3().setFromObject(car.root);
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  assert.ok(Math.abs(bounds.min.y) < .0001);
  assert.ok(Math.abs(center.x) < .0001 && Math.abs(center.z) < .0001);
  assert.ok(Math.abs(size.z - 4.9) < .0001);
  assert.ok(size.y > 1.8 && size.y < 2.1);
  assert.equal(car.frontLights.length, 2);
  assert.equal(car.tailLights.length, 2);
  assert.deepEqual(car.frontLights.map(material => material.name).sort(), ['blue_emission', 'white_emission']);
});
