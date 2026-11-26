import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createGClassModel } from '../src/lib/avatar/g-class.js';

globalThis.FileReader ??= class {
  result = null;
  onloadend = null;
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(result => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;
      this.onloadend?.();
    });
  }
};

const { root, animations } = createGClassModel();
const binary = await new GLTFExporter().parseAsync(root, { binary: true, animations });
await mkdir('public/models', { recursive: true });
await writeFile('public/models/mercedes-g-class.glb', Buffer.from(binary));
console.log(`Saved public/models/mercedes-g-class.glb (${(binary.byteLength / 1024).toFixed(1)} KiB), animations: ${animations.map(clip => clip.name).join(', ')}.`);
