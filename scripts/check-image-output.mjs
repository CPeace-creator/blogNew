import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('dist');
const home = await readFile(path.join(output, 'index.html'), 'utf8');
const canonical = home.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
assert.ok(canonical, 'The built home page must have a canonical URL');
const base = new URL(canonical).pathname.replace(/\/$/, '');
const files = await readdir(output, { recursive: true });
const pages = files.filter((file) => file.endsWith('.html'));
const attribute = (html, name) => html.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
const assets = new Map();
let imageCount = 0;
let bodyImages = 0;

async function verifyAsset(url) {
  assert.ok(url.startsWith(`${base}/_astro/`), `Image bypasses Astro optimization or has the wrong base: ${url}`);
  assert.ok(url.endsWith('.webp'), `Expected an optimized WebP: ${url}`);
  const relative = decodeURIComponent(url.slice(base.length)).replace(/^\//, '');
  const size = (await stat(path.join(output, relative))).size;
  assert.ok(size > 0, `Empty image: ${url}`);
  assets.set(url, size);
}

for (const page of pages) {
  const html = await readFile(path.join(output, page), 'utf8');
  assert.ok(!html.includes('__ASTRO_IMAGE_'), `Unresolved Markdown image in ${page}`);
  for (const [, image] of html.matchAll(/<img\b([^>]*)>/g)) {
    imageCount++;
    for (const name of ['width', 'height']) {
      assert.ok(Number(attribute(image, name)) > 0, `Missing intrinsic ${name} in ${page}`);
    }
    assert.ok(['lazy', 'eager'].includes(attribute(image, 'loading')), `Missing loading policy in ${page}`);
    assert.equal(attribute(image, 'decoding'), 'async', `Image decode blocks rendering in ${page}`);
    await verifyAsset(attribute(image, 'src') ?? '');
    const srcset = attribute(image, 'srcset');
    assert.ok(srcset, `Missing responsive variants in ${page}`);
    assert.ok(attribute(image, 'sizes'), `Missing responsive sizes in ${page}`);
    for (const candidate of srcset.split(',')) await verifyAsset(candidate.trim().split(/\s+/)[0]);
  }
  if (page.startsWith(`posts${path.sep}`)) {
    bodyImages += [...html.matchAll(/<img\b[^>]*data-astro-image="constrained"/g)].length;
  }
}

assert.ok(bodyImages > 0, 'The migrated article screenshots must be optimized, too');
const homeImages = [...home.matchAll(/<img\b([^>]*)>/g)].map(([, image]) => image);
const hero = homeImages.find((image) => attribute(image, 'fetchpriority') === 'high');
assert.ok(hero, 'The LCP hero image must have high fetch priority');
assert.equal(attribute(hero, 'loading'), 'eager', 'The LCP hero must not be lazy loaded');
const covers = homeImages.filter((image) => attribute(image, 'sizes')?.includes('326px'));
const cardCount = [...home.matchAll(/<article\b[^>]*\bdata-post-card(?:\s|>|=)/g)].length;
assert.equal(covers.length, cardCount, 'Every homepage cover must use responsive thumbnails');
const homeSources = new Set(homeImages.map((image) => attribute(image, 'src')));
const homeBytes = [...homeSources].reduce((sum, source) => sum + assets.get(source), 0);
console.log(`Verified ${pages.length} static pages, ${imageCount} image elements, ${bodyImages} article screenshots, ${assets.size} optimized files; base=${base || '/'}`);
console.log(`Homepage fallback image URLs total ${(homeBytes / 1024).toFixed(1)} KiB (actual selection depends on viewport/DPR).`);
console.log(`Largest generated image: ${(Math.max(...assets.values()) / 1024).toFixed(1)} KiB.`);
