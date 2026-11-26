import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(process.argv[2] || 'dist');
const home = await readFile(path.join(output, 'index.html'), 'utf8');
const canonical = home.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
assert.ok(canonical);
const base = new URL(canonical).pathname.replace(/\/$/, '');
const attribute = (tag, name) => tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
const files = await readdir(output, { recursive: true });
let players = 0, embeds = 0;

async function localAsset(source, page) {
  if (!source || source.startsWith('https://')) return;
  const url = new URL(source, canonical);
  assert.ok(url.pathname.startsWith(`${base}/`), `${page}: media has the wrong deployment prefix`);
  const relative = decodeURIComponent(url.pathname.slice(base.length)).replace(/^\/+/, '');
  const target = path.resolve(output, relative);
  assert.ok(target.startsWith(`${output}${path.sep}`), `${page}: media must remain inside the output directory`);
  assert.ok((await stat(target)).size > 0, `${page}: media asset is missing or empty`);
}

for (const page of files.filter(file => file.endsWith('.html'))) {
  const html = await readFile(path.join(output, page), 'utf8');
  if (!html.includes('data-article-video')) continue;
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
  for (const [, tag, body] of html.matchAll(/<section\b([^>]*\bdata-article-video\b[^>]*)>([\s\S]*?)<\/section>/g)) {
    const headingId = attribute(tag, 'aria-labelledby');
    assert.ok(headingId, `${page}: video section needs an accessible heading`);
    assert.equal(ids.filter(id => id === headingId).length, 1, `${page}: video heading IDs must be unique`);
    const headings = [...body.matchAll(/<h2\b([^>]*)>/g)].map(([, heading]) => attribute(heading, 'id'));
    assert.ok(headings.includes(headingId), `${page}: video section must reference its own heading`);
    assert.ok(html.includes(`href="#${headingId}"`), `${page}: video heading is missing from the article outline`);
  }
  for (const [, tag, body] of html.matchAll(/<video\b([^>]*data-article-video-player[^>]*)>([\s\S]*?)<\/video>/g)) {
    players++;
    assert.match(tag, /\bcontrols\b/);
    assert.match(tag, /\bplaysinline\b/);
    assert.equal(attribute(tag, 'preload'), 'none');
    assert.doesNotMatch(tag, /\bautoplay\b/);
    await localAsset(attribute(tag, 'poster'), page);
    for (const [, source] of body.matchAll(/<(?:source|track)\b[^>]*\bsrc="([^"]+)"/g)) await localAsset(source.replaceAll('&amp;', '&'), page);
  }
  for (const [, source] of html.matchAll(/data-video-embed-url="([^"]+)"/g)) {
    embeds++;
    const url = new URL(source.replaceAll('&amp;', '&'));
    assert.equal(url.protocol, 'https:');
    assert.ok(['player.bilibili.com', 'www.youtube.com'].includes(url.hostname), 'Unexpected video embed provider');
  }
}
console.log(`Verified article videos: ${players} native player(s), ${embeds} click-to-load platform player(s); local media assets and deployment paths are valid.`);
