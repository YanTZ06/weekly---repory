import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  isOwner,
  readIssueEvent,
  rejectUnauthorized,
  reportProcessingFailure,
  setActionOutput
} from "./github-utils";
import {
  createReportItem,
  getField,
  parseIssueForm,
  parseList,
  parseReportInput,
  parseStatus,
  extractImageUrls,
  assertPlainText
} from "./issue-parser";
import { processReportImages } from "./image-processor";
import { reportItemToMarkdown } from "./markdown-generator";
import { getISOWeekInfo } from "../src/utils/date";
import type { ReportItem } from "../src/types/content";
import { validateContent } from "./content-validator";

async function findItemFile(id: string, root = process.cwd()): Promise<string> {
  if (!/^\d{8}-[a-f0-9]{6}$/.test(id)) throw new Error("事项 ID 格式错误");
  const itemsRoot = path.join(root, "src", "content", "items");
  const years = await import("node:fs/promises").then(({ readdir }) => readdir(itemsRoot, { withFileTypes: true }));
  for (const year of years.filter((entry) => entry.isDirectory())) {
    const weekDirectories = await import("node:fs/promises").then(({ readdir }) =>
      readdir(path.join(itemsRoot, year.name), { withFileTypes: true })
    );
    for (const weekDirectory of weekDirectories.filter((entry) => entry.isDirectory())) {
      const candidate = path.join(itemsRoot, year.name, weekDirectory.name, `${id}.md`);
      try {
        await readFile(candidate);
        return candidate;
      } catch {
        // Continue searching.
      }
    }
  }
  throw new Error(`找不到事项：${id}`);
}

async function readItem(file: string): Promise<ReportItem> {
  const parsed = matter(await readFile(file, "utf8"));
  return { ...(parsed.data as Omit<ReportItem, "body">), body: parsed.content.trim() };
}

async function addItem(fields: ReturnType<typeof parseIssueForm>, author: string): Promise<string> {
  const input = parseReportInput(fields, author);
  const item = createReportItem(input);
  const images = await processReportImages(input.images, item);
  item.images = images.map((image) => image.publicPath);
  const directory = path.join(
    process.cwd(),
    "src",
    "content",
    "items",
    String(item.weekYear),
    `${item.weekYear}-W${String(item.week).padStart(2, "0")}`
  );
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${item.id}.md`);
  await writeFile(file, reportItemToMarkdown(item), { flag: "wx" });
  await validateContent();
  return item.id;
}

async function updateItem(fields: ReturnType<typeof parseIssueForm>): Promise<string> {
  const id = getField(fields, "事项 ID");
  if (!id) throw new Error("缺少事项 ID");
  const currentFile = await findItemFile(id);
  const item = await readItem(currentFile);
  const newDate = getField(fields, "新日期");
  const newCategory = getField(fields, "新分类");
  const newContent = getField(fields, "新内容");
  const categoryMap: Record<string, ReportItem["category"]> = {
    "为科协做了什么": "science-association",
    "为自己做了什么": "personal",
    "其他": "other"
  };
  if (newDate) {
    const iso = getISOWeekInfo(newDate);
    item.date = newDate;
    item.weekYear = iso.weekYear;
    item.week = iso.week;
  }
  if (newCategory) item.category = categoryMap[newCategory] ?? item.category;
  if (newContent) item.body = assertPlainText(newContent);
  const projects = getField(fields, "新项目");
  const tags = getField(fields, "新标签");
  const emoji = getField(fields, "新主表情");
  const calendarIcon = getField(fields, "新记录球");
  if (projects) item.projects = parseList(projects);
  if (tags) item.tags = parseList(tags);
  if (emoji) item.emoji = { type: "unicode", value: emoji };
  if (calendarIcon) item.calendarIcon = calendarIcon;
  const replacementImages = extractImageUrls(getField(fields, "新图片"));
  if (getField(fields, "是否替换图片") === "是") {
    const processed = await processReportImages(replacementImages, item);
    item.images = processed.map((image) => image.publicPath);
  }
  item.updatedAt = new Date().toISOString();
  const targetDirectory = path.join(
    process.cwd(),
    "src",
    "content",
    "items",
    String(item.weekYear),
    `${item.weekYear}-W${String(item.week).padStart(2, "0")}`
  );
  await mkdir(targetDirectory, { recursive: true });
  const targetFile = path.join(targetDirectory, `${item.id}.md`);
  await writeFile(targetFile, reportItemToMarkdown(item));
  if (targetFile !== currentFile) {
    await import("node:fs/promises").then(({ unlink }) => unlink(currentFile));
  }
  await validateContent();
  return item.id;
}

async function changeStatus(fields: ReturnType<typeof parseIssueForm>): Promise<string> {
  const id = getField(fields, "事项 ID");
  const operation = getField(fields, "操作");
  if (!id || !operation) throw new Error("缺少事项 ID 或状态操作");
  const file = await findItemFile(id);
  const item = await readItem(file);
  item.status = parseStatus(operation);
  item.updatedAt = new Date().toISOString();
  await writeFile(file, reportItemToMarkdown(item));
  await validateContent();
  return item.id;
}

async function main(): Promise<void> {
  const event = await readIssueEvent();
  if (!isOwner(event.issue.user.login)) {
    await rejectUnauthorized(event.issue.number);
    await setActionOutput("skip", true);
    return;
  }
  await setActionOutput("skip", false);
  const fields = parseIssueForm(event.issue.body ?? "");
  const labels = new Set(event.issue.labels.map((label) => label.name));
  try {
    const isUpdate = labels.has("report:update") || event.issue.title.startsWith("[修改事项]");
    const isStatus = labels.has("report:status") || event.issue.title.startsWith("[状态管理]");
    const id = isUpdate
      ? await updateItem(fields)
      : isStatus
        ? await changeStatus(fields)
        : await addItem(fields, event.issue.user.login);
    await setActionOutput("result_id", id);
  } catch (error) {
    await reportProcessingFailure(event.issue.number, error);
    process.exitCode = 1;
  }
}

await main();
