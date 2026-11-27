import { BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { G63_SOURCE, prepareImportedCar } from '../avatar/imported-car';
import { createCarLighting } from '../avatar/car-lighting';
import { withBase } from '../paths';
import type { Raycaster } from 'three';

/** A garden lane outside the original platform. Its bounds participate in framing. */
export function createArrivalGarden() {
 const root = new Group();
 root.name = 'Moon Bay arrival garden';
 const lane = new CatmullRomCurve3([
  new Vector3(4.45, .055, 3.05), new Vector3(2.0, .055, 4.02),
  new Vector3(-.4, .055, 4.04), new Vector3(-2.48, .055, 3.05), new Vector3(-3.63, .055, 1.47),
 ]);
 const vertices: number[] = [], indices: number[] = [];
 const steps = 72;
 for (let i = 0; i <= steps; i++) {
  const point = lane.getPointAt(i / steps), tangent = lane.getTangentAt(i / steps);
  const side = new Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(.51);
  vertices.push(point.x + side.x, point.y, point.z + side.z, point.x - side.x, point.y, point.z - side.z);
  if (i < steps) { const a = i * 2; indices.push(a, a+2, a+1, a+1, a+2, a+3); }
 }
 const geometry = new BufferGeometry();
 geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
 geometry.setIndex(indices); geometry.computeVertexNormals();
 const stone = new MeshStandardMaterial({ color: '#d6cebd', roughness: .95, side: 2 });
 const road = new Mesh(geometry, stone); road.receiveShadow = true; root.add(road);
 const rim = new MeshStandardMaterial({ color: '#f1e7ce', roughness: .8 });
 const dashGeometry = new CylinderGeometry(.024, .024, .2, 6);
 for (let i = 0; i < 27; i++) {
  const point = lane.getPointAt((i + .5) / 27), tangent = lane.getTangentAt((i + .5) / 27);
  const dash = new Mesh(dashGeometry, rim);
  dash.position.copy(point); dash.position.y += .012;
  dash.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), tangent);
  root.add(dash);
 }
 const pad = new Mesh(new CylinderGeometry(.8, .84, .18, 48), new MeshStandardMaterial({ color: '#c7d4c8', roughness: .85 }));
 pad.position.set(-3.63, -.037, 1.47); pad.receiveShadow = true; root.add(pad);
 const planters = new MeshStandardMaterial({ color: '#f0e8d8', roughness: .7 });
 const greenery = new MeshStandardMaterial({ color: '#a9bca0', roughness: .9 });
 for (const [x,z] of [[-4.23,.72],[-2.9,4.05],[3.9,4.1]]) {
  const pot = new Mesh(new CylinderGeometry(.12,.09,.19,12),planters); pot.position.set(x,.08,z); root.add(pot);
  const leaves = new Mesh(new CylinderGeometry(.16,.1,.25,7),greenery); leaves.position.set(x,.28,z); root.add(leaves);
 }
 let car: ReturnType<typeof prepareImportedCar> | undefined;
 let lighting: ReturnType<typeof createCarLighting> | undefined;
 let loading: Promise<void> | undefined;
 let driving = false, start = 0, night = false, disposed = false;
 let resolveDrive: (() => void) | undefined;
 function place(progress: number) {
  if (!car) return;
  const point = lane.getPointAt(progress), tangent = lane.getTangentAt(progress);
  car.root.position.copy(point);
  car.root.rotation.y = Math.atan2(tangent.x, tangent.z);
 }
 async function load() {
  if (car) return;
  if (loading) return loading;
  loading = (async () => {
   const model = await new GLTFLoader().loadAsync(withBase(G63_SOURCE.modelUrl));
   const next = prepareImportedCar(model.scene);
   if (disposed) {
    next.root.traverse(part => { if (part instanceof Mesh) { part.geometry.dispose(); for (const material of [part.material].flat()) material.dispose(); } });
    return;
   }
   car = next;
   car.root.scale.setScalar(.34);
   lighting = createCarLighting(car);
   root.add(car.root);
   car.root.visible = false;
  })().finally(() => { loading = undefined; });
  return loading;
 }
 async function drive(reduced: boolean) {
  await load();
  if (disposed || !car) return;
  resolveDrive?.();
  car.root.visible = true; lighting?.setEnabled(true);
  if (reduced) { driving = false; place(1); lighting?.setEnabled(night); return; }
  driving = true; start = 0; place(0);
  return new Promise<void>(resolve => { resolveDrive = resolve; });
 }
 function update(time: number, reduced: boolean) {
  if (!driving) return false;
  start ||= time;
  const progress = reduced ? 1 : Math.min(1, (time - start) / 4300);
  // Smooth departures and stops while keeping most of the lane at steady speed.
  const eased = progress * progress * (3 - 2 * progress);
  place(eased);
  if (progress === 1) { driving = false; lighting?.setEnabled(night); resolveDrive?.(); resolveDrive = undefined; }
  return driving;
 }
 return {
  root, load, drive, update,
  hit(raycaster: Raycaster) { return Boolean(car && car.root.visible && !driving && raycaster.intersectObject(car.body,true).length); },
  async park() { await load(); if (disposed || !car) return; car.root.visible = true; place(1); lighting?.setEnabled(night); },
  setNight(value: boolean) { night = value; if (!driving) lighting?.setEnabled(value); },
  dispose() { disposed = true; driving = false; resolveDrive?.(); resolveDrive = undefined; lighting?.dispose(); },
 };
}
