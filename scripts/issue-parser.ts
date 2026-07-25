import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getISOWeekInfo } from "../src/utils/date";
import type { ReportCategory, ReportItem, ReportStatus } from "../src/types/content";
import { assertIntegerScale, assertHttpUrl } from "../src/utils/security";
import { assertMapPosition } from "../src/utils/config";

export type IssueFields = Record<string, string>;

const EMPTY_VALUES = new Set(["", "_未填写_", "未填写", "无", "none", "n/a"]);
const categoryAliases: Record<string, ReportCategory> = {
  "为科协做了什么": "science-association",
  "science-association": "science-association",
  "为自己做了什么": "personal",
  personal: "personal",
  其他: "other",
  other: "other"
};

const reportInputSchema = z.object({
  author: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["science-association", "personal", "other"]),
  body: z.string().min(1).max(4000),
  projects: z.array(z.string().min(1).max(80)).max(12),
  tags: z.array(z.string().min(1).max(40)).max(20),
  emojiType: z.enum(["unicode", "custom"]),
  emojiValue: z.string().min(1).max(64),
  calendarIcon: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  images: z.array(z.string().url()).max(9)
});

export interface ParsedReportInput extends z.infer<typeof reportInputSchema> {}

export function parseIssueForm(body: string): IssueFields {
  const normalized = body.replaceAll("\r\n", "\n");
  const fields: IssueFields = {};
  const headings = [...normalized.matchAll(/^###\s+(.+?)\s*$/gm)];
  for (const [index, match] of headings.entries()) {
    const name = match[1]?.trim();
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = headings[index + 1]?.index ?? normalized.length;
    const value = normalized.slice(contentStart, contentEnd).trim();
    if (name) fields[name] = value;
  }
  return fields;
}

export function getField(fields: IssueFields, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = fields[name]?.trim();
    if (value !== undefined && !EMPTY_VALUES.has(value.toLowerCase())) return value;
  }
  return undefined;
}

export function parseList(value?: string): string[] {
  if (!value || EMPTY_VALUES.has(value.trim().toLowerCase())) return [];
  return [
    ...new Set(
      value
        .split(/[,，;\n]+/)
        .map((item) => item.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean)
    )
  ];
}

export function extractImageUrls(value?: string): string[] {
  if (!value) return [];
  const urls = new Set<string>();
  for (const match of value.matchAll(/https:\/\/[^\s)>\]]+/g)) {
    if (match[0]) urls.add(match[0]);
  }
  const images = [...urls];
  if (images.length > 9) throw new Error("每条事项最多上传 9 张图片");
  return images;
}

export function assertPlainText(value: string): string {
  const text = value.replaceAll("\0", "").replaceAll("\r\n", "\n").trim();
  if (!text) throw new Error("事项内容不能为空");
  if (/^\s{0,3}(?:#{1,6}\s|```|>|[-*+]\s|\d+\.\s)/m.test(text) || /<\/?[a-z][^>]*>/i.test(text)) {
    throw new Error("事项正文只支持纯文本，不支持 Markdown 或 HTML");
  }
  return text;
}

export function parseReportInput(fields: IssueFields, author: string): ParsedReportInput {
  const date = getField(fields, "事项日期", "日期");
  const categoryRaw = getField(fields, "分类");
  const body = getField(fields, "事项内容", "新内容");
  const emojiType = getField(fields, "事项主表情类型", "主表情类型") ?? "unicode";
  const emojiValue = getField(fields, "Unicode 表情或自定义表情 ID", "主表情", "新主表情") ?? "📝";
  const input = {
    author,
    date,
    category: categoryRaw ? categoryAliases[categoryRaw] : undefined,
    body: body ? assertPlainText(body) : body,
    projects: parseList(getField(fields, "项目", "新项目")),
    tags: parseList(getField(fields, "标签", "新标签")),
    emojiType,
    emojiValue,
    calendarIcon: getField(fields, "日历记录球", "新记录球") ?? "huizhou-pattern",
    images: extractImageUrls(getField(fields, "图片", "新图片"))
  };
  return reportInputSchema.parse(input);
}

export function createReportItem(input: ParsedReportInput, now = new Date()): ReportItem {
  const iso = getISOWeekInfo(input.date);
  const id = `${input.date.replaceAll("-", "")}-${randomBytes(3).toString("hex")}`;
  const timestamp = now.toISOString();
  return {
    id,
    author: input.author,
    date: input.date,
    weekYear: iso.weekYear,
    week: iso.week,
    category: input.category,
    projects: input.projects,
    tags: input.tags,
    emoji: { type: input.emojiType, value: input.emojiValue },
    calendarIcon: input.calendarIcon,
    images: [],
    status: "published",
    createdAt: timestamp,
    updatedAt: timestamp,
    body: input.body
  };
}

export function parseStatus(value: string): ReportStatus {
  const normalized: Record<string, ReportStatus> = {
    隐藏: "hidden",
    "放入回收站": "deleted",
    恢复公开: "published",
    hidden: "hidden",
    deleted: "deleted",
    published: "published"
  };
  const status = normalized[value.trim()];
  if (!status) throw new Error(`不支持的状态操作：${value}`);
  return status;
}

export function parseProfileFields(fields: IssueFields): Record<string, unknown> {
  const scaleRaw = getField(fields, "头像缩放倍数");
  const links = parseList(getField(fields, "外部链接")).map((entry, index) => {
    const [name, url] = entry.split(/\s*[|｜]\s*/, 2);
    if (!name || !url) throw new Error("外部链接格式应为：名称 | https://example.com");
    assertHttpUrl(url);
    return { id: `link-${index + 1}`, name, url, icon: "link", visible: true, order: index + 1 };
  });
  return {
    siteTitle: getField(fields, "网站名称"),
    name: getField(fields, "昵称"),
    description: getField(fields, "简介"),
    mapPosition: getField(fields, "地图站位") ? assertMapPosition(getField(fields, "地图站位") as string) : undefined,
    mapScale: scaleRaw ? assertIntegerScale(Number(scaleRaw)) : undefined,
    showName: getField(fields, "是否显示昵称") === "是",
    links: links.length > 0 ? links : undefined
  };
}
