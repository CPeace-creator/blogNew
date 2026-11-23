import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { PROJECT_TOPIC_SLUGS } from './lib/project-topics';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
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
    relatedPosts: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    cover: image(),
    coverAlt: z.string(),
    readingTime: z.string().default('5 分钟'),
  }),
});

export const collections = { blog };
