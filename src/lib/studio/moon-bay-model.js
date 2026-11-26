import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
/** The original Moon Bay diorama. Shared geometry keeps the downloadable model compact.
 * @returns {import('three').Group}
 */
export function createMoonBayStudio() {
    const model = new T.Group();
    model.name = 'Moon Bay Sakura Studio';
    const materials = {};
    const sphereGeometry = new T.SphereGeometry(1, 18, 12);
    const roundedGeometries = new Map();
    function mat(name, color, roughness = .5, metalness = 0) { return materials[name] ??= new T.MeshStandardMaterial({ color, roughness, metalness }); }
    const cream = mat('cream', '#f4eee4'), white = mat('porcelain', '#fcfaf7', .35), blue = mat('blue', '#91b5d8'), wood = mat('oak', '#c4a381', .65), gold = mat('champagne', '#c8a975', .3, .45), pink = mat('pink', '#dea7bf'), sage = mat('sage', '#9ab7a5');
    function mesh(geo, material, pos = [0, 0, 0], parent = model) { const m = new T.Mesh(geo, material); m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    function box(w, h, d, x, y, z, m = white, r = .04, p = model) { const key = [w, h, d, r].join(','); let geometry = roundedGeometries.get(key); if (!geometry) {
        geometry = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
        roundedGeometries.set(key, geometry);
    } return mesh(geometry, m, [x, y, z], p); }
    function ball(r, x, y, z, m = white, s = [1, 1, 1], p = model) { const o = mesh(sphereGeometry, m, [x, y, z], p); o.scale.set(r * s[0], r * s[1], r * s[2]); return o; }
    function cylinder(rt, rb, h, x, y, z, m = white, p = model) { return mesh(new T.CylinderGeometry(rt, rb, h, 64), m, [x, y, z], p); }
    function bar(a, b, r, m = gold, p = model) { const start = new T.Vector3(...a), end = new T.Vector3(...b), v = end.clone().sub(start); const o = mesh(new T.CylinderGeometry(r, r, v.length(), 12), m, start.clone().add(end).multiplyScalar(.5).toArray(), p); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); return o; }
    function tube(points, r, m = gold, p = model) { return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v => new T.Vector3(...v))), 32, r, 8, false), m, [0, 0, 0], p); }
    function ring(radius, tubeR, x, y, z, m = gold, p = model) { const o = mesh(new T.TorusGeometry(radius, tubeR, 10, 80), m, [x, y, z], p); return o; }
    function star(size, depth, x, y, z, m = gold, p = model) { const shape = new T.Shape(); for (let i = 0; i < 10; i++) {
        const r = i % 2 ? size * .44 : size, a = Math.PI / 2 + i * Math.PI / 5;
        const vx = Math.cos(a) * r, vy = Math.sin(a) * r;
        i ? shape.lineTo(vx, vy) : shape.moveTo(vx, vy);
    } shape.closePath(); return mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2, steps: 1 }), m, [x, y, z], p); }
    function arch(cx, bottom, spring, r) { const s = new T.Shape(); s.moveTo(cx - r, bottom); s.lineTo(cx + r, bottom); s.lineTo(cx + r, spring); s.absarc(cx, spring, r, 0, Math.PI, false); s.lineTo(cx - r, bottom); return s; }
    function plant(x, y, z, size = .4, p = model) { cylinder(size * .32, size * .25, size * .47, x, y + size * .23, z, white, p); for (let i = 0; i < 7; i++) {
        const a = i * 2.4;
        const leaf = ball(size * .25, x + Math.cos(a) * size * .22, y + size * .63 + (i % 3) * size * .08, z + Math.sin(a) * size * .22, sage, [.45, 1.7, .75], p);
        leaf.rotation.set(Math.sin(a) * .6, a, Math.cos(a) * .6);
    } }
    function markSince(start, key) { const items = model.children.slice(start); const group = new T.Group(); group.name = 'studio-' + key; group.userData.studioObject = key; group.add(...items); model.add(group); return group; }
    // Moon Bay: an open arched atelier, crescent water garden and sculptural cherry tree.
    const navy = mat('midnight-blue', '#263c64', .42), blueInk = mat('blue-ceramic', '#416c91', .35), warmOak = mat('smoked-oak', '#a97e5e', .6), stone = mat('limestone', '#e8decd', .7);
    const water = new T.MeshPhysicalMaterial({ color: '#6babc3', roughness: .2, metalness: .16, clearcoat: 1, clearcoatRoughness: .16 });
    const lightMaterial = new T.MeshStandardMaterial({ color: '#ffedc0', emissive: '#ffca73', emissiveIntensity: .55, roughness: .4 });
    // The layered ceramic plinth keeps the complete scene a single readable object.
    cylinder(4.05, 3.96, .26, 0, -.13, 0, stone);
    cylinder(3.96, 3.8, .36, 0, -.43, 0, navy);
    const baseGold = ring(3.965, .022, 0, -.27, 0, gold);
    baseGold.rotation.x = Math.PI / 2;
    const bottomGold = ring(3.81, .012, 0, -.60, 0, gold);
    bottomGold.rotation.x = Math.PI / 2;
    const topRim = ring(3.96, .018, 0, .015, 0, cream);
    topRim.rotation.x = Math.PI / 2;
    // A crescent water ribbon, deliberately opaque to retain clean reconstruction cues.
    function sector(inner, outer, start, end) { const s = new T.Shape(); s.absarc(0, 0, outer, start, end, false); s.lineTo(Math.cos(end) * inner, Math.sin(end) * inner); s.absarc(0, 0, inner, end, start, true); s.closePath(); return s; }
    const pool = mesh(new T.ExtrudeGeometry(sector(2.94, 3.73, .03 * Math.PI, .95 * Math.PI), { depth: .055, bevelEnabled: true, bevelSize: .045, bevelThickness: .025, bevelSegments: 3 }), water, [0, .035, 0]);
    pool.rotation.x = Math.PI / 2;
    for (const r of [2.93, 3.75]) {
        const edge = mesh(new T.TorusGeometry(r, .035, 10, 96, Math.PI * .92), cream, [0, .048, 0]);
        edge.rotation.x = Math.PI / 2;
        edge.rotation.z = -Math.PI * .95;
    }
    for (const [x, z] of [[-.98, 3.13], [-.64, 2.97], [-.3, 2.83]]) {
        const step = cylinder(.245, .25, .085, x, .10, z, cream);
        step.scale.z = .67;
    }
    const waterRing = ring(.26, .008, 2.62, .051, 1.68, mat('water-reflection', '#bcdae4', .25));
    waterRing.rotation.x = Math.PI / 2;
    waterRing.scale.y = .55;
    // Raised timber terrace, wide front step and fine floor joints.
    box(4.35, .20, 3.05, -.05, .15, -.95, warmOak, .13);
    box(3.85, .065, 2.75, -.05, .28, -.97, wood, .08);
    for (let i = 0; i < 12; i++)
        box(.008, .006, 2.62, -1.75 + i * .31, .316, -.98, warmOak, .001);
    box(2.5, .12, .52, -.05, .12, .78, cream, .06);
    box(2.10, .07, .43, -.05, .057, 1.13, stone, .05);
    // Tall arch behind the desk: navy inset, warm ceramic reveal and gold edge.
    const backShape = arch(0, .32, 2.14, 1.74);
    const backGeo = new T.ExtrudeGeometry(backShape, { depth: .14, bevelEnabled: true, bevelSize: .045, bevelThickness: .025, bevelSegments: 4 });
    mesh(backGeo, navy, [0, 0, -2.34]);
    function archBand(radius, width, bottom, spring, depth, z, material) { const outline = arch(0, bottom, spring, radius); outline.holes.push(new T.Path(arch(0, bottom + .035, spring, radius - width).getPoints(64))); return mesh(new T.ExtrudeGeometry(outline, { depth, bevelEnabled: true, bevelSize: .018, bevelThickness: .018, bevelSegments: 3 }), material, [0, 0, z]); }
    archBand(1.82, .10, .31, 2.14, .09, -2.17, gold);
    archBand(2.02, .16, .30, 2.12, .15, .40, cream);
    archBand(1.87, .035, .31, 2.12, .025, .56, gold);
    for (const x of [-1.94, 1.94]) {
        box(.12, .12, 2.74, x, .38, -.90, gold, .025);
        box(.18, 1.0, .14, x, .82, -2.1, cream, .035);
    }
    // Slender overhead ribs leave the whole interior visible from above.
    for (const angle of [Math.PI * .24, Math.PI * .5, Math.PI * .76]) {
        const backX = Math.cos(angle) * 1.78, backY = 2.14 + Math.sin(angle) * 1.78;
        const frontX = Math.cos(angle) * 2.00, frontY = 2.12 + Math.sin(angle) * 2.00;
        bar([backX, backY, -2.10], [frontX, frontY, .48], .035, gold);
    }
    // Moon and embossed stars, contained on the blue back panel.
    const moonShape = new T.Shape();
    moonShape.moveTo(.10, .40);
    moonShape.absarc(0, 0, .415, Math.acos(.10 / .415), Math.PI * 2 - Math.acos(.10 / .415), false);
    moonShape.quadraticCurveTo(-.15, 0, .10, .40);
    mesh(new T.ExtrudeGeometry(moonShape, { depth: .045, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3 }), lightMaterial, [-.63, 2.93, -2.13]);
    for (const [x, y, s] of [[.32, 3.25, .08], [.92, 2.93, .045], [-1.14, 2.52, .05], [.42, 2.68, .04], [-.15, 3.49, .035], [1.17, 2.38, .055]])
        star(s, .025, x, y, -2.13, gold);
    for (let i = 0; i < 10; i++)
        ball(.012, -1.2 + i * .24, 2.3 + (i % 4) * .23, -2.135, cream, [1, 1, .3]);
    // A suspended moon-star mobile and warm pendants.
    bar([.75, 3.95, .42], [.75, 3.15, .42], .01, gold);
    star(.13, .035, .75, 3.02, .42, lightMaterial);
    for (const x of [-1.72, 1.72]) {
        bar([x, 2.73, .40], [x, 2.30, .40], .012, gold);
        cylinder(.085, .12, .21, x, 2.20, .40, lightMaterial);
        ring(.11, .011, x, 2.09, .40, gold).rotation.x = Math.PI / 2;
        const glow = new T.PointLight('#ffd4a0', 1.5, 3.8, 2);
        glow.position.set(x, 2.18, .30);
        model.add(glow);
    }
    // Integrated desk with quiet, substantial silhouettes.
    const aiStart = model.children.length;
    box(2.75, .14, .91, -.20, 1.37, -.88, warmOak, .09);
    for (const x of [-1.37, .97])
        box(.12, 1.08, .70, x, .82, -.88, cream, .03);
    const archiveStart = model.children.length;
    box(.62, .72, .62, .65, .99, -.89, blueInk, .05);
    for (let i = 0; i < 2; i++) {
        box(.55, .29, .04, .65, .84 + i * .32, -.556, cream, .02);
        box(.16, .018, .035, .65, .88 + i * .32, -.52, gold, .008);
    }
    markSince(archiveStart, "archive");
    box(1.8, .016, .67, -.47, 1.451, -.85, mat('desk-leather', '#668cab', .8), .08);
    box(1.16, .70, .07, -.49, 1.97, -1.03, navy, .045);
    box(1.05, .59, .014, -.49, 1.98, -.985, mat('monitor-blue', '#c4dce8', .35), .025);
    box(.22, .51, .017, -.86, 1.98, -.97, blueInk, .006);
    for (let i = 0; i < 4; i++) {
        box(.11, .02, .015, -.87, 2.15 - i * .11, -.953, cream, .005);
        box(.5 - i * .045, .027, .015, -.36, 2.15 - i * .12, -.952, white, .006);
    }
    bar([-.49, 1.46, -1.04], [-.49, 1.62, -1.04], .038, gold);
    box(.42, .026, .23, -.49, 1.475, -.97, navy, .04);
    box(.91, .028, .28, -.54, 1.476, -.58, cream, .026);
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 10; col++)
            box(.065, .012, .052, -.91 + col * .082, 1.494, -.66 + row * .073, col === 0 ? pink : white, .008);
    ball(.09, .10, 1.478, -.57, pink, [.75, .27, 1.2]);
    // Slim desk lamp and two envelopes.
    cylinder(.12, .13, .025, -1.2, 1.47, -1.06, gold);
    tube([[-1.2, 1.48, -1.06], [-1.21, 1.92, -1.06], [-1.05, 2.04, -1.04], [-.94, 1.99, -.98]], .019, gold);
    const lamp = mesh(new T.ConeGeometry(.12, .14, 48, 1, true), cream, [-.94, 1.96, -.98]);
    lamp.rotation.z = .25;
    const contactStart = model.children.length;
    box(.27, .012, .18, .68, 1.458, -.66, cream, .016);
    tube([[.55, 1.47, -.75], [.68, 1.47, -.63], [.81, 1.47, -.75]], .005, gold);
    markSince(contactStart, "contact");
    markSince(aiStart, "ai");
    // Low curved bookcase following the open pavilion's left side.
    const bookcase = new T.Group();
    bookcase.position.set(-1.20, .34, -1.83);
    bookcase.name = "studio-notes";
    bookcase.userData.studioObject = "notes";
    model.add(bookcase);
    box(.85, 1.65, .10, 0, .82, -.13, warmOak, .04, bookcase);
    for (const x of [-.43, .43])
        box(.065, 1.68, .43, x, .84, .04, cream, .025, bookcase);
    for (const y of [.06, .57, 1.08, 1.65])
        box(.92, .055, .44, 0, y, .04, cream, .02, bookcase);
    const bookColors = [pink, blue, cream, sage, mat('lilac', '#b3a3c5')];
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) {
            const h = .31 + (col % 2) * .06;
            const book = box(.11, h, .27, -.27 + col * .16, .10 + row * .52 + h / 2, .08, bookColors[(row + col) % 5], .01, bookcase);
            if (col === 3)
                book.rotation.z = -.13;
            box(.06, .012, .012, -.27 + col * .16, .17 + row * .52, .223, gold, .003, bookcase);
        }
    plant(-1.24, 2.04, -1.8, .29);
    // A rounded reading chair on a rose oval rug.
    const rug = cylinder(.77, .77, .014, -.39, .338, .01, mat('rose-rug', '#d8b1c1', .95));
    rug.scale.z = .72;
    const rugLine = ring(.70, .009, -.39, .349, .01, cream);
    rugLine.rotation.x = Math.PI / 2;
    rugLine.scale.y = .72;
    box(.64, .18, .57, -.43, .76, -.02, blueInk, .15);
    box(.66, .57, .13, -.43, 1.02, .23, blueInk, .12);
    for (const x of [-.67, -.19])
        for (const z of [-.2, .15])
            bar([x, .66, z], [x + (x < -.4 ? -.03 : .03), .34, z + .02], .025, gold);
    for (const x of [-.79, -.08])
        box(.08, .11, .45, x, .88, -.02, blueInk, .035);
    // The engineering project has its own pedestal on the terrace.
    const bridgeStart = model.children.length;
    cylinder(.57, .62, .09, 2.15, .09, .38, cream);
    cylinder(.39, .43, .68, 2.15, .46, .38, blueInk);
    const pedestalRim = ring(.4, .014, 2.15, .81, .38, gold);
    pedestalRim.rotation.x = Math.PI / 2;
    box(1.16, .065, .57, 2.15, .84, .38, warmOak, .06);
    for (const x of [1.76, 2.15, 2.54]) {
        box(.09, .30, .20, x, 1.03, .38, cream, .017);
        box(.15, .035, .27, x, .885, .38, stone, .01);
    }
    box(1.15, .065, .33, 2.15, 1.21, .38, blue);
    for (const z of [.22, .54]) {
        bar([1.6, 1.34, z], [2.70, 1.34, z], .013, gold);
        for (let i = 0; i < 7; i++)
            bar([1.63 + i * .17, 1.24, z], [1.63 + i * .17, 1.34, z], .009, gold);
    }
    const bridgeMeshes = model.children.slice(bridgeStart);
    const bridgeGroup = new T.Group();
    bridgeGroup.add(...bridgeMeshes);
    bridgeGroup.position.set(.50, 0, -.50);
    bridgeGroup.name = "studio-bim";
    bridgeGroup.userData.studioObject = "bim";
    model.add(bridgeGroup);
    // A small curved garden bench, kept low so it never hides the interior.
    const bench = new T.Group();
    bench.position.set(1.25, .06, 1.77);
    bench.rotation.y = -.2;
    model.add(bench);
    box(1.10, .12, .46, 0, .48, 0, warmOak, .09, bench);
    box(1.04, .30, .075, 0, .72, -.21, cream, .04, bench);
    for (const x of [-.39, .39])
        bar([x, .44, .0], [x, .05, 0], .035, gold, bench);
    box(.31, .065, .24, -.26, .58, .025, pink, .012, bench);
    box(.28, .035, .23, -.25, .63, .02, cream, .008, bench);
    // Clear, generously sized plant leaves.
    plant(2.30, .06, -1.1, .72);
    plant(-2.05, .06, 1.35, .48);
    // Graceful sakura silhouette with distinct blossoms, rather than balloon foliage.
    const aboutStart = model.children.length;
    cylinder(.41, .44, .14, -2.68, .09, -.25, stone);
    tube([[-2.68, .13, -.25], [-2.78, .88, -.27], [-2.54, 1.62, -.23], [-2.66, 2.57, -.28]], .095, warmOak);
    const branches = [
        [[-2.70, 1.18, -.25], [-3.13, 1.71, -.18], [-3.28, 2.31, -.08]],
        [[-2.59, 1.65, -.25], [-2.11, 2.1, -.20], [-1.96, 2.51, -.18]],
        [[-2.70, 1.85, -.26], [-2.75, 2.3, .31], [-2.76, 2.63, .40]],
        [[-2.67, 1.85, -.25], [-2.84, 2.45, -.69], [-2.91, 2.65, -.79]]
    ];
    branches.forEach(points => tube(points, .045, warmOak));
    const leafMats = [mat('petal-rose', '#d88daf', .8), mat('petal-blush', '#edb5d0', .75), mat('petal-soft', '#f2cadd', .75)];
    const crowns = [[-3.31, 2.40, -.12, .40], [-3.02, 2.69, -.22, .40], [-2.61, 2.88, -.23, .43], [-2.17, 2.69, -.22, .37], [-1.97, 2.48, -.12, .32], [-2.77, 2.59, .36, .38], [-3.12, 2.36, .39, .34], [-2.31, 2.48, .29, .35], [-2.93, 2.67, -.69, .37], [-2.45, 2.72, -.64, .35], [-3.44, 2.36, -.48, .27], [-2.65, 2.32, -.1, .34]];
    crowns.forEach(([x, y, z, r], i) => { const crown = mesh(new T.SphereGeometry(r, 14, 10), leafMats[i % 3], [x, y, z]); crown.scale.set(1.15, .75, 1.0); });
    function blossom(x, y, z, r, material) { for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        const petal = ball(r * .56, x + Math.cos(a) * r * .56, y + Math.sin(a) * r * .56, z, material, [.72, 1, .26]);
        petal.rotation.z = a - Math.PI / 2;
    } ball(r * .16, x, y, z + .018, gold, [1, 1, .5]); }
    for (let i = 0; i < 25; i++) {
        const a = i * 2.399;
        const [x, y, z, r] = crowns[i % crowns.length];
        blossom(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .35, z + r * .85, .07 + (i % 2) * .01, i % 3 === 0 ? cream : leafMats[2]);
    }
    for (let i = 0; i < 13; i++) {
        const a = i * 2.4, r = .32 + (i % 4) * .18;
        const petal = ball(.055, -2.68 + Math.cos(a) * r, .075, -.25 + Math.sin(a) * r, pink, [1, .09, .55]);
        petal.rotation.y = a;
    }
    // A restrained lantern under the tree balances the warm pavilion lights.
    cylinder(.14, .17, .05, -2.83, .09, .70, gold);
    bar([-2.83, .10, .70], [-2.83, .55, .70], .018, gold);
    cylinder(.16, .16, .23, -2.83, .66, .70, lightMaterial);
    mesh(new T.ConeGeometry(.20, .12, 32), navy, [-2.83, .83, .70]);
    markSince(aboutStart, "about");
    return model;
}
