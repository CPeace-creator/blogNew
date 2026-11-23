// Relative sources let Astro optimize images in both frontmatter and Markdown.
export function migrateContentImages(markdown) {
  return markdown
    .replace(/^(cover:\s*["'])\/images\//gm, '$1../../assets/images/')
    .replace(/<img\b([^>]*?)\/?>/gi, (tag, attributes) => {
      const attribute = (name) => attributes.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
      const source = attribute('src');
      if (!source?.startsWith('../../images/')) return tag;
      const src = source.replace('../../images/', '../../assets/images/');
      const alt = (attribute('alt') || '项目界面截图').replace(/[\[\]]/g, '');
      const image = `![${alt}](${src})`;
      const width = attribute('width');
      return width && /^\d+(?:\.\d+)?%$/.test(width)
        ? `<figure style="width:${width}">\n\n${image}\n\n</figure>`
        : image;
    });
}
