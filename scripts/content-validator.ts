import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { z } from "zod";
import { getISOWeekInfo } from "../src/utils/date";
import { assertHttpUrl, assertIntegerScale } from "../src/utils/security";

const itemSchema = z.object({
  id: z.string().regex(/^\d{8}-[a-f0-9]{6}$/),
  author: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekYear: z.number().int(),
  week: z.number().int().min(1).max(53),
  category: z.enum(["science-association", "personal", "other"]),
  projects: z.array(z.string()).max(12),
  tags: z.array(z.string()).max(20),
  emoji: z.object({ type: z.enum(["unicode", "custom"]), value: z.string().min(1) }),
  calendarIcon: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  images: z.array(z.string().startsWith("/assets/reports/")).max(9),
  status: z.enum(["published", "hidden", "deleted"]),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true })
});

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : target.endsWith(".md") ? [target] : [];
  }));
  return nested.flat();
}

export async function validateContent(root = process.cwd()): Promise<void> {
  const itemsDirectory = path.join(root, "src", "content", "items");
  const files = await walk(itemsDirectory);
  const iconIds = new Set(
    (JSON.parse(await readFile(path.join(root, "src", "data", "calendar-icons.json"), "utf8")) as Array<{ id: string; enabled: boolean }>)
      .filter((icon) => icon.enabled)
      .map((icon) => icon.id)
  );
  const ids = new Set<string>();
  for (const file of files) {
    const parsed = matter(await readFile(file, "utf8"));
    const item = itemSchema.parse(parsed.data);
    if (ids.has(item.id)) throw new Error(`事项 ID 重复：${item.id}`);
    ids.add(item.id);
    const iso = getISOWeekInfo(item.date);
    if (iso.weekYear !== item.weekYear || iso.week !== item.week) {
      throw new Error(`${file} 的 ISO 周字段与日期不一致`);
    }
    if (!iconIds.has(item.calendarIcon)) throw new Error(`${file} 使用了不存在或已停用的记录球`);
    if (!parsed.content.trim()) throw new Error(`${file} 的正文为空`);
    if (/^\s{0,3}(?:#{1,6}\s|```|>|[-*+]\s|\d+\.\s)/m.test(parsed.content) || /<\/?[a-z][^>]*>/i.test(parsed.content)) {
      throw new Error(`${file} 的正文包含 Markdown 或 HTML`);
    }
  }

  const profile = JSON.parse(await readFile(path.join(root, "src", "data", "profile.json"), "utf8")) as {
    avatar: { mapScale: number };
    links: Array<{ url: string }>;
  };
  assertIntegerScale(profile.avatar.mapScale);
  profile.links.forEach((link) => assertHttpUrl(link.url));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await validateContent();
  console.log("内容校验通过。");
}
