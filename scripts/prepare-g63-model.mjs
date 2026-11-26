import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('public/models/mercedes-g63-amg.glb');
const source = path.resolve(process.argv[2] || output);
const uid = 'fa70ea228e5749c2b4951a895385b055';
const sourceUrl = `https://sketchfab.com/3d-models/mercedes-benz-g-class-g63-amg-${uid}`;
const originalSha256 = '4fec52ebf5c009cdf8a867bb5d8bb24dbb8a4464223f9d6a40312ba8231034d7';
const original = await readFile(source);

function documentOf(binary) {
  assert.equal(binary.toString('ascii', 0, 4), 'glTF');
  assert.equal(binary.readUInt32LE(4), 2);
  assert.equal(binary.readUInt32LE(8), binary.length);
  assert.equal(binary.toString('ascii', 16, 20), 'JSON');
  return JSON.parse(binary.subarray(20, 20 + binary.readUInt32LE(12)).toString('utf8').trim());
}

const sourceDocument = documentOf(original);
assert.ok(sourceDocument.asset.extras?.source?.endsWith(uid), 'Expected the licensed pranav27 G63 model');
assert.ok(sourceDocument.asset.extras?.license?.startsWith('CC-BY-4.0'), 'The original license must be preserved');
const sourceSha256 = createHash('sha256').update(original).digest('hex');
assert.equal(sourceSha256, originalSha256, 'Use the unmodified author download, not the previous compressed model');
await mkdir(path.dirname(output), { recursive: true });
// Publish the exact author download, including its original metadata and buffers.
await writeFile(output, original);

await writeFile('public/models/mercedes-g63-amg.LICENSE.txt', [
  'Mercedes-Benz G-Class G63 AMG',
  'Author: pranav27 (https://sketchfab.com/pranav27)',
  `Source: ${sourceUrl}`,
  'License: Creative Commons Attribution 4.0 International (CC BY 4.0)',
  'License link: https://creativecommons.org/licenses/by/4.0/',
  '',
  'This model is not an original model made by this website.',
  'The original creator credit and license are retained in the GLB asset metadata.',
  'Preparation: byte-for-byte copy of the original author GLB; no compression, quantization or mesh simplification.',
  'All 54 meshes, 187887 triangles and 17 materials are retained. The original contains no image textures.',
  'Display changes: size/grounding normalization and studio lighting. Original body, window, wheel and rubber materials are preserved.',
  'The interactive light switch uses cloned lamp materials for dark lenses/emission and adds lamp-aligned LED rings and soft glare. These are runtime display effects; the downloadable GLB is unchanged.',
  'The source has no animation tracks. This website provides rotation, view reset and a material-based light toggle.',
  '',
  `Original GLB bytes: ${original.length}`,
  `Original GLB SHA-256: ${sourceSha256}`,
  `Published GLB bytes: ${original.length}`,
  '',
].join('\n'));
console.log(`Published original licensed G63 unchanged: ${original.length.toLocaleString('en-US')} bytes (${(original.length / 1e6).toFixed(2)} MB).`);
