import test from 'node:test';
import assert from 'node:assert/strict';
import { initialWindow, moveWindow, resizeWindow, scaleWindow, fitWindow, expandedWindow } from '../../src/lib/drawer-geometry.ts';

const desktop = { width: 1280, height: 850 };
function contained(rect, viewport) {
  assert.ok(rect.x >= 0 && rect.y >= 0);
  assert.ok(rect.width > 0 && rect.height > 0);
  assert.ok(rect.x + rect.width <= viewport.width + .001);
  assert.ok(rect.y + rect.height <= viewport.height + .001);
}
test('dragging a reading window keeps its title and close control inside the viewport', () => {
  const start = initialWindow(desktop);
  for (const [x, y] of [[-9999, -9999], [9999, 9999], [200, -50]]) contained(moveWindow(start, x, y, desktop), desktop);
});
test('resizing preserves the top-left anchor and has a readable minimum', () => {
  const start = initialWindow(desktop);
  const large = resizeWindow(start, 9999, 9999, desktop);
  assert.equal(large.x, start.x); assert.equal(large.y, start.y); contained(large, desktop);
  const small = resizeWindow(start, -9999, -9999, desktop);
  assert.equal(small.width, 380); assert.equal(small.height, 280);
});
test('scaling remains centered until constrained and cannot move controls off screen', () => {
  const start = { x: 200, y: 150, width: 400, height: 300 };
  const next = scaleWindow(start, 1.12, desktop);
  assert.equal(next.x + next.width / 2, start.x + start.width / 2);
  assert.equal(next.y + next.height / 2, start.y + start.height / 2);
  contained(scaleWindow(next, 99, desktop), desktop);
});
test('a phone drawer keeps its full width and bottom edge while its header changes height', () => {
  const viewport = { width: 390, height: 844 }, start = initialWindow(viewport);
  const next = moveWindow(start, 999, 160, viewport);
  assert.equal(next.x, 8); assert.equal(next.width, 374);
  assert.equal(next.y + next.height, 836);
  assert.equal(next.height, start.height - 160);
  contained(moveWindow(start, 0, -9999, viewport), viewport);
});
test('restoring a desktop window on a smaller display always recovers visible controls', () => {
  for (const viewport of [{ width: 760, height: 400 }, { width: 320, height: 568 }, { width: 240, height: 180 }]) {
    contained(fitWindow({ x: 1200, y: 700, width: 900, height: 800 }, viewport), viewport);
    contained(expandedWindow(viewport), viewport);
  }
});
