import {
  AnimationClip, BoxGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Group, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, QuaternionKeyframeTrack,
  Shape, TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** A self-contained G-Class display model; no remote meshes or textures. Front is +Z. */
export function createGClassModel() {
  const root = new Group();
  root.name = 'MercedesGClass';
  const body = new Group();
  body.name = 'GClassBody';
  root.add(body);
  const materials = {
    paint: new MeshPhysicalMaterial({ color: '#1c232a', metalness: .72, roughness: .27, clearcoat: 1, clearcoatRoughness: .16 }),
    trim: new MeshStandardMaterial({ color: '#11161d', metalness: .2, roughness: .48 }),
    rubber: new MeshStandardMaterial({ color: '#17191d', roughness: .91 }),
    chrome: new MeshStandardMaterial({ color: '#c9d3dc', metalness: .95, roughness: .23 }),
    alloy: new MeshStandardMaterial({ color: '#788591', metalness: .88, roughness: .3 }),
    glass: new MeshPhysicalMaterial({ color: '#263e4b', metalness: .35, roughness: .12, clearcoat: 1 }),
    reflection: new MeshStandardMaterial({ color: '#8aa5b4', metalness: .55, roughness: .2 }),
    leather: new MeshStandardMaterial({ color: '#715d4d', roughness: .8 }),
    brake: new MeshStandardMaterial({ color: '#a32931', metalness: .25, roughness: .38 }),
    led: new MeshStandardMaterial({ color: '#f0f6ff', emissive: '#d5e7ff', emissiveIntensity: .8, roughness: .24 }),
    lens: new MeshPhysicalMaterial({ color: '#7d9bad', metalness: .55, roughness: .1, clearcoat: 1 }),
    amber: new MeshStandardMaterial({ color: '#e5a049', emissive: '#e58321', emissiveIntensity: .25, roughness: .3 }),
    red: new MeshStandardMaterial({ color: '#aa2730', emissive: '#c5242f', emissiveIntensity: .3, roughness: .22 }),
  };
  const geometries = new Map();
  function mesh(parent, geometry, material, position = [0, 0, 0], name) {
    const part = new Mesh(geometry, material);
    part.position.set(...position);
    part.castShadow = part.receiveShadow = true;
    if (name) part.name = name;
    parent.add(part);
    return part;
  }
  function box(parent, material, size, position, radius = .015, name) {
    const key = [...size, radius].join(',');
    if (!geometries.has(key)) geometries.set(key, radius ? new RoundedBoxGeometry(...size, 1, radius) : new BoxGeometry(...size));
    return mesh(parent, geometries.get(key), material, position, name);
  }
  function cylinder(parent, material, radius, depth, position, axis = 'z', segments = 32) {
    const key = `cylinder:${radius}:${depth}:${segments}`;
    if (!geometries.has(key)) geometries.set(key, new CylinderGeometry(radius, radius, depth, segments));
    const part = mesh(parent, geometries.get(key), material, position);
    if (axis === 'x') part.rotation.z = Math.PI / 2;
    else if (axis === 'z') part.rotation.x = Math.PI / 2;
    return part;
  }
  function ring(parent, material, radius, thickness, position, axis = 'z') {
    const key = `ring:${radius}:${thickness}`;
    if (!geometries.has(key)) geometries.set(key, new TorusGeometry(radius, thickness, 8, 40));
    const part = mesh(parent, geometries.get(key), material, position);
    if (axis === 'x') part.rotation.y = Math.PI / 2;
    return part;
  }
  function badge(parent, radius, position, back = false) {
    const badge = new Group();
    badge.name = 'ThreePointedStar';
    badge.position.set(...position);
    if (back) badge.rotation.y = Math.PI;
    parent.add(badge);
    ring(badge, materials.chrome, radius, radius * .075, [0, 0, 0]);
    const star = new Shape();
    for (let index = 0; index < 6; index++) {
      const angle = Math.PI / 2 + index * Math.PI / 3;
      const length = index % 2 ? radius * .17 : radius * .92;
      const x = Math.cos(angle) * length, y = Math.sin(angle) * length;
      if (!index) star.moveTo(x, y); else star.lineTo(x, y);
    }
    star.closePath();
    mesh(badge, new ExtrudeGeometry(star, { depth: .012, bevelEnabled: false }), materials.chrome);
    return badge;
  }

  // A low body tub leaves an actual cabin opening behind the hinged front doors.
  box(body, materials.trim, [1.80, .18, 4.08], [0, .57, 0], .025, 'Chassis');
  box(body, materials.paint, [2.02, .50, 4.10], [0, .86, 0], .045, 'BodyTub');
  box(body, materials.paint, [1.99, .38, 1.24], [0, 1.27, 1.49], .035, 'FlatBonnet');
  box(body, materials.paint, [2.01, .13, 2.96], [0, 2.35, -.43], .025, 'FlatRoof');
  box(body, materials.glass, [1.35, .014, 1.17], [0, 2.423, -.46], .025, 'Sunroof');
  box(body, materials.trim, [1.83, .13, 2.74], [0, 1.08, -.42], .025, 'CabinFloor');

  // Windscreen, external hinges, roof gutters and rear quarter windows.
  const windshield = box(body, materials.glass, [1.78, .70, .035], [0, 1.93, 1.032], .018, 'UprightWindscreen');
  windshield.rotation.x = -.12;
  box(body, materials.paint, [1.99, .10, .10], [0, 2.29, .97], .012);
  box(body, materials.trim, [1.99, .10, .10], [0, 1.55, 1.075], .012);
  for (const side of [-1, 1]) {
    box(body, materials.paint, [.11, .79, .11], [side * .95, 1.92, 1.015], .012).rotation.x = -.12;
    box(body, materials.chrome, [.035, .035, 2.98], [side * 1.015, 2.33, -.43], .006);
    box(body, materials.trim, [.055, .045, 4.02], [side * 1.024, 1.12, .01], .006);
    box(body, materials.paint, [.09, .77, 1.46], [side * 1.006, 1.29, -1.09], .014);
    for (const [z, length] of [[-.77, .72], [-1.53, .55]]) {
      box(body, materials.trim, [.065, .73, length + .07], [side * 1.014, 1.94, z], .015);
      box(body, materials.glass, [.073, .63, length], [side * 1.02, 1.95, z], .014);
      box(body, materials.reflection, [.008, .018, length * .78], [side * 1.061, 2.19, z], .002);
    }
    box(body, materials.paint, [.10, .75, .10], [side * .98, 1.94, -1.9], .012);
    box(body, materials.trim, [.03, .74, .035], [side * 1.06, 1.25, -.37], .002);
    box(body, materials.chrome, [.04, .055, .20], [side * 1.07, 1.53, -.99], .007);
    box(body, materials.trim, [.29, .10, 2.14], [side * 1.12, .54, -.21], .016, 'SideStep');
    box(body, materials.chrome, [.23, .018, 2.04], [side * 1.12, .598, -.21], .005);
    for (let slot = 0; slot < 3; slot++) box(body, materials.trim, [.018, .026, .28], [side * 1.014, 1.29 + slot * .067, 1.13], .002);
  }
  box(body, materials.paint, [1.99, 1.02, .13], [0, 1.65, -1.94], .018, 'Tailgate');
  box(body, materials.glass, [1.76, .60, .025], [0, 1.96, -2.018], .018, 'RearWindow');
  box(body, materials.reflection, [1.45, .018, .008], [0, 2.18, -2.034], .002);
  for (const side of [-1, 1]) {
    const wiper = box(body, materials.trim, [.39, .025, .018], [side * .42, 1.64, 1.105], .003);
    wiper.rotation.z = side * .12;
    box(body, materials.leather, [.62, .42, .55], [side * .48, 1.27, .10], .06, 'FrontSeat');
    box(body, materials.leather, [.62, .69, .15], [side * .48, 1.60, -.10], .045);
    box(body, materials.leather, [.31, .20, .14], [side * .48, 2.02, -.10], .04);
  }
  box(body, materials.trim, [1.62, .22, .30], [0, 1.55, .75], .03, 'Dashboard');
  const steering = ring(body, materials.trim, .18, .025, [-.47, 1.63, .52]);
  steering.rotation.x = -.35;

  const doors = [];
  for (const side of [-1, 1]) {
    const door = new Group();
    door.name = side === 1 ? 'FrontRightDoor' : 'FrontLeftDoor';
    door.position.set(side * 1.01, 1.08, .94);
    door.userData.side = side;
    body.add(door);
    doors.push(door);
    box(door, materials.paint, [.085, .72, 1.25], [0, .18, -.625], .016);
    box(door, materials.glass, [.055, .58, 1.10], [side * .003, .84, -.625], .012);
    box(door, materials.paint, [.085, .055, 1.25], [0, 1.16, -.625], .008);
    for (const z of [-.027, -1.223]) box(door, materials.paint, [.085, .68, .055], [0, .84, z], .007);
    box(door, materials.trim, [.092, .055, 1.25], [0, .53, -.625], .005);
    box(door, materials.chrome, [.03, .018, 1.20], [side * .05, .57, -.625], .003);
    box(door, materials.trim, [.097, .035, 1.25], [0, .025, -.625], .004);
    box(door, materials.chrome, [.045, .055, .22], [side * .063, .39, -1.01], .009, 'DoorHandle');
    for (const y of [.10, .42]) box(door, materials.chrome, [.055, .052, .15], [side * .06, y, -.035], .007, 'ExternalHinge');
    box(door, materials.trim, [.17, .07, .08], [side * .08, .79, -.03], .009);
    box(door, materials.paint, [.24, .19, .29], [side * .22, .80, -.03], .035, 'DoorMirror');
    box(door, materials.chrome, [.018, .13, .21], [side * .353, .81, -.05], .015);
    box(door, materials.amber, [.22, .022, .016], [side * .22, .79, .123], .004);
  }

  // Flared arches and four independently rotating road wheels.
  const arch = new Shape();
  const archPoints = [[-.68,-.24],[-.68,.15],[-.42,.58],[.42,.58],[.68,.15],[.68,-.24],[.50,-.24],[.50,.10],[.31,.37],[-.31,.37],[-.50,.10],[-.50,-.24]];
  archPoints.forEach(([x,y], index) => index ? arch.lineTo(x,y) : arch.moveTo(x,y));
  arch.closePath();
  const archGeometry = new ExtrudeGeometry(arch, { depth: .19, bevelEnabled: true, bevelSegments: 1, bevelSize: .015, bevelThickness: .015, steps: 1 });
  const wheels = [];
  for (const side of [-1, 1]) for (const axle of [-1, 1]) {
    const z = axle * 1.38;
    const fender = mesh(body, archGeometry, materials.paint, [side * 1.02, .49, z], 'FlaredWheelArch');
    fender.rotation.y = side * Math.PI / 2;
    const wheel = new Group();
    wheel.name = `Wheel${axle > 0 ? 'Front' : 'Rear'}${side > 0 ? 'Right' : 'Left'}`;
    wheel.position.set(side * 1.10, .48, z);
    body.add(wheel);
    wheels.push(wheel);
    cylinder(wheel, materials.rubber, .465, .29, [0, 0, 0], 'x', 40);
    ring(wheel, materials.rubber, .367, .098, [side * .12, 0, 0], 'x');
    const face = new Group();
    face.position.x = side * .165;
    face.rotation.y = side * Math.PI / 2;
    wheel.add(face);
    cylinder(face, materials.trim, .337, .028, [0, 0, 0]);
    cylinder(face, materials.alloy, .25, .015, [0, 0, .02]);
    box(face, materials.brake, [.065, .19, .035], [-.19, .03, .042], .008);
    ring(face, materials.chrome, .312, .015, [0, 0, .03]);
    for (let spoke = 0; spoke < 5; spoke++) for (const offset of [-.055, .055]) {
      const angle = spoke * Math.PI * .4 + offset;
      const part = box(face, materials.chrome, [.033, .225, .023], [Math.sin(angle) * .178, Math.cos(angle) * .178, .053], .005);
      part.rotation.z = -angle;
    }
    cylinder(face, materials.trim, .074, .03, [0, 0, .06]);
    badge(face, .054, [0, 0, .082]);
    for (let tread = 0; tread < 20; tread++) {
      const angle = tread * Math.PI / 10;
      const block = box(wheel, materials.trim, [.24, .015, .055], [0, Math.cos(angle) * .462, Math.sin(angle) * .462], .002);
      block.rotation.x = angle;
    }
  }

  // Round LED headlamps, grille star, bumper intakes and raised indicators.
  box(body, materials.paint, [2.02, .61, .12], [0, 1.26, 2.07], .035, 'FrontFascia');
  box(body, materials.trim, [1.13, .46, .045], [0, 1.29, 2.145], .018, 'VerticalBarGrille');
  for (let bar = 0; bar < 13; bar++) box(body, materials.chrome, [.027, .395, .026], [(bar - 6) * .077, 1.29, 2.18], .004);
  cylinder(body, materials.trim, .186, .038, [0, 1.29, 2.208]);
  badge(body, .157, [0, 1.29, 2.233]);
  for (const side of [-1, 1]) {
    cylinder(body, materials.trim, .241, .075, [side * .773, 1.30, 2.128]);
    cylinder(body, materials.lens, .200, .018, [side * .773, 1.30, 2.176]);
    ring(body, materials.led, .190, .022, [side * .773, 1.30, 2.193]);
    cylinder(body, materials.lens, .105, .022, [side * .773, 1.30, 2.193]);
    box(body, materials.chrome, [.24, .016, .018], [side * .773, 1.27, 2.211], .002);
    box(body, materials.trim, [.22, .05, .25], [side * .85, 1.49, 1.54], .01);
    box(body, materials.amber, [.185, .068, .18], [side * .85, 1.54, 1.54], .014, 'RaisedTurnSignal');
  }
  box(body, materials.trim, [2.13, .25, .26], [0, .85, 2.17], .035, 'FrontBumper');
  box(body, materials.chrome, [1.34, .045, .038], [0, .72, 2.31], .006);
  for (const side of [-1, 1]) box(body, materials.alloy, [.32, .10, .032], [side * .77, .87, 2.31], .006);
  box(body, materials.trim, [.46, .135, .028], [0, .88, 2.32], .008, 'FrontNumberPlate');
  for (let mark = 0; mark < 3; mark++) box(body, materials.chrome, [.045, .056, .007], [(mark - 1) * .075, .88, 2.339], .002);

  // Rear-mounted covered spare wheel, tail lamps and twin side exhausts.
  cylinder(body, materials.rubber, .443, .22, [0, 1.43, -2.15]);
  cylinder(body, materials.paint, .410, .12, [0, 1.43, -2.31]).name = 'SpareWheelCover';
  ring(body, materials.chrome, .405, .018, [0, 1.43, -2.378]);
  badge(body, .12, [0, 1.43, -2.38], true);
  box(body, materials.trim, [2.10, .22, .22], [0, .66, -2.12], .028, 'RearBumper');
  for (const side of [-1, 1]) {
    box(body, materials.red, [.30, .14, .055], [side * .80, .95, -2.108], .014, 'RearLamp');
    box(body, materials.amber, [.26, .025, .012], [side * .80, .95, -2.141], .003);
  }
  for (const z of [-.42, -.60]) {
    cylinder(body, materials.chrome, .057, .27, [1.17, .41, z], 'x', 20);
    cylinder(body, materials.trim, .043, .01, [1.311, .41, z], 'x', 20);
  }

  const animations = [
    new AnimationClip('OpenDoors', 1.2, doors.map(door => quaternionTrack(door.name, [0, 1.2], [[0,0,0], [0,-door.userData.side * 1.05,0]]))),
    new AnimationClip('CloseDoors', 1.2, doors.map(door => quaternionTrack(door.name, [0, 1.2], [[0,-door.userData.side * 1.05,0], [0,0,0]]))),
    new AnimationClip('Turntable', 5, [quaternionTrack('GClassBody', [0,1.25,2.5,3.75,5], [0,.5,1,1.5,2].map(angle => [0,angle * Math.PI,0]))]),
    new AnimationClip('Wheels', 3, wheels.map(wheel => quaternionTrack(wheel.name, [0,.75,1.5,2.25,3], [0,.5,1,1.5,2].map(angle => [angle * Math.PI,0,0])))),
  ];
  root.userData.model = 'Mercedes-Benz G-Class display model';
  return { root, body, doors, wheels, materials, animations };
}

function quaternionTrack(name, times, angles) {
  return new QuaternionKeyframeTrack(`${name}.quaternion`, times,
    angles.flatMap(([x,y,z]) => new Quaternion().setFromEuler(new Euler(x,y,z)).toArray()));
}
