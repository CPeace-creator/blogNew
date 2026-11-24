import test from 'node:test';
import assert from 'node:assert/strict';
import { fittedSize, clampView, gestureView } from '../../src/lib/gallery-geometry.ts';

const frame = { width: 800, height: 600 };
const image = { width: 800, height: 600 };
test('fit preserves aspect ratio for wide and tall screenshots without enlarging small images', () => {
  assert.deepEqual(fittedSize({ width: 1600, height: 900 }, frame), { width: 800, height: 450 });
  assert.deepEqual(fittedSize({ width: 600, height: 1800 }, frame), { width: 200, height: 600 });
  assert.deepEqual(fittedSize({ width: 200, height: 100 }, frame), { width: 200, height: 100 });
});
test('drag stops at the image edge and fit view cannot be dragged off screen', () => {
  assert.deepEqual(clampView({ scale: 2, x: 9999, y: -9999 }, frame, image), { scale: 2, x: 400, y: -300 });
  assert.deepEqual(clampView({ scale: 1, x: 500, y: 200 }, frame, image), { scale: 1, x: 0, y: 0 });
});
test('zoom keeps the point under the cursor stable', () => {
  const anchor = { x: 100, y: 50 };
  const next = gestureView({ scale: 1, x: 0, y: 0 }, 2, anchor, anchor, frame, image);
  assert.equal((anchor.x - next.x) / next.scale, 100);
  assert.equal((anchor.y - next.y) / next.scale, 50);
});
test('pinch follows its moving midpoint while preserving the grabbed point', () => {
  const from = { x: 30, y: -10 }, to = { x: 90, y: 40 };
  const next = gestureView({ scale: 2, x: 10, y: 10 }, 3, from, to, frame, image);
  assert.equal((to.x - next.x) / next.scale, (from.x - 10) / 2);
  assert.equal((to.y - next.y) / next.scale, (from.y - 10) / 2);
});
test('zoom limits and return to fit recover a centered image', () => {
  const atLimit = gestureView({ scale: 4, x: 100, y: 80 }, 20, { x: 0, y: 0 }, { x: 0, y: 0 }, frame, image);
  assert.equal(atLimit.scale, 5);
  assert.deepEqual(gestureView(atLimit, .2, { x: 0, y: 0 }, { x: 0, y: 0 }, frame, image), { scale: 1, x: 0, y: 0 });
});
