# 运维可行性评估

结论：可行，并且适合个人长期维护。本站在构建阶段生成纯静态文件，GitHub Pages 只负责 CDN 托管；没有常驻服务、数据库、运行时密钥或服务器补丁工作。

## 发布链路

```text
Markdown / Astro 源码
        ↓ push main
GitHub Actions: npm ci → 类型检查 → Astro build
        ↓ 成功后上传 dist
GitHub Pages CDN
```

构建失败时，线上版本保持不变。正常发布只需要一次 Git 提交，适合低频或不定期更新。

## 约束与判断

| 项目 | 结论 | 说明 |
| --- | --- | --- |
| 托管费用 | 可行 | 公共仓库使用 Pages 无服务器费用；私有仓库取决于 GitHub 账户方案 |
| 项目子路径 | 已处理 | 工作流自动为普通仓库设置 `/REPOSITORY` 前缀 |
| 自定义域名 | 可行 | 使用仓库变量配置站点地址；DNS 在域名服务商维护 |
| HTTPS | 可行 | GitHub Pages 可自动签发与续期证书 |
| 内容更新 | 可行 | 新增 Markdown 后提交即可，无需 CMS |
| 搜索 | 可行 | 当前为浏览器端小型索引；文章数达到约 500 篇后再评估 Pagefind |
| 评论 | 未启用 | 静态站没有服务端；需要时可接入基于 GitHub Discussions 的 Giscus |
| 访问统计 | 未启用 | 可按隐私要求选择 Cloudflare Web Analytics 或 Plausible |
| 中国大陆访问 | 有外部风险 | GitHub Pages 的可达性和速度不提供大陆 SLA；若受众主要在大陆，建议后续同步到国内对象存储/CDN 并完成备案 |

## 首次上线

1. 创建 GitHub 仓库，推送 `main` 分支。
2. 在 `Settings > Pages` 选择 `GitHub Actions`。
3. 查看 `Actions > Deploy to GitHub Pages`，确认 build 与 deploy 均成功。
4. 打开 Actions 输出的地址，检查首页、文章页、图片、搜索和移动端菜单。

## 自定义域名

1. 在 Actions Variables 设置 `SITE_URL=https://你的域名` 与 `BASE_PATH=/`。
2. 在 `Settings > Pages > Custom domain` 填入域名。
3. 按 GitHub 提示配置 DNS。子域名通常使用 CNAME 指向 `USERNAME.github.io`。
4. DNS 生效后启用 `Enforce HTTPS`。

不要手写 `CNAME` 后就跳过 Pages 设置；GitHub 的域名验证与 HTTPS 状态仍需要在设置页完成。

## 回滚

如果最新内容或样式有问题，恢复上一个提交并再次推送即可：

```bash
git revert <problem-commit>
git push origin main
```

`git revert` 会保留完整历史，比强制重写 `main` 更适合公开站点。

## 例行维护

- 每次发布：确认 Actions 成功，并抽查新文章链接和封面。
- 每月：运行 `npm outdated`，集中评估依赖更新；不要在写文章时临时升级框架。
- 每季度：检查 Pages 域名与 HTTPS 状态、失效外链和 Lighthouse 指标。
- 改版前：从 `main` 创建分支，预览构建通过后再合并。

## 当前版本基线

- Astro `7.2.2`
- Node.js `24`
- `actions/checkout@v7`
- `actions/setup-node@v7`
- `actions/configure-pages@v6`
- `actions/upload-pages-artifact@v5`
- `actions/deploy-pages@v5`

版本数据核对日期为 2026-08-17。Actions 使用主版本标签，补丁更新由 GitHub 官方维护；框架与依赖通过 `package-lock.json` 固定。
