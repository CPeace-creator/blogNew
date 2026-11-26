import type { CollectionEntry } from 'astro:content';
import { SITE } from '../config';
import { withBase } from './paths';
export function getStudioObjects(posts: CollectionEntry<'blog'>[]) {
    const project = (id: string) => posts.find(post => post.id === id);
    const ai = project('ai-bidding-platform'), bim = project('bim-project-management');
    return [
        { id: 'ai', label: '电脑', title: ai?.data.title || 'AI 投标平台', description: ai?.data.description || '把 AI 放进读标、编写和文档检查的工作流程。', href: withBase('/posts/ai-bidding-platform/'), action: '看看这个项目', links: [{ title: '内容样式审查与一键改写', href: withBase('/posts/ai-bidding-content-style-review-rewrite/') }] },
        { id: 'bim', label: '桥梁模型', title: bim?.data.title || 'BIM 项管系统', description: bim?.data.description || '从三维工程部位，查到施工进度与业务记录。', href: withBase('/lab/'), action: '进入 BIM 实验室', links: [{ title: '阅读项目介绍', href: withBase('/posts/bim-project-management/') }] },
        { id: 'notes', label: '书架', title: '留在书页里的技术笔记', description: '把项目里遇到的问题、做过的取舍和核对过程，整理成可以再次回看的记录。', href: withBase('/notes/'), action: '翻翻技术笔记', links: posts.filter(post => post.data.category === '技术笔记').slice(0, 2).map(post => ({ title: post.data.title, href: withBase(`/posts/${post.id}/`) })) },
        { id: 'archive', label: '抽屉', title: '按时间，收好每一篇记录', description: `这里已经收录 ${posts.length} 篇文章。沿着时间往回翻，也许能找到你关心的问题。`, href: withBase('/archive/'), action: '打开文章归档', links: [] },
        { id: 'about', label: '樱花树', title: `你好，我是${SITE.author}`, description: '我做工程软件与 AI 应用，也把开发中的思考写在这里。欢迎来这间小小的工作室坐一会儿。', href: withBase('/about/'), action: '认识一下我', links: [{ title: '看看做过的项目', href: withBase('/projects/') }] },
        { id: 'contact', label: '信封', title: '留一句话，聊聊你的想法', description: '如果你也在做类似的项目，或想交流文章里提到的问题，可以通过邮件联系我。', href: withBase('/about/#contact'), action: '查看联系方式', links: [{ title: '我的 GitHub', href: SITE.github }] }
    ];
}
export type StudioObject = ReturnType<typeof getStudioObjects>[number];
