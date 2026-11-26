export type ArticleVideoSource =
  | { kind: 'file'; src: string; mime: 'video/mp4' | 'video/webm'; local: boolean }
  | { kind: 'embed'; provider: 'B 站' | 'YouTube'; watchUrl: string; embedUrl: string };

const unsafeCharacters = /[\\\u0000-\u001f]/;
const relativeOrigin = 'https://local-media.invalid';

/** Media in public/ follows the deployment base; remote URLs remain unchanged. */
export function resolveMediaUrl(source: string, base = '/') {
  const value = source.trim();
  if (!value || unsafeCharacters.test(value) || value.startsWith('//')) throw new Error('请使用 public 目录中的文件路径或完整 HTTPS 地址。');
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('外部视频与字幕地址必须使用 HTTPS。');
    return url.href;
  }
  if (/(^|\/)\.\.(\/|$)/.test(value)) throw new Error('视频路径应从 public 目录开始，不使用上级目录。');
  const url = new URL(value.startsWith('/') ? value : `/${value}`, relativeOrigin);
  const basePath = base.replace(/^\/+|\/+$/g, '');
  const prefix = basePath ? `/${basePath}` : '';
  const pathname = prefix && url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`) ? `${prefix}${url.pathname}` : url.pathname;
  return `${pathname}${url.search}${url.hash}`;
}

export function resolveArticleVideo(source: string, base = '/'): ArticleVideoSource {
  const src = resolveMediaUrl(source, base);
  const url = new URL(src, relativeOrigin);
  const host = url.hostname;
  if (['www.bilibili.com', 'bilibili.com', 'm.bilibili.com', 'player.bilibili.com'].includes(host)) {
    const candidateBvid = url.pathname.match(/(?:^|\/)(BV[0-9a-zA-Z]{10})(?:\/|$)/)?.[1] || url.searchParams.get('bvid');
    const candidateAid = url.pathname.match(/(?:^|\/)av(\d+)(?:\/|$)/)?.[1] || url.searchParams.get('aid');
    const bvid = candidateBvid && /^BV[0-9a-zA-Z]{10}$/.test(candidateBvid) ? candidateBvid : undefined;
    const aid = candidateAid && /^[1-9]\d*$/.test(candidateAid) ? candidateAid : undefined;
    if (!bvid && !aid) throw new Error('B 站地址中没有有效的视频编号。');
    const requestedPage = Number(url.searchParams.get('p'));
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    const embed = new URL('https://player.bilibili.com/player.html');
    embed.searchParams.set(bvid ? 'bvid' : 'aid', bvid || aid!);
    embed.searchParams.set('p', String(page));
    // This URL is only attached to an iframe after the reader presses Play.
    embed.searchParams.set('autoplay', '1');
    embed.searchParams.set('danmaku', '0');
    const watchUrl = `https://www.bilibili.com/video/${bvid || `av${aid}`}/?p=${page}`;
    return { kind: 'embed', provider: 'B 站', watchUrl, embedUrl: embed.href };
  }
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
    const id = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('YouTube 地址中没有有效的视频编号。');
    return { kind: 'embed', provider: 'YouTube', watchUrl: `https://www.youtube.com/watch?v=${id}`, embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0` };
  }
  if (/\.mp4$/i.test(url.pathname)) return { kind: 'file', src, mime: 'video/mp4', local: url.origin === relativeOrigin };
  if (/\.webm$/i.test(url.pathname)) return { kind: 'file', src, mime: 'video/webm', local: url.origin === relativeOrigin };
  throw new Error('演示视频支持 MP4、WebM，或完整的 B 站、YouTube 视频链接。');
}
