import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const binary = await readFile(new URL('../../public/models/moon-bay-studio.glb', import.meta.url));
const jsonLength = binary.readUInt32LE(12);
const model = JSON.parse(binary.subarray(20, 20 + jsonLength).toString('utf8').trim());
test('studio download is a complete GLB 2.0 with a bounded payload', () => {
    assert.equal(binary.toString('ascii', 0, 4), 'glTF');
    assert.equal(binary.readUInt32LE(4), 2);
    assert.equal(binary.readUInt32LE(8), binary.length);
    assert.equal(binary.toString('ascii', 16, 20), 'JSON');
    assert.ok(binary.length < 6 * 1024 * 1024, 'Studio model must stay within its 6 MiB download budget');
    assert.equal(model.asset.version, '2.0');
});
test('export preserves all six pickable objects and their semantic names', () => {
    const objects = model.nodes.filter(node => node.extras?.studioObject);
    assert.deepEqual(objects.map(node => node.extras.studioObject).sort(), ['about', 'ai', 'archive', 'bim', 'contact', 'notes']);
    for (const object of objects) {
        assert.equal(object.name, `studio-${object.extras.studioObject}`);
        assert.ok(object.children?.length, 'Every interactive object must contain geometry');
    }
});
test('exported position ranges are finite and include a three-dimensional scene', () => {
    const positions = model.accessors.filter(accessor => accessor.type === 'VEC3' && accessor.min && accessor.max);
    assert.ok(positions.length > 20);
    for (const accessor of positions) {
        for (let i = 0; i < 3; i++) {
            assert.ok(Number.isFinite(accessor.min[i]) && Number.isFinite(accessor.max[i]));
            assert.ok(accessor.min[i] <= accessor.max[i]);
        }
    }
    assert.ok(model.meshes.length > 30);
});
