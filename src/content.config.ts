import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { PROJECT_TOPIC_SLUGS } from './lib/project-topics';
import { resolveArticleVideo, resolveMediaUrl } from './lib/article-video';

const videoSource = z.string().trim().min(1).refine(value => {
  try { resolveArticleVideo(value); return true; } catch { return false; }
}, '请使用 MP4、WebM 文件路径，或完整的 B 站、YouTube 视频链接。');
const captionSource = z.string().trim().min(1).refine(value => {
  try { return new URL(resolveMediaUrl(value), 'https://local-media.invalid').pathname.toLowerCase().endsWith('.vtt'); } catch { return false; }
}, '字幕应使用 public 目录中的 WebVTT 文件路径或 HTTPS WebVTT 地址。');

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) => {
    const video = z.object({
      src: videoSource,
      title: z.string().trim().min(1).default('演示视频'),
      description: z.string().trim().optional(),
      poster: image().optional(),
      captions: z.object({
        src: captionSource,
        label: z.string().trim().min(1).default('中文字幕'),
        language: z.string().trim().min(1).default('zh-CN'),
      }).optional(),
    });
    return z.object({
      title: z.string(),
      description: z.string(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      category: z.string(),
      projectTopic: z.enum(PROJECT_TOPIC_SLUGS).optional(),
      projectSummary: z.object({
        role: z.string(),
        status: z.string(),
      }).optional(),
      demoVideo: video.optional(),
      demoVideos: z.array(video).default([]),
      relatedPosts: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
      cover: image(),
      coverAlt: z.string(),
      readingTime: z.string().default('5 分钟'),
    });
  },
});

export const collections = { blog };
