import { ACESFilmicToneMapping, Box3, DirectionalLight, Group, HemisphereLight, IcosahedronGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, OrthographicCamera, PCFShadowMap, PlaneGeometry, PMREMGenerator, PointLight, Raycaster, Scene, ShadowMaterial, Vector2, Vector3, WebGLRenderer, } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
interface StudioOptions {
    night: boolean;
    onSelect: (id: string) => void;
    onProgress: (progress: number) => void;
    onUnavailable: () => void;
    onHover?: (id?: string, point?: { x: number; y: number }) => void;
    pageScroll?: boolean;
}
export async function mountStudio(host: HTMLElement, hotspots: HTMLElement, url: string, options: StudioOptions) {
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    renderer.setClearColor(0, 0);
    const scene = new Scene(), root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const canMove = () => !reduced.matches && root.dataset.motion !== 'off';
    const hemi = new HemisphereLight('#e6edff', '#9b8ea3', .8);
    scene.add(hemi);
    const key = new DirectionalLight('#fff4e7', 2.6);
    key.position.set(-3, 10, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 25 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -.00015;
    key.shadow.normalBias = .025;
    scene.add(key);
    const fill = new DirectionalLight('#c8ddff', .85);
    fill.position.set(6, 5, -5);
    scene.add(fill);
    const pmrem = new PMREMGenerator(renderer), environment = new RoomEnvironment();
    const environmentMap = pmrem.fromScene(environment, .04);
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = .55;
    environment.dispose();
    pmrem.dispose();
    let model: Group;
    try {
        model = (await new GLTFLoader().loadAsync(url, event => options.onProgress(event.total ? Math.round(event.loaded / event.total * 100) : 0))).scene;
    }
    catch (error) {
        environmentMap.dispose();
        renderer.dispose();
        throw error;
    }
    const ground = new Mesh(new PlaneGeometry(120, 120), new ShadowMaterial({ opacity: .07 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.64;
    ground.receiveShadow = true;
    scene.add(ground, model);
    const items = new Map<string, Object3D>(), lights: PointLight[] = [], glowing = new Set<MeshStandardMaterial>();
    model.traverse(object => {
        if (object.userData.studioObject)
            items.set(object.userData.studioObject, object);
        if (object instanceof Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            for (const material of [object.material].flat()) {
                if (material instanceof MeshStandardMaterial && material.emissive.getHex() !== 0)
                    glowing.add(material);
            }
        }
        if (object instanceof PointLight)
            lights.push(object);
    });
    const camera = new OrthographicCamera(-5, 5, 5, -5, .1, 100);
    camera.position.set(9.4, 8, 12.5);
    const homeTarget = new Vector3(0, 1.3, 0);
    camera.lookAt(homeTarget);
    model.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    // Fit the actual geometry rather than an oversized axis-aligned world box.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const point = new Vector3();
    model.traverse(object => {
        if (!(object instanceof Mesh))
            return;
        const positions = object.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
    });
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const offset = right.multiplyScalar((minX + maxX) / 2).add(up.multiplyScalar((minY + maxY) / 2));
    camera.position.add(offset);
    homeTarget.add(offset);
    camera.lookAt(homeTarget);
    const homePosition = camera.position.clone(), controls = new OrbitControls(camera, canvas);
    controls.target.copy(homeTarget);
    controls.enablePan = false;
    controls.enableDamping = canMove();
    controls.dampingFactor = .09;
    controls.rotateSpeed = .6;
    controls.zoomSpeed = .65;
    controls.minZoom = .8;
    controls.maxZoom = 1.8;
    controls.minPolarAngle = .72;
    controls.maxPolarAngle = 1.29;
    controls.minAzimuthAngle = -.1;
    controls.maxAzimuthAngle = 1.3;
    controls.update();
    if (options.pageScroll)
        canvas.style.touchAction = 'pan-y';
    // OrbitControls keeps pinch zoom; ordinary wheel input continues scrolling the page.
    const pageWheel = (event: WheelEvent) => {
        if (options.pageScroll && !event.ctrlKey && !event.metaKey)
            event.stopImmediatePropagation();
    };
    canvas.addEventListener('wheel', pageWheel, { capture: true, passive: true });
    const raycaster = new Raycaster(), pointer = new Vector2(), pickable: Mesh[] = [];
    model.traverse(object => {
        if (object instanceof Mesh)
            pickable.push(object);
    });
    const markers = [...hotspots.querySelectorAll<HTMLElement>('[data-studio-hotspot]')].map(button => {
        const object = items.get(button.dataset.studioHotspot!);
        if (!object)
            return undefined;
        const box = new Box3().setFromObject(object), center = box.getCenter(new Vector3());
        center.y = box.max.y + .11;
        return { button, point: center };
    }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const fallingMaterial = new MeshStandardMaterial({ color: '#e8b4cf', roughness: .8, side: 2 });
    const fallingGeometry = new IcosahedronGeometry(.037, 1), petals = new InstancedMesh(fallingGeometry, fallingMaterial, 16);
    petals.frustumCulled = false;
    scene.add(petals);
    const petalPose = new Object3D();
    let frame = 0, disposed = false, visible = true, lastPaint = 0, night = options.night;
    let hovering: string | undefined;
    let entryDone = false;
    const bases = new Map<string, number>();
    items.forEach((item, id) => bases.set(id, item.position.y));
    let flight: {
        start: number;
        from: Vector3;
        to: Vector3;
        fromPosition: Vector3;
        toPosition: Vector3;
        fromZoom: number;
        toZoom: number;
    } | undefined;
    function positionMarkers() {
        const placed: Array<{
            x: number;
            y: number;
        }> = [];
        for (const marker of markers) {
            point.copy(marker.point).project(camera);
            let x = (point.x * .5 + .5) * host.clientWidth, y = (-point.y * .5 + .5) * host.clientHeight;
            marker.button.hidden = point.z > 1 || point.z < -1 || x < 25 || x > host.clientWidth - 25 || y < 55 || y > host.clientHeight - 45;
            if (marker.button.hidden)
                continue;
            for (let attempt = 0; attempt < 5 && placed.some(p => Math.hypot(p.x - x, p.y - y) < 38); attempt++)
                y -= 38;
            placed.push({ x, y });
            marker.button.style.transform = `translate(${x}px,${y}px)`;
        }
    }
    function request() {
        if (!frame && !disposed && visible && !document.hidden)
            frame = requestAnimationFrame(draw);
    }
    function finishFlight() {
        if (!flight)
            return;
        controls.target.copy(flight.to);
        camera.position.copy(flight.toPosition);
        camera.zoom = flight.toZoom;
        camera.updateProjectionMatrix();
        flight = undefined;
    }
    function draw(time: number) {
        frame = 0;
        if (disposed || !visible || document.hidden)
            return;
        if (canMove() && time - lastPaint < 30) {
            request();
            return;
        }
        lastPaint = time;
        if (flight) {
            const fraction = Math.min(1, (time - flight.start) / 650), eased = fraction * fraction * (3 - 2 * fraction);
            controls.target.lerpVectors(flight.from, flight.to, eased);
            camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased);
            camera.zoom = flight.fromZoom + (flight.toZoom - flight.fromZoom) * eased;
            camera.updateProjectionMatrix();
            if (fraction === 1)
                flight = undefined;
        }
        items.forEach((item, id) => { const base = bases.get(id)!; const desired = base + (hovering === id ? .026 : 0); item.position.y = canMove() ? item.position.y + (desired - item.position.y) * .16 : base; });
        petals.visible = canMove();
        if (petals.visible) {
            const seconds = time / 1000;
            for (let i = 0; i < 16; i++) {
                const phase = (seconds * .13 + i * .173) % 1;
                petalPose.position.set(-2.65 + Math.sin(i * 2.4 + seconds * .25) * .55 + phase * .35, 2.65 - phase * 2.5, -.14 + Math.cos(i * 3.1) * .5 + phase * .45);
                petalPose.rotation.set(i + seconds * .25, seconds * .3 + i, i * .4);
                petalPose.scale.set(1, .22, .7);
                petalPose.updateMatrix();
                petals.setMatrixAt(i, petalPose.matrix);
            }
            petals.instanceMatrix.needsUpdate = true;
        }
        controls.update();
        renderer.render(scene, camera);
        positionMarkers();
        if (canMove() || flight)
            request();
    }
    function resize() {
        if (disposed)
            return;
        const width = host.clientWidth, height = host.clientHeight;
        if (!width || !height)
            return;
        const ratio = width / height, half = Math.max(maxY - minY, (maxX - minX) / ratio) * .59;
        camera.left = -half * ratio;
        camera.right = half * ratio;
        camera.top = half;
        camera.bottom = -half;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        request();
    }
    function moveTo(target: Vector3, zoom: number) {
        const delta = target.clone().sub(controls.target);
        flight = { start: performance.now(), from: controls.target.clone(), to: target, fromPosition: camera.position.clone(), toPosition: camera.position.clone().add(delta), fromZoom: camera.zoom, toZoom: zoom };
        if (!canMove())
            finishFlight();
        request();
    }
    function select(id: string) {
        const item = items.get(id);
        if (!item)
            return;
        const center = new Box3().setFromObject(item).getCenter(new Vector3());
        moveTo(homeTarget.clone().lerp(center, .5), host.clientWidth < 640 ? 1.14 : 1.3);
    }
    function reset() {
        entryDone = true;
        flight = { start: performance.now(), from: controls.target.clone(), to: homeTarget.clone(), fromPosition: camera.position.clone(), toPosition: homePosition.clone(), fromZoom: camera.zoom, toZoom: 1 };
        if (!canMove())
            finishFlight();
        request();
    }
    function setEntryProgress(progress: number) {
        if (entryDone)
            return;
        const value = canMove() ? Math.max(0, Math.min(1, progress)) : 1;
        const eased = value * value * (3 - 2 * value);
        camera.zoom = .86 + .14 * eased;
        camera.updateProjectionMatrix();
        if (value >= 1)
            entryDone = true;
        request();
    }
    function setNight(value: boolean) {
        night = value;
        hemi.intensity = night ? .38 : .8;
        key.intensity = night ? .85 : 2.6;
        key.color.set(night ? '#bccff4' : '#fff4e7');
        fill.intensity = night ? .35 : .85;
        scene.environmentIntensity = night ? .28 : .55;
        renderer.toneMappingExposure = night ? 1.08 : .92;
        for (const light of lights)
            light.intensity = night ? 2.8 : 1.5;
        for (const material of glowing)
            material.emissiveIntensity = night ? 1.5 : .55;
        ground.material.opacity = night ? .15 : .07;
        fallingMaterial.color.set(night ? '#f3c4dd' : '#e8b4cf');
        request();
    }
    function picked(event: PointerEvent) {
        const bounds = canvas.getBoundingClientRect();
        pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        for (const hit of raycaster.intersectObjects(pickable, false)) {
            for (let object: Object3D | null = hit.object; object; object = object.parent) {
                if (object.userData.studioObject)
                    return String(object.userData.studioObject);
            }
            return undefined;
        }
        return undefined;
    }
    let pressed: {
        x: number;
        y: number;
    } | undefined;
    const activePointers = new Set<number>();
    let multiplePointers = false;
    const down = (event: PointerEvent) => {
        activePointers.add(event.pointerId);
        if (activePointers.size === 1) {
            pressed = { x: event.clientX, y: event.clientY };
            multiplePointers = false;
        }
        else
            multiplePointers = true;
    };
    const choose = (event: PointerEvent) => {
        const isClick = pressed && !multiplePointers && activePointers.size === 1 && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 5;
        activePointers.delete(event.pointerId);
        if (isClick && (event.pointerType === 'touch' || !matchMedia('(any-hover: hover) and (any-pointer: fine)').matches)) {
            const id = picked(event);
            if (id)
                options.onSelect(id);
        }
        if (!activePointers.size) {
            pressed = undefined;
            multiplePointers = false;
        }
    };
    const hover = (event: PointerEvent) => {
        if (event.pointerType === 'touch' || pressed)
            return;
        const id = picked(event);
        if (id !== hovering)
            options.onHover?.(id, { x: event.clientX, y: event.clientY });
        hovering = id;
        canvas.style.cursor = hovering ? 'pointer' : 'grab';
        request();
    };
    const leave = () => { hovering = undefined; options.onHover?.(); pressed = undefined; activePointers.clear(); multiplePointers = false; canvas.style.cursor = 'grab'; request(); };
    const cancelFlight = () => { entryDone = true; flight = undefined; hovering = undefined; options.onHover?.(); };
    const syncMotion = () => {
        controls.enableDamping = canMove();
        if (!canMove())
            finishFlight();
        request();
    };
    const visibility = () => {
        if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
        else
            request();
    };
    const contextLost = (event: Event) => { event.preventDefault(); options.onUnavailable(); };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible)
            request();
        else {
            cancelAnimationFrame(frame);
            frame = 0;
        }
    }, { threshold: .01 });
    observer.observe(host);
    const preferenceObserver = new MutationObserver(syncMotion);
    preferenceObserver.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    reduced.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', visibility);
    controls.addEventListener('change', request);
    controls.addEventListener('start', cancelFlight);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', choose);
    canvas.addEventListener('pointercancel', leave);
    canvas.addEventListener('pointermove', hover);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', contextLost);
    host.replaceChildren(canvas);
    setNight(night);
    resize();
    function dispose() {
        if (disposed)
            return;
        disposed = true;
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        observer.disconnect();
        preferenceObserver.disconnect();
        reduced.removeEventListener('change', syncMotion);
        document.removeEventListener('visibilitychange', visibility);
        controls.dispose();
        canvas.removeEventListener('wheel', pageWheel, true);
        canvas.removeEventListener('webglcontextlost', contextLost);
        const geometries = new Set<Mesh['geometry']>(), materials = new Set<MeshStandardMaterial>();
        scene.traverse(object => {
            if (!(object instanceof Mesh))
                return;
            geometries.add(object.geometry);
            for (const material of [object.material].flat())
                materials.add(material);
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        environmentMap.dispose();
        renderer.dispose();
        host.replaceChildren();
    }
    return { select, reset, setEntryProgress, setNight, dispose };
}
