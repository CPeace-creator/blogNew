import {
  AnimationClip, BufferGeometry, CapsuleGeometry, CatmullRomCurve3, Color,
  CylinderGeometry, DoubleSide, Euler, ExtrudeGeometry, Float32BufferAttribute,
  Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion,
  QuaternionKeyframeTrack, Shape, SphereGeometry, TubeGeometry,
  Vector3, VectorKeyframeTrack,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Xiaodu, an original moon-bay courier. No third-party character meshes or textures. */
export function createAvatarCharacter() {
  const root = new Group();
  root.name = 'Xiaodu';
  const material = {
    porcelain: new MeshPhysicalMaterial({ color: '#e9e5d9', roughness: .3, metalness: .03, clearcoat: .65, clearcoatRoughness: .23 }),
    trim: new MeshStandardMaterial({ color: '#b7b9a9', roughness: .5, metalness: .3 }),
    graphite: new MeshStandardMaterial({ color: '#253439', roughness: .4, metalness: .25 }),
    glass: new MeshPhysicalMaterial({ color: '#101c23', roughness: .18, metalness: .18, clearcoat: 1, clearcoatRoughness: .12 }),
    brass: new MeshStandardMaterial({ color: '#b79661', metalness: .78, roughness: .28 }),
    sage: new MeshPhysicalMaterial({ color: '#667f70', roughness: .92, metalness: 0, sheen: .8, sheenColor: new Color('#b4c6a0'), sheenRoughness: 1, side: DoubleSide }),
    edge: new MeshStandardMaterial({ color: '#c6cab1', roughness: .8 }),
    leather: new MeshStandardMaterial({ color: '#365449', roughness: .8 }),
    pages: new MeshStandardMaterial({ color: '#e2d7ba', roughness: .92 }),
    amber: new MeshStandardMaterial({ color: '#ffd38e', emissive: '#ffba5b', emissiveIntensity: 1.4, roughness: .3 }),
    status: new MeshStandardMaterial({ color: '#c8e3bb', emissive: '#9cc58b', emissiveIntensity: .65 }),
    reflection: new MeshStandardMaterial({ color: '#e0eef1', transparent: true, opacity: .12, roughness: .2, depthWrite: false }),
  };
  const ballGeometry = new SphereGeometry(1, 28, 20);
  const boxGeometries = new Map();
  const mesh = (parent, geometry, mat, position = [0, 0, 0], scale = [1, 1, 1]) => {
    const object = new Mesh(geometry, mat);
    object.position.set(...position);
    object.scale.set(...scale);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (parent, mat, size, position, radius = .07) => {
    const key = [...size, radius].join(',');
    if (!boxGeometries.has(key)) boxGeometries.set(key, new RoundedBoxGeometry(...size, 3, radius));
    return mesh(parent, boxGeometries.get(key), mat, position);
  };
  const ball = (parent, mat, position, scale) => mesh(parent, ballGeometry, mat, position, scale);
  const tube = (parent, mat, points, radius = .012) => mesh(parent, new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))), 32, radius, 8, false), mat);
  const disk = (parent, mat, radius, depth, position) => mesh(parent, new CylinderGeometry(radius, radius, depth, 40), mat, position);

  const body = new Group();
  body.name = 'Body';
  root.add(body);
  const feet = [];
  for (const side of [-1, 1]) {
    const leg = new Group();
    leg.name = side === 1 ? 'LeftLeg' : 'RightLeg';
    leg.position.set(side * .265, 0, side === -1 ? .025 : -.025);
    body.add(leg);
    ball(leg, material.graphite, [0, .91, 0], [.145, .14, .15]);
    box(leg, material.porcelain, [.25, .34, .29], [0, .72, 0], .08);
    const knee = disk(leg, material.brass, .10, .27, [0, .52, .015]);
    knee.rotation.z = Math.PI / 2;
    box(leg, material.porcelain, [.235, .30, .26], [0, .34, .015], .075);
    box(leg, material.graphite, [.16, .08, .18], [0, .185, .015], .025);
    const foot = new Group();
    foot.position.set(0, .12, .11);
    foot.rotation.y = side * -.08;
    leg.add(foot);
    box(foot, material.porcelain, [.34, .19, .48], [0, 0, 0], .075);
    box(foot, material.leather, [.33, .045, .46], [0, -.071, 0], .016);
    box(foot, material.trim, [.18, .02, .035], [0, .065, .12], .009);
    feet.push(foot);
  }
  const torso = new Group();
  torso.name = 'Torso';
  body.add(torso);
  box(torso, material.porcelain, [1.02, 1.12, .70], [0, 1.49, 0], .20);
  box(torso, material.graphite, [.74, .11, .52], [0, .965, -.01], .04);
  box(torso, material.leather, [.74, .16, .075], [0, 1.13, .339], .035);
  box(torso, material.graphite, [.27, .065, .025], [0, 1.70, .36], .02);
  box(torso, material.status, [.14, .018, .012], [-.04, 1.70, .38], .006);
  disk(torso, material.brass, .018, .02, [.10, 1.70, .37]).rotation.x = Math.PI / 2;
  for (const x of [-.35, .35]) disk(torso, material.brass, .023, .016, [x, 1.22, .35]).rotation.x = Math.PI / 2;
  const badge = box(torso, material.brass, [.17, .19, .025], [-.24, 1.46, .36], .018);
  tube(badge, material.leather, [[-.052, .045, .02], [0, .028, .02], [.052, .045, .02]], .009);
  tube(badge, material.leather, [[-.052, .045, .02], [-.052, -.045, .02], [0, -.06, .02], [.052, -.045, .02], [.052, .045, .02]], .009);
  tube(badge, material.leather, [[0, .028, .02], [0, -.055, .02]], .008);

  const cape = new Group();
  cape.name = 'SageCape';
  torso.add(cape);
  mesh(cape, capeGeometry(), material.sage);
  const hem = Array.from({ length: 49 }, (_, i) => {
    const theta = .42 + i / 48 * (Math.PI * 2 - .84);
    const radius = .665 + .02 * Math.sin(theta * 7);
    return [Math.sin(theta) * radius, 1.22 + .09 * Math.cos(theta + .4), Math.cos(theta) * radius * .77 - .03];
  });
  tube(cape, material.edge, hem, .012);
  disk(cape, material.brass, .055, .025, [.26, 1.91, .425]).rotation.x = Math.PI / 2;
  disk(torso, material.graphite, .19, .16, [0, 2.07, 0]);
  disk(torso, material.brass, .21, .035, [0, 2.105, 0]);

  const head = new Group();
  head.name = 'Head';
  head.position.set(0, 2.57, 0);
  head.rotation.z = -.035;
  torso.add(head);
  box(head, material.porcelain, [1.22, .99, .93], [0, 0, 0], .23);
  mesh(head, panel(1.075, .72, .20, .035), material.graphite, [0, -.015, .442]);
  mesh(head, panel(1.025, .66, .18, .035), material.glass, [0, -.015, .472]);
  tube(head, material.reflection, [[-.34, .215, .53], [-.19, .247, .533], [.02, .25, .533]], .009);
  for (const side of [-1, 1]) {
    disk(head, material.brass, .114, .045, [side * .607, -.015, -.03]).rotation.z = Math.PI / 2;
    disk(head, material.graphite, .075, .052, [side * .615, -.015, -.03]).rotation.z = Math.PI / 2;
    for (let y = 0; y < 3; y++) box(head, material.trim, [.013, .025, .095], [side * .604, -.20 + y * .06, -.17], .004);
  }
  tube(head, material.brass, [[-.30, .45, -.10], [-.32, .62, -.12], [-.25, .73, -.11]], .022);
  const leaf = mesh(head, leafGeometry(), material.sage, [-.25, .70, -.11]);
  leaf.rotation.set(.20, -.3, -.45);
  tube(leaf, material.edge, [[0, 0, .006], [.045, .10, .012], [.10, .19, .002]], .006);
  ball(head, material.status, [-.251, .729, -.105], [.027, .027, .027]);

  const eyes = new Group();
  eyes.name = 'Eyes';
  eyes.position.set(0, .015, .534);
  head.add(eyes);
  const openEyes = new Group(), happyEyes = new Group();
  openEyes.name = 'OpenEyes';
  happyEyes.name = 'HappyEyes';
  happyEyes.visible = false;
  eyes.add(openEyes, happyEyes);
  const eyeGeometry = panel(.11, .19, .05, .012);
  for (const side of [-1, 1]) {
    mesh(openEyes, eyeGeometry, material.amber, [side * .225, 0, 0]);
    tube(happyEyes, material.amber, [[side * .225 - .065, -.018, .015], [side * .225, .035, .015], [side * .225 + .065, -.018, .015]], .022);
  }
  tube(head, material.amber, [[-.065, -.167, .541], [0, -.185, .544], [.065, -.167, .541]], .010);

  const arms = [], wrists = [], forearms = [];
  for (const side of [-1, 1]) {
    const arm = new Group();
    arm.name = side === 1 ? 'WavingArm' : 'NotebookArm';
    arm.position.set(side * .62, 1.88, 0);
    arm.rotation.z = side * .10;
    torso.add(arm);
    arms.push(arm);
    ball(arm, material.graphite, [0, -.015, 0], [.125, .14, .14]);
    mesh(arm, new CapsuleGeometry(.115, .23, 6, 16), material.porcelain, [0, -.19, 0]);
    disk(arm, material.brass, .08, .255, [0, -.395, 0]).rotation.z = Math.PI / 2;
    const forearm = new Group();
    forearm.name = side === 1 ? 'WaveForearm' : 'NotebookForearm';
    forearm.position.y = -.395;
    arm.add(forearm);
    forearms.push(forearm);
    mesh(forearm, new CapsuleGeometry(.105, .20, 6, 16), material.porcelain, [0, -.17, 0]);
    box(forearm, material.leather, [.20, .06, .20], [0, -.30, 0], .023);
    const wrist = new Group();
    wrist.name = side === 1 ? 'WaveWrist' : 'NotebookWrist';
    wrist.position.set(0, -.39, .005);
    forearm.add(wrist);
    wrists.push(wrist);
    box(wrist, material.porcelain, [.19, .15, .12], [0, -.06, 0], .045);
    for (let finger = 0; finger < 3; finger++) box(wrist, material.porcelain, [.045, .10, .09], [-.061 + finger * .061, -.157, 0], .020);
    box(wrist, material.porcelain, [.06, .115, .09], [-side * .112, -.052, .025], .024).rotation.z = -side * .45;
  }
  const notebook = new Group();
  notebook.name = 'FieldNotebook';
  notebook.position.set(-.015, -.04, .105);
  notebook.rotation.set(-.05, -.1, -.12);
  wrists[0].add(notebook);
  box(notebook, material.leather, [.29, .37, .08], [0, -.04, 0], .022);
  box(notebook, material.pages, [.25, .325, .061], [.009, -.04, .013], .009);
  box(notebook, material.sage, [.29, .37, .018], [0, -.04, .052], .008);
  box(notebook, material.brass, [.023, .35, .015], [.074, -.04, .067], .005);
  for (const y of [.015, -.025, -.065]) box(notebook, material.edge, [.12, .008, .006], [-.03, y, .064], .002);
  box(torso, material.graphite, [.41, .36, .055], [0, 1.50, -.375], .055);
  box(torso, material.porcelain, [.36, .30, .04], [0, 1.50, -.408], .045);
  disk(torso, material.brass, .045, .025, [0, 1.50, -.439]).rotation.x = Math.PI / 2;

  const animations = [
    new AnimationClip('Hello', 3.2, [
      zTrack('WavingArm', [0, .16, .55, .85, 1.15, 1.48, 1.81, 2.14, 2.55, 3.2], [.10, -.05, 2.03, 2.11, 2.03, 2.11, 2.03, 2.11, 1.95, .10]),
      zTrack('WaveWrist', [0, .55, .8, 1.1, 1.4, 1.7, 2, 2.3, 2.55, 3.2], [0, -.16, .28, -.24, .28, -.24, .28, -.24, .05, 0]),
    ]),
    new AnimationClip('Breathe', 4.8, [
      new VectorKeyframeTrack('Torso.position', [0, 1.2, 2.4, 3.6, 4.8], [0, 0, 0, 0, .006, 0, 0, 0, 0, 0, -.006, 0, 0, 0, 0]),
    ]),
    new AnimationClip('Blink', 4.2, [
      new VectorKeyframeTrack('Eyes.scale', [0, 3.85, 3.96, 4.05, 4.2], [1, 1, 1, 1, 1, 1, 1, .08, 1, 1, 1, 1, 1, 1, 1]),
    ]),
    new AnimationClip('Notebook', 4.1, [
      eulerTrack('NotebookArm', [0, .7, 3.1, 4.1], [[0, 0, -.1], [-.9, 0, -.1], [-.9, 0, -.1], [0, 0, -.1]]),
      eulerTrack('Head', [0, .7, 3.1, 4.1], [[0, 0, -.035], [.18, 0, -.035], [.18, 0, -.035], [0, 0, -.035]]),
    ]),
    new AnimationClip('Turn', 3.8, [
      eulerTrack('Body', [0, .95, 1.9, 2.85, 3.8], [0, .5, 1, 1.5, 2].map(y => [0, y * Math.PI, 0])),
    ]),
  ];
  return {
    root, body, torso, head, eyes, openEyes, happyEyes, waveArm: arms[1], notebookArm: arms[0],
    waveWrist: wrists[1], notebookForearm: forearms[0], cape, feet, animations,
  };
}

function roundedRectangle(width, height, radius) {
  const shape = new Shape(), x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}
function panel(width, height, radius, depth) {
  return new ExtrudeGeometry(roundedRectangle(width, height, radius), {
    depth, bevelEnabled: true, bevelSegments: 3, steps: 1,
    bevelSize: .007, bevelThickness: .007, curveSegments: 12,
  });
}
function zTrack(name, times, angles) { return eulerTrack(name, times, angles.map(z => [0, 0, z])); }
function eulerTrack(name, times, values) {
  return new QuaternionKeyframeTrack(`${name}.quaternion`, times,
    values.flatMap(([x, y, z]) => new Quaternion().setFromEuler(new Euler(x, y, z)).toArray()));
}
function capeGeometry() {
  const positions = [], uv = [], indices = [], rows = 12, columns = 64;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const radius = t < .28 ? .275 + t / .28 * .405 : .68 - (t - .28) * .02;
    for (let column = 0; column <= columns; column++) {
      const theta = .42 + column / columns * (Math.PI * 2 - .84);
      const foldedRadius = radius + Math.sin(theta * 7) * .022 * t;
      positions.push(Math.sin(theta) * foldedRadius, 2.13 - t * .91 + t * .09 * Math.cos(theta + .4), Math.cos(theta) * foldedRadius * .77 - .03);
      uv.push(column / columns, t);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function leafGeometry() {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-.08, .10, -.02, .22, .13, .25);
  shape.bezierCurveTo(.18, .10, .09, .035, 0, 0);
  return new ExtrudeGeometry(shape, { depth: .014, bevelEnabled: true, bevelThickness: .005, bevelSize: .005, bevelSegments: 2, curveSegments: 12 });
}
