import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { migrateContentImages } from './lib/content-images.mjs';

const sourceRoot = 'F:/blog/restored-blog/source/_posts';
const targetRoot = path.resolve('src/content/blog');

const posts = [
  {
    source: 'home.md',
    target: 'about-me.md',
    title: '关于我',
    description: 'Web Developer & Designer，来自福建厦门，记录我的技能、项目与近期工作。',
    publishedAt: '2025-03-05',
    category: '自我介绍',
    tags: ['个人介绍', 'Web 开发', '独立开发'],
    featured: true,
    cover: '/images/profile-avatar.jpg',
    coverAlt: '陈嘉鸿的个人头像',
  },
  {
    source: 'uniPush.md',
    target: 'uni-push.md',
    title: 'UniPush 推送项目',
    description: '基于 uni-app 与 uniCloud 实现实时推送、抽奖转盘、订单同步和扫码核销。',
    publishedAt: '2025-03-16',
    category: '项目',
    tags: ['uni-app', 'uniCloud', '实时推送', '微信小程序'],
    featured: false,
    cover: '/images/posts/uni-push/raffle-pic.jpg',
    coverAlt: 'UniPush 抽奖项目界面',
  },
  {
    source: 'courseSea.md',
    target: 'course-sea.md',
    title: '课海导航',
    description: '一个用于记录程序员学习课程、知识和学习时长的成长平台。',
    publishedAt: '2025-03-23',
    category: '项目',
    tags: ['uni-app', 'Node.js', '学习平台'],
    featured: false,
    cover: '/images/posts/course-sea/cover.png',
    coverAlt: '课海导航项目封面',
  },
  {
    source: 'EPR.md',
    target: 'epr-logistics.md',
    title: '卡车物流项目',
    description: '面向全球木材运输的智能物流平台，覆盖合同、调度、追踪与财务结算。',
    publishedAt: '2025-03-23',
    category: '项目',
    tags: ['Spring Boot', 'Vue', '物流系统', '性能优化'],
    featured: false,
    cover: '/images/posts/epr-logistics/cover.png',
    coverAlt: '卡车物流管理系统界面',
  },
  {
    source: 'technology/index.md',
    target: 'technology-stack.md',
    title: '我的技术栈',
    description: '后端、前端、数据库与中间件能力的阶段性知识库概览。',
    publishedAt: '2025-04-19',
    category: '技术成长',
    tags: ['技术栈', '开发技能', '编程语言'],
    featured: true,
    cover: '/images/github-pages.webp',
    coverAlt: '代码开发工作台',
  },
  {
    source: 'ai-bidding-platform.md',
    target: 'ai-bidding-platform.md',
    title: 'AI 投标平台',
    description: '围绕读标、审查、模板沉淀和智能方案编制搭建的招投标 AI 工作台。',
    publishedAt: '2026-04-02',
    category: '项目',
    tags: ['AI 审查', '标书解析', 'Vue 3', 'Spring Boot'],
    featured: true,
    cover: '/images/posts/ai-bidding-platform/login.png',
    coverAlt: 'AI 投标平台登录界面',
  },
  {
    source: 'tunnel-intelligent-construction.md',
    target: 'tunnel-intelligent-construction.md',
    title: '隧道智能建造平台',
    description: '把工程对象、智能爆破、围岩识别、超欠挖分析和施工看板串成完整业务链路。',
    publishedAt: '2026-07-16',
    category: '项目',
    tags: ['隧道工程', 'Vue 3', 'Spring Boot', 'Three.js'],
    featured: true,
    cover: '/images/about-sky.jpg',
    coverAlt: '城市高架与暮色天空',
  },
];

function stripFrontmatter(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
}

function rewriteImages(body, target) {
  const rawPrefix = 'https://raw.githubusercontent.com/CPeace-creator/picGo/main/';
  const folder = target.replace(/\.md$/, '');
  let next = body.replaceAll('/img/ai-bidding-platform/', '../../images/posts/ai-bidding-platform/');
  next = next.replaceAll(rawPrefix, `../../images/posts/${folder}/`);
  next = next.replace(/^# UniPush 推送项目\r?\n+/, '');
  return next;
}

function estimateReadingTime(body) {
  const text = body.replace(/<[^>]+>/g, ' ').replace(/[`#>*_|\-]/g, ' ');
  const units = (text.match(/[\u3400-\u9fff]/g)?.length ?? 0) + text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(2, Math.ceil(units / 420))} 分钟`;
}

function frontmatter(post, readingTime) {
  return [
    '---',
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.description)}`,
    `publishedAt: ${post.publishedAt}`,
    `category: ${JSON.stringify(post.category)}`,
    `tags: ${JSON.stringify(post.tags)}`,
    `featured: ${post.featured}`,
    'draft: false',
    `cover: ${JSON.stringify(post.cover)}`,
    `coverAlt: ${JSON.stringify(post.coverAlt)}`,
    `readingTime: ${JSON.stringify(readingTime)}`,
    '---',
    '',
  ].join('\n');
}

await mkdir(targetRoot, { recursive: true });

for (const post of posts) {
  const source = await readFile(path.join(sourceRoot, post.source), 'utf8');
  const body = rewriteImages(stripFrontmatter(source), post.target);
  await writeFile(path.join(targetRoot, post.target), migrateContentImages(`${frontmatter(post, estimateReadingTime(body))}${body}\n`), 'utf8');
}

console.log(`Migrated ${posts.length} posts to ${targetRoot}`);
