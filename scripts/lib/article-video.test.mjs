import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveArticleVideo, resolveMediaUrl } from '../../src/lib/article-video.ts';

test('local videos follow the deployment base without duplicating an existing prefix', () => {
  assert.deepEqual(resolveArticleVideo('/videos/bim.mp4', '/blog/'), { kind: 'file', src: '/blog/videos/bim.mp4', mime: 'video/mp4', local: true });
  assert.equal(resolveArticleVideo('/blog/videos/bim.mp4', '/blog/').src, '/blog/videos/bim.mp4');
  assert.equal(resolveArticleVideo('videos/bim.webm', '').src, '/videos/bim.webm');
});

test('HTTPS video links retain query signatures and starting fragments', () => {
  const source = 'https://cdn.example.com/demo.MP4?signature=abc#t=12';
  assert.deepEqual(resolveArticleVideo(source, '/blog'), { kind: 'file', src: source, mime: 'video/mp4', local: false });
});

test('Bilibili links retain the selected part and discard unrelated share parameters', () => {
  const video = resolveArticleVideo('https://www.bilibili.com/video/BV1xx411c7mD/?p=2&share_source=copy_web');
  assert.equal(video.kind, 'embed');
  assert.equal(video.provider, 'B 站');
  const embed = new URL(video.embedUrl);
  assert.equal(embed.hostname, 'player.bilibili.com');
  assert.equal(embed.searchParams.get('bvid'), 'BV1xx411c7mD');
  assert.equal(embed.searchParams.get('p'), '2');
  assert.equal(embed.searchParams.get('danmaku'), '0');
  assert.equal(new URL(video.watchUrl).searchParams.has('share_source'), false);
});

test('an existing Bilibili player address validates identifiers before reuse', () => {
  const video = resolveArticleVideo('https://player.bilibili.com/player.html?bvid=invalid&aid=12345&p=Infinity');
  assert.equal(new URL(video.embedUrl).searchParams.get('aid'), '12345');
  assert.equal(new URL(video.embedUrl).searchParams.get('p'), '1');
  assert.equal(new URL(video.embedUrl).searchParams.has('bvid'), false);
});

test('YouTube watch, short and privacy-enhanced links resolve to the same video', () => {
  for (const url of ['https://www.youtube.com/watch?v=M7lc1UVf-VE', 'https://youtu.be/M7lc1UVf-VE', 'https://www.youtube.com/shorts/M7lc1UVf-VE', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE']) {
    const video = resolveArticleVideo(url);
    assert.equal(video.kind, 'embed');
    assert.equal(new URL(video.embedUrl).pathname, '/embed/M7lc1UVf-VE');
    assert.equal(new URL(video.embedUrl).hostname, 'www.youtube.com');
  }
});

test('unsupported pages and unsafe URL forms do not become embedded players', () => {
  for (const source of ['', 'javascript:alert(1)', '//cdn.example.com/demo.mp4', 'http://cdn.example.com/demo.mp4', '../private/demo.mp4', 'https://www.youtube.com.evil.test/watch?v=M7lc1UVf-VE', 'https://www.bilibili.com/video/not-a-video/', 'https://example.com/readme.html']) assert.throws(() => resolveArticleVideo(source));
});

test('caption paths follow the same site prefix and preserve UTF-8 filenames', () => {
  assert.equal(resolveMediaUrl('/videos/字幕.vtt', '/blog'), '/blog/videos/%E5%AD%97%E5%B9%95.vtt');
  assert.equal(resolveMediaUrl('https://cdn.example.com/demo.vtt', '/blog'), 'https://cdn.example.com/demo.vtt');
});
