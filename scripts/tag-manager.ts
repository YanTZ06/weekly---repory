import { z } from "zod";
import type { Tag } from "../src/types/content";
import { assertSafeId } from "../src/utils/slug";

export const PRESET_TAG_ICON_IDS = ["mechanical", "scroll", "star", "mountain"] as const;

const tagInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "标签名称不能为空")
    .max(40, "标签名称不能超过 40 个字符")
    .refine((value) => !/[\u0000-\u001f<>]/.test(value), "标签名称包含不安全字符"),
  slug: z.string().trim(),
  icon: z.string().regex(
    /^\/assets\/tag-icons\/[a-z0-9][a-z0-9-]{0,67}\.png$/,
    "标签图标路径不安全"
  ),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "标签颜色必须是 #RRGGBB 格式")
});

export interface NewTagInput {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export function createTag(
  input: NewTagInput,
  existingTags: Tag[],
  now = new Date()
): Tag {
  const parsed = tagInputSchema.parse(input);
  const slug = assertSafeId(parsed.slug);
  const normalizedName = parsed.name.toLocaleLowerCase("zh-CN");

  if (existingTags.some((tag) => tag.name.toLocaleLowerCase("zh-CN") === normalizedName)) {
    throw new Error(`标签名称已存在：${parsed.name}`);
  }
  if (existingTags.some((tag) => tag.slug.toLowerCase() === slug.toLowerCase())) {
    throw new Error(`标签 slug 已存在：${slug}`);
  }

  return {
    name: parsed.name,
    slug,
    icon: parsed.icon,
    color: parsed.color.toUpperCase(),
    createdAt: now.toISOString()
  };
}
