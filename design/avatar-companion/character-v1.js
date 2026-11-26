import {
  AnimationClip, CatmullRomCurve3, Color, CylinderGeometry,
  Euler, Group, Mesh, MeshStandardMaterial, Quaternion, QuaternionKeyframeTrack,
  Shape, SphereGeometry, TubeGeometry, Vector3, VectorKeyframeTrack,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// The portrait's three identifying features: swept brown hair, dark glasses,
// and an ivory varsity jacket with forest-green ribbing. All surfaces are 3D.
export function createAvatarCharacter() {
  const root = new Group();
  root.name = 'Jiahong';
  const materials = {
    skin: clay('#f4c9ac'), blush: clay('#e8a797'), hair: clay('#292225'),
    hairLight: clay('#352a2c'), glasses: clay('#242a28'), ivory: clay('#fff2d8'),
    green: clay('#396b51'), rib: clay('#28543e'), trousers: clay('#455367'),
    sole: clay('#ddcdb1'), white: clay('#fffcf1'), mint: clay('#a9c3ac'),
    soil: clay('#725643'), gold: clay('#d7af69'), pages: clay('#ede0c8'),
  };
  materials.glasses.roughness = .37;
  const sphere = new SphereGeometry(1, 32, 24);
  const add = (parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ball = (parent, material, position, scale) => add(parent, sphere, material, position, scale);
  const box = (parent, material, size, position, radius = .07) =>
    add(parent, new RoundedBoxGeometry(...size, 3, radius), material, position);
  const line = (parent, material, points, radius = .02, closed = false) =>
    add(parent, new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p)), closed), 40, radius, 8, closed), material);

  // A miniature plinth, stacked notebooks, and a small potted plant.
  const stage = new Group();
  stage.name = 'LittleGarden';
  root.add(stage);
  add(stage, new CylinderGeometry(1.42, 1.48, .16, 64), materials.mint, [0, .04, 0]);
  add(stage, new CylinderGeometry(1.39, 1.42, .07, 64), materials.ivory, [0, .155, 0]);
  const books = new Group();
  books.position.set(-.91, .25, .27);
  books.rotation.y = -.28;
  stage.add(books);
  box(books, materials.green, [.57, .065, .43], [0, 0, 0], .022);
  box(books, materials.pages, [.52, .07, .38], [.015, .055, 0], .016);
  box(books, materials.green, [.57, .035, .43], [0, .105, 0], .012);
  const upperBook = new Group();
  upperBook.position.set(.02, .16, -.02);
  upperBook.rotation.y = .28;
  books.add(upperBook);
  box(upperBook, materials.gold, [.47, .11, .36], [0, 0, 0], .022);
  box(upperBook, materials.pages, [.43, .065, .32], [.01, .005, .012], .012);
  const plant = new Group();
  plant.position.set(.98, .2, -.12);
  stage.add(plant);
  add(plant, new CylinderGeometry(.17, .125, .26, 32), materials.ivory, [0, .13, 0]);
  add(plant, new CylinderGeometry(.155, .155, .015, 32), materials.soil, [0, .265, 0]);
  line(plant, materials.rib, [[0, .26, 0], [.015, .44, 0], [-.015, .72, 0]], .015);
  for (const [x, y, z, tilt] of [[-.10, .42, 0, -.8], [.105, .5, 0, .9], [-.09, .61, 0, -.8], [.055, .71, 0, .5]]) {
    const leaf = ball(plant, materials.green, [x, y, z], [.065, .14, .028]);
    leaf.rotation.z = -tilt;
  }

  const body = new Group();
  body.name = 'Body';
  root.add(body);
  for (const side of [-1, 1]) {
    const foot = box(body, materials.ivory, [.37, .25, .58], [side * .26, .335, .105], .1);
    foot.rotation.y = side * -.10;
    box(foot, materials.sole, [.375, .06, .575], [0, -.09, 0], .025);
    for (let i = 0; i < 3; i++) box(foot, materials.white, [.19, .023, .025], [0, .105, .07 - i * .065], .008);
    box(body, materials.trousers, [.35, .67, .37], [side * .25, .75, -.025], .12);
    box(body, materials.trousers, [.37, .12, .39], [side * .25, .49, -.025], .035);
  }
  ball(body, materials.ivory, [0, 1.47, -.01], [.53, .65, .34]);
  box(body, materials.green, [.91, .15, .56], [0, 1.05, .015], .065);
  box(body, materials.ivory, [.90, .036, .568], [0, 1.065, .018], .012);
  // Contrasting piping, central opening, pockets, and tiny jacket buttons.
  for (const side of [-1, 1]) {
    line(body, materials.green, [[side * .08, 1.93, .23], [side * .12, 1.64, .325], [side * .055, 1.2, .31]], .038);
    line(body, materials.green, [[side * .28, 1.43, .29], [side * .36, 1.31, .278]], .018);
  }
  for (const y of [1.35, 1.53, 1.71]) ball(body, materials.gold, [.018, y, .35], [.023, .023, .014]);
  const badge = box(body, materials.green, [.14, .18, .024], [-.28, 1.69, .304], .026);
  line(badge, materials.ivory, [[-.035, .045, .018], [.035, -.045, .018]], .012);
  line(badge, materials.ivory, [[.035, .045, .018], [-.035, -.045, .018]], .012);
  add(body, new CylinderGeometry(.17, .18, .28, 32), materials.skin, [0, 2.04, 0]);
  const collar = add(body, new CylinderGeometry(.265, .29, .15, 48, 1, true), materials.green, [0, 1.98, 0]);
  collar.scale.z = .85;
  const collarStripe = add(body, new CylinderGeometry(.271, .28, .033, 48, 1, true), materials.ivory, [0, 1.998, 0]);
  collarStripe.scale.z = .85;

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new Group();
    arm.name = side === 1 ? 'WavingArm' : 'NotebookArm';
    arm.position.set(side * .45, 1.87, 0);
    arm.rotation.z = side * .15;
    body.add(arm);
    arms.push(arm);
    ball(arm, materials.ivory, [side * .025, -.28, 0], [.205, .37, .235]);
    const stripe = box(arm, materials.green, [.06, .37, .045], [side * .1, -.22, .19], .02);
    stripe.rotation.z = -side * .1;
    add(arm, new CylinderGeometry(.151, .145, .15, 32), materials.green, [0, -.56, 0]);
    add(arm, new CylinderGeometry(.153, .153, .032, 32), materials.ivory, [0, -.56, 0]);
    ball(arm, materials.skin, [0, -.735, .012], [.14, .165, .115]);
    ball(arm, materials.skin, [-side * .12, -.68, .06], [.067, .09, .07]);
    for (let finger = 0; finger < 3; finger++) {
      ball(arm, materials.skin, [-.075 + finger * .071, -.85, .012], [.041, .065, .075]);
    }
  }
  const notebook = new Group();
  notebook.name = 'PocketNotebook';
  notebook.position.set(.02, -.56, .15);
  notebook.rotation.set(-.15, .1, -.18);
  arms[0].add(notebook);
  box(notebook, materials.green, [.34, .44, .09], [0, -.01, 0], .027);
  box(notebook, materials.pages, [.295, .39, .073], [.02, -.01, .008], .012);
  box(notebook, materials.green, [.34, .44, .02], [0, -.01, .052], .01);
  box(notebook, materials.gold, [.028, .43, .023], [.085, -.01, .069], .008);

  const head = new Group();
  head.name = 'Head';
  head.position.set(0, 2.62, 0);
  body.add(head);
  ball(head, materials.skin, [0, 0, 0], [.66, .70, .57]);
  for (const side of [-1, 1]) {
    ball(head, materials.skin, [side * .65, -.025, 0], [.14, .205, .13]);
    ball(head, materials.blush, [side * .685, -.025, .087], [.062, .115, .027]);
    ball(head, materials.blush, [side * .425, -.21, .43], [.112, .052, .025]).rotation.y = side * .55;
  }
  // A fitted hair cap and overlapping sculpted locks give an asymmetric silhouette.
  add(head, new SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, 1.62), materials.hair, [0, .17, -.06], [.72, .70, .63]);
  ball(head, materials.hair, [0, .12, -.32], [.69, .65, .35]);
  const locks = [
    [[.25, .66, .22], [-.05, .72, .42], [-.42, .48, .55], [-.61, .12, .43], [-.77, .13, .23]],
    [[.37, .64, .22], [.12, .67, .48], [-.22, .4, .59], [-.4, .16, .56]],
    [[.43, .58, .18], [.25, .54, .51], [.02, .3, .59], [-.10, .17, .55]],
    [[.42, .62, .13], [.6, .45, .38], [.59, .11, .40], [.72, .02, .21]],
    [[-.41, .46, .1], [-.64, .28, .15], [-.69, -.16, .12], [-.61, -.30, .15]],
    [[.5, .37, .0], [.68, .23, .10], [.7, -.1, .07], [.62, -.23, .12]],
  ];
  locks.forEach((points, index) => {
    const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)));
    const geometry = new TubeGeometry(curve, 36, 1, 12, false);
    const positions = geometry.attributes.position;
    const radius = index < 3 ? .22 - index * .022 : .145;
    // Taper each strand toward a soft point, and flatten its depth like sculpted clay.
    for (let ring = 0; ring <= 36; ring++) {
      const t = ring / 36;
      const center = curve.getPointAt(t);
      const width = radius * Math.pow(Math.sin((.12 + t * .88) * Math.PI), .65) + .006;
      for (let vertex = 0; vertex <= 12; vertex++) {
        const index = ring * 13 + vertex;
        positions.setXYZ(index,
          center.x + (positions.getX(index) - center.x) * width,
          center.y + (positions.getY(index) - center.y) * width,
          center.z + (positions.getZ(index) - center.z) * width * .53);
      }
    }
    geometry.computeVertexNormals();
    add(head, geometry, index === 0 ? materials.hairLight : materials.hair);
  });
  line(head, materials.hair, [[.05, .79, -.06], [.015, .96, -.04], [-.14, 1.01, -.02], [-.23, .95, 0]], .032);
  line(head, materials.hairLight, [[.10, .80, -.065], [.15, .94, -.05], [.24, .97, -.04]], .022);

  const eyes = new Group();
  eyes.name = 'Eyes';
  eyes.position.set(0, -.015, .55);
  head.add(eyes);
  for (const side of [-1, 1]) {
    ball(eyes, materials.glasses, [side * .28, 0, -.007], [.061, .083, .04]);
    ball(eyes, materials.white, [side * .28 - .016, .024, .028], [.016, .02, .008]);
    line(head, materials.hair, [[side * .17, .22, .533], [side * .29, .25, .50], [side * .39, .22, .465]], .021);
    const frame = new Group();
    frame.position.set(side * .31, -.035, .555);
    frame.rotation.y = side * .20;
    head.add(frame);
    const shape = roundedRectangle(.51, .375, .12);
    line(frame, materials.glasses, shape.getPoints(8).map(p => [p.x, p.y, .04]), .026, true);
    line(head, materials.glasses, [[side * .55, .08, .44], [side * .66, .06, .10], [side * .66, -.015, -.03]], .023);
    line(frame, materials.white, [[-.12, .135, .053], [-.05, .146, .053]], .008);
  }
  line(head, materials.glasses, [[-.065, .03, .60], [0, .045, .625], [.065, .03, .60]], .022);
  ball(head, materials.skin, [0, -.15, .567], [.08, .105, .105]);
  line(head, materials.hair, [[-.145, -.33, .487], [-.07, -.37, .506], [.015, -.38, .515], [.115, -.34, .492]], .017);

  const greeting = new AnimationClip('Hello', 2.8, [
    rotationTrack('WavingArm', [0, .38, .65, .9, 1.15, 1.4, 1.65, 1.95, 2.3, 2.8],
      [.15, 2.55, 2.32, 2.78, 2.32, 2.78, 2.32, 2.65, 2.45, .15]),
  ]);
  const breathing = new AnimationClip('Breathe', 3.6, [
    new VectorKeyframeTrack('Body.position', [0, .9, 1.8, 2.7, 3.6], [0, 0, 0, 0, .018, 0, 0, 0, 0, 0, -.018, 0, 0, 0, 0]),
  ]);
  const blink = new AnimationClip('Blink', 4.4, [
    new VectorKeyframeTrack('Eyes.scale', [0, 3.9, 4, 4.1, 4.4], [1, 1, 1, 1, 1, 1, 1, .08, 1, 1, 1, 1, 1, 1, 1]),
  ]);
  const notes = new AnimationClip('Notebook', 3.5, [
    new QuaternionKeyframeTrack('NotebookArm.quaternion', [0, .7, 2.7, 3.5],
      [0, -1.12, -1.12, 0].flatMap(x => new Quaternion().setFromEuler(new Euler(x, 0, -.15)).toArray())),
    new QuaternionKeyframeTrack('Head.quaternion', [0, .7, 2.7, 3.5],
      [0, .22, .22, 0].flatMap(x => new Quaternion().setFromEuler(new Euler(x, 0, 0)).toArray())),
  ]);
  const turn = new AnimationClip('Turn', 2.1, [
    new QuaternionKeyframeTrack('Body.quaternion', [0, .525, 1.05, 1.575, 2.1],
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2].flatMap(y => new Quaternion().setFromEuler(new Euler(0, y, 0)).toArray())),
  ]);
  return { root, body, head, eyes, waveArm: arms[1], notebookArm: arms[0], plant, animations: [greeting, breathing, blink, notes, turn] };
}

function clay(color) {
  return new MeshStandardMaterial({ color: new Color(color), roughness: .73, metalness: 0 });
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

function rotationTrack(name, times, angles) {
  const values = angles.flatMap(angle => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle).toArray());
  return new QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
}
