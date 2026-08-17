import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  FogExp2,
  Group,
  InstancedMesh,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';

type Petal = {
  x: number;
  y: number;
  z: number;
  drift: number;
  fall: number;
  spin: number;
  phase: number;
  scale: number;
};

const root = document.documentElement;
const container = document.querySelector<HTMLElement>('[data-hero-scene]');
const canvas = container?.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
const hero = container?.closest<HTMLElement>('.home-hero');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

if (container && canvas && hero && !reduceMotion && !saveData) {
  try {
    const compact = matchMedia('(max-width: 720px)').matches;
    const scene = new Scene();
    scene.fog = new FogExp2(0x13202b, 0.035);

    const camera = new PerspectiveCamera(44, 1, 0.1, 60);
    camera.position.set(0, 0.1, 8.6);

    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !compact, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1 : 1.5));

    const world = new Group();
    scene.add(world);

    const petalTextureCanvas = document.createElement('canvas');
    petalTextureCanvas.width = 96;
    petalTextureCanvas.height = 96;
    const context = petalTextureCanvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    const petalGradient = context.createRadialGradient(32, 30, 4, 48, 48, 48);
    petalGradient.addColorStop(0, '#fff7fb');
    petalGradient.addColorStop(0.42, '#ffc6d8');
    petalGradient.addColorStop(1, 'rgba(230, 91, 139, 0)');
    context.fillStyle = petalGradient;
    context.beginPath();
    context.moveTo(48, 8);
    context.bezierCurveTo(88, 22, 80, 64, 48, 88);
    context.bezierCurveTo(16, 64, 8, 22, 48, 8);
    context.fill();
    const petalTexture = new CanvasTexture(petalTextureCanvas);
    petalTexture.colorSpace = SRGBColorSpace;
    petalTexture.minFilter = LinearFilter;

    const petalCount = compact ? 30 : 58;
    const petalGeometry = new PlaneGeometry(0.34, 0.5);
    const petalMaterial = new MeshBasicMaterial({
      map: petalTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: DoubleSide,
    });
    const petalMesh = new InstancedMesh(petalGeometry, petalMaterial, petalCount);
    petalMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    petalMesh.renderOrder = 4;
    world.add(petalMesh);

    const petals: Petal[] = Array.from({ length: petalCount }, () => ({
      x: (Math.random() - 0.5) * 15,
      y: Math.random() * 10 - 3,
      z: Math.random() * 9 - 3.8,
      drift: 0.12 + Math.random() * 0.3,
      fall: 0.34 + Math.random() * 0.54,
      spin: (Math.random() - 0.5) * 1.8,
      phase: Math.random() * Math.PI * 2,
      scale: 0.55 + Math.random() * 1.25,
    }));
    const dummy = new Object3D();

    const pointCount = compact ? 42 : 82;
    const pointPositions: number[] = [];
    const pointColors: number[] = [];
    const warm = new Color('#ffd6df');
    const cool = new Color('#8de1ff');
    for (let index = 0; index < pointCount; index += 1) {
      pointPositions.push((Math.random() - 0.5) * 16, Math.random() * 8 - 3.5, Math.random() * 8 - 5);
      const color = Math.random() > 0.46 ? warm : cool;
      pointColors.push(color.r, color.g, color.b);
    }
    const pointGeometry = new BufferGeometry();
    pointGeometry.setAttribute('position', new Float32BufferAttribute(pointPositions, 3));
    pointGeometry.setAttribute('color', new Float32BufferAttribute(pointColors, 3));
    const pointMaterial = new PointsMaterial({
      size: compact ? 0.07 : 0.09,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const lightPoints = new Points(pointGeometry, pointMaterial);
    world.add(lightPoints);

    const waterGeometry = new PlaneGeometry(22, 8, 48, 18);
    const waterMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new Color('#f58cb0') },
      },
      vertexShader: `
        uniform float uTime;
        varying float vWave;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 transformed = position;
          float wave = sin(position.x * 1.9 + uTime * 0.75) * 0.1;
          wave += cos(position.y * 2.8 - uTime * 0.55) * 0.055;
          transformed.z += wave;
          vWave = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uAccent;
        varying float vWave;
        varying vec2 vUv;
        void main() {
          float sweep = smoothstep(0.78, 1.0, sin((vUv.x * 12.0) + (vUv.y * 6.0) - uTime) * 0.5 + 0.5);
          float edge = smoothstep(0.05, 0.42, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
          vec3 color = mix(vec3(0.20, 0.58, 0.72), uAccent, sweep * 0.7);
          float alpha = (0.035 + sweep * 0.11 + abs(vWave) * 0.2) * edge;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    const water = new Mesh(waterGeometry, waterMaterial);
    water.position.set(0, -3.15, -1.5);
    water.rotation.x = -1.08;
    world.add(water);

    const pointer = new Vector2();
    const target = new Vector2();
    let burst = 0;
    let elapsed = 0;
    let previous = performance.now();
    let visible = true;
    let enabled = root.dataset.petals !== 'off';

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      camera.aspect = rect.width / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
    };

    const updatePetals = (delta: number) => {
      petals.forEach((petal, index) => {
        petal.y -= petal.fall * delta * (1 + burst * 0.9);
        petal.x += (Math.sin(elapsed * 0.55 + petal.phase) * petal.drift + burst * 0.5) * delta;
        petal.z += Math.cos(elapsed * 0.42 + petal.phase) * 0.065 * delta;
        if (petal.y < -5.2 || petal.x > 8.5) {
          petal.y = 5.4 + Math.random() * 2;
          petal.x = -7.5 + Math.random() * 13;
          petal.z = Math.random() * 9 - 3.8;
        }
        dummy.position.set(petal.x, petal.y, petal.z);
        dummy.rotation.set(
          Math.sin(elapsed + petal.phase) * 0.9,
          elapsed * petal.spin + petal.phase,
          Math.cos(elapsed * 0.7 + petal.phase) * 0.8,
        );
        const depthScale = 0.74 + (petal.z + 4) * 0.045;
        dummy.scale.setScalar(petal.scale * depthScale);
        dummy.updateMatrix();
        petalMesh.setMatrixAt(index, dummy.matrix);
      });
      petalMesh.instanceMatrix.needsUpdate = true;
    };

    const animate = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.04);
      previous = now;
      elapsed += delta;
      pointer.lerp(target, 0.035);
      camera.position.x = pointer.x * 0.42;
      camera.position.y = 0.1 + pointer.y * 0.26;
      camera.lookAt(pointer.x * 0.1, pointer.y * 0.06, 0);
      world.rotation.y = pointer.x * 0.035;
      lightPoints.rotation.y = elapsed * 0.018;
      lightPoints.position.x = Math.sin(elapsed * 0.11) * 0.2;
      waterMaterial.uniforms.uTime.value = elapsed;
      burst = Math.max(0, burst - delta * 0.7);
      updatePetals(delta);
      renderer.render(scene, camera);
    };

    const syncLoop = () => {
      if (enabled && visible && !document.hidden) {
        previous = performance.now();
        renderer.setAnimationLoop(animate);
      } else {
        renderer.setAnimationLoop(null);
      }
    };

    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      target.set(((event.clientX - rect.left) / rect.width - 0.5) * 2, -((event.clientY - rect.top) / rect.height - 0.5) * 2);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => target.set(0, 0));
    hero.addEventListener('pointerdown', () => { burst = 1; }, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncLoop();
    }, { threshold: 0.02 });
    observer.observe(hero);

    const motionObserver = new MutationObserver(() => {
      enabled = root.dataset.petals !== 'off';
      syncLoop();
    });
    motionObserver.observe(root, { attributes: true, attributeFilter: ['data-petals'] });
    document.addEventListener('visibilitychange', syncLoop);
    addEventListener('resize', resize, { passive: true });

    resize();
    updatePetals(0);
    renderer.render(scene, camera);
    root.dataset.hero3d = 'ready';
    container.dataset.ready = '';
    syncLoop();
  } catch {
    root.dataset.hero3d = 'fallback';
  }
} else if (container) {
  root.dataset.hero3d = 'fallback';
}
