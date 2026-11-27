import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const output = path.resolve(process.argv[2] || 'dist');
const modelDir = path.join(output, 'companions/whale-girl');
const source = JSON.parse(await readFile(path.join(modelDir, 'SOURCE.json'), 'utf8'));
assert.equal(source.repository, 'https://github.com/Andersen216/dsh-whale-girl-live2d');
assert.match(source.commit, /^[0-9a-f]{40}$/);
assert.equal(source.modelLicense, 'CC BY-NC-SA 4.0');

const manifest = JSON.parse(await readFile(path.join(modelDir, 'FILES.sha256.json'), 'utf8'));
for (const file of manifest) {
 const fullPath = path.resolve(output, file.file);
 assert.ok(fullPath.startsWith(`${output}${path.sep}`), 'Companion resource must remain inside the build');
 const bytes = await readFile(fullPath);
 assert.equal(bytes.length, file.bytes, `Changed size: ${file.file}`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `Changed resource: ${file.file}`);
}

const model = JSON.parse(await readFile(path.join(modelDir, 'c_0120.model3.json'), 'utf8'));
const refs = model.FileReferences;
assert.equal(model.Version, 3);
const resources = [refs.Moc, refs.Physics, refs.DisplayInfo, ...refs.Textures,
 ...Object.values(refs.Motions).flatMap(motions => motions.map(motion => motion.File))];
for (const resource of resources) assert.ok((await stat(path.join(modelDir,resource))).size > 0, `Missing model reference: ${resource}`);
assert.equal((await readFile(path.join(modelDir,refs.Moc))).subarray(0,4).toString(), 'MOC3');
for (const texture of refs.Textures) assert.deepEqual((await readFile(path.join(modelDir,texture))).subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));

const home = await readFile(path.join(output,'index.html'),'utf8');
const canonical = home.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
assert.ok(canonical);
const base = new URL(canonical).pathname.replace(/\/$/,'');
assert.match(home,/data-live2d-host/);
assert.match(home,/data-live2d-retry/);
assert.match(home,/data-companion-bubble-action/);
for (const action of ['wave','shy','stars','wink','selfie','bubble','splash','reset']) assert.ok(home.includes(`data-companion-action="${action}"`),`Missing companion interaction: ${action}`);
assert.match(home,/<button\b[^>]*data-avatar-greet[^>]*aria-label="驾车前往月湾樱花书屋/);
assert.doesNotMatch(home,/class="avatar-drive"|data-moon-drive/,'Driving must be triggered from the model rather than a separate text button');
assert.ok(home.includes(`${base}/credits/whale-girl/`),'The model credits link must follow the deployment base');
assert.doesNotMatch(home,/class="xi-head"/,'The replaced vector character must not remain behind the real model');
const credits = await readFile(path.join(output,'credits/whale-girl/index.html'),'utf8');
for (const author of ['上善无形','ZipZipPipe','氵六青','Andersen216']) assert.ok(credits.includes(author),`Missing author: ${author}`);
assert.ok(credits.includes('CC BY-NC-SA 4.0'));
console.log(`Verified pinned Live2D resources: ${manifest.length} files, complete Cubism references, model signature, retry UI and four author credits.`);
