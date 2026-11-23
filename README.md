# 湘江中路

一个面向 GitHub Pages 的中文个人博客。基于 Astro 静态生成，包含首页、文章归档、关于页、Markdown 内容集合与文章详情页。

## 设计参考

数据快照：2026-08-17，来自 GitHub 公共 API。没有直接复制主题，而是提取高星项目中已经被验证的产品决策。

| 项目 | Stars | 最近推送 | 借鉴点 |
| --- | ---: | --- | --- |
| [Hugo PaperMod](https://github.com/adityatelange/hugo-PaperMod) | 13,843 | 2026-08-02 | 极低运行成本、阅读优先、主题切换 |
| [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) | 10,539 | 2026-02-08 | 完整内容体验、搜索与 SEO |
| [AstroPaper](https://github.com/satnaing/astro-paper) | 4,968 | 2026-08-05 | Astro 静态输出、可访问性与内容组织 |
| [Fuwari](https://github.com/saicaca/fuwari) | 4,919 | 2026-03-10 | 视觉个性、响应式与标签体系 |
| [Firefly](https://github.com/CuteLeaf/Firefly) | 1,908 | 2026-08-17 | 活跃维护、中文内容场景与功能完整度 |

本站的第二版视觉参考 [铃奈Yuki 的博客](https://momonyako.ccwu.cc/booknav/) 所采用的沉浸式个人空间结构：全屏背景、悬浮毛玻璃导航、作者侧栏、柔和内容卡片与个性化外观控制。没有复制对方插画或品牌素材，仍保留本地搜索、分类筛选、深浅主题、主题色切换、背景花瓣、移动导航、文章目录、阅读进度与链接复制。

## 本地开发

要求 Node.js 24 或更高版本。

```bash
npm install
npm run dev
```

生产验证：

```bash
npm run build
npm run test:images
npm run preview
```

## 内容维护

文章位于 `src/content/blog/`。复制任意 Markdown 文件并修改 frontmatter 即可新增文章。设置 `draft: true` 可让文章保留在仓库中但不参与构建。

旧 Hexo 博客内容可通过 `node scripts/migrate-old-blog.mjs` 重新转换。脚本只读取 `F:/blog/restored-blog/source/_posts`，输出到当前项目的 `src/content/blog/`。
旧图床资产可通过 `node scripts/download-old-assets.mjs` 重新下载；需要本地代理时，先设置 `OLD_BLOG_PROXY`，例如 `http://127.0.0.1:7890`。

站点名称、作者、邮箱和 GitHub 地址集中在 `src/config.ts`。图片放在 `src/assets/images/`，文章里的 `cover` 使用相对于 Markdown 文件的路径，例如 `../../assets/images/about-sky.jpg`。正文也使用 Markdown 图片语法：`![图片说明](../../assets/images/posts/项目名/图片.png)`。

图片由 Astro 在构建时自动生成 WebP 和多尺寸版本，浏览器通过 `srcset` / `sizes` 选择合适的文件。首页背景优先加载，列表封面、头像和正文图片按需加载；无需额外图片服务器，GitHub Pages 和 EdgeOne 都可直接发布构建结果。不要把需要优化的图片放回 `public/` 或使用原始 `<img>` 标签，否则会绕过这条处理流程。

## GitHub Pages 发布

1. 在 GitHub 创建空仓库并推送本项目，默认分支使用 `main`。
2. 打开仓库 `Settings > Pages`，将 Source 设为 `GitHub Actions`。
3. 推送到 `main`，或在 Actions 中手动运行 `Deploy to GitHub Pages`。

工作流会自动区分两类地址：

- 用户站仓库 `USERNAME.github.io`：部署到域名根路径。
- 普通项目仓库：部署到 `https://USERNAME.github.io/REPOSITORY/`，资源和链接会自动加仓库前缀。

自定义域名时，在仓库 `Settings > Secrets and variables > Actions > Variables` 设置：

- `SITE_URL`：例如 `https://notes.example.com`
- `BASE_PATH`：通常为 `/`

完整运维判断、回滚与域名操作见 [OPERATIONS.md](./OPERATIONS.md)。

## 图片来源

初稿图片来自 [Unsplash](https://unsplash.com/)，对应照片 ID：`1499750310107-5fef28a66643`、`1498050108023-c5249f4df085`、`1516321318423-f06f85e504b3`、`1455390582262-044cdead277a`、`1524413840807-0c3cb6fa808d`、`1522383225653-ed111181a951`。上线前可替换为个人摄影、原创插画或项目截图。
