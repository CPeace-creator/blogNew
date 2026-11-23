import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateContentImages } from './content-images.mjs';

test('migrates frontmatter and body images into the Astro asset pipeline', () => {
  const migrated = migrateContentImages('cover: "/images/cover.png"\n<img src="../../images/posts/ui.png" alt="界面">');
  assert.equal(migrated, 'cover: "../../assets/images/cover.png"\n![界面](../../assets/images/posts/ui.png)');
});

test('preserves authored percentage widths without an unoptimized img tag', () => {
  assert.equal(migrateContentImages('<img src="../../images/ui.png" width="75%"/>'),
    '<figure style="width:75%">\n\n![项目界面截图](../../assets/images/ui.png)\n\n</figure>');
});

test('leaves external images and existing Markdown images unchanged', () => {
  const input = '<img src="https://example.com/ui.png">\n![界面](../../assets/images/ui.png)';
  assert.equal(migrateContentImages(input), input);
});

test('can run repeatedly without changing already migrated articles', () => {
  const migrated = migrateContentImages("cover: '/images/cover.jpg'\n<img src='../../images/ui.png' width='60%'>");
  assert.equal(migrateContentImages(migrated), migrated);
});
