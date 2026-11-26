import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createMoonBayStudio } from '../src/lib/studio/moon-bay-model.js';
// The exporter uses FileReader for Blob buffers; Node provides Blob, but no FileReader.
globalThis.FileReader ??= class {
    result = null;
    onloadend = null;
    readAsArrayBuffer(blob) {
        blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
    }
    readAsDataURL(blob) {
        blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); });
    }
};
const model = createMoonBayStudio();
const binary = await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true });
await mkdir('public/models', { recursive: true });
const path = 'public/models/moon-bay-studio.glb';
await writeFile(path, Buffer.from(binary));
console.log(`Saved ${path} (${(binary.byteLength / 1024).toFixed(1)} KiB)`);
