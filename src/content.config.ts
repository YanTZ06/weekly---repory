import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const emojiSchema = z.object({
  type: z.enum(["unicode", "custom"]),
  value: z.string().min(1).max(64)
});

const items = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/items" }),
  schema: z.object({
    id: z.string().regex(/^\d{8}-[a-f0-9]{6}$/),
    author: z.string().min(1).max(64),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekYear: z.number().int().min(2000).max(2200),
    week: z.number().int().min(1).max(53),
    category: z.enum(["science-association", "personal", "other"]),
    projects: z.array(z.string().min(1)).max(12).default([]),
    tags: z.array(z.string().min(1)).max(20).default([]),
    emoji: emojiSchema,
    calendarIcon: z.string().min(1).max(64),
    images: z.array(z.string().startsWith("/assets/reports/")).max(9).default([]),
    status: z.enum(["published", "hidden", "deleted"]),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true })
  })
});

export const collections = { items };
