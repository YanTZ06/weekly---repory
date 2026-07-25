import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  isOwner,
  readIssueEvent,
  rejectUnauthorized,
  reportProcessingFailure,
  setActionOutput
} from "./github-utils";
import { extractImageUrls, getField, parseIssueForm } from "./issue-parser";
import { downloadManagedAsset } from "./image-processor";
import { assertSafeId } from "../src/utils/slug";
import { assertMapPosition } from "../src/utils/config";
import { validateAssetLicenses } from "./asset-license-validator";
import type { Tag } from "../src/types/content";
import { createTag, PRESET_TAG_ICON_IDS } from "./tag-manager";

async function updateJson<T>(file: string, updater: (items: T[]) => T[]): Promise<void> {
  const items = JSON.parse(await readFile(file, "utf8")) as T[];
  await writeFile(file, `${JSON.stringify(updater(items), null, 2)}\n`);
}

async function main(): Promise<void> {
  const event = await readIssueEvent();
  if (!isOwner(event.issue.user.login)) {
    await rejectUnauthorized(event.issue.number);
    await setActionOutput("skip", true);
    return;
  }
  await setActionOutput("skip", false);
  try {
    const fields = parseIssueForm(event.issue.body ?? "");
    const labels = new Set(event.issue.labels.map((label) => label.name));
    const isTag = labels.has("asset:tag") || event.issue.title.startsWith("[标签管理]");
    const isProject = labels.has("asset:project") || event.issue.title.startsWith("[项目灵兽管理]");
    let resultId = "";
    let processKind = "assets";
    if (isTag) {
      const name = z.string().parse(getField(fields, "标签名称"));
      const slug = assertSafeId(z.string().parse(getField(fields, "标签 slug")));
      const color = z.string().parse(getField(fields, "标签颜色"));
      const iconChoice = z.string().parse(getField(fields, "标签图标"));
      const dataFile = path.join(process.cwd(), "src", "data", "tags.json");
      const existingTags = JSON.parse(await readFile(dataFile, "utf8")) as Tag[];
      let icon: string;
      let uploadedImageUrl: string | undefined;

      if (iconChoice === "上传新图标") {
        const [imageUrl] = extractImageUrls(getField(fields, "新图标图片"));
        if (!imageUrl) throw new Error("选择“上传新图标”时必须上传图片");
        icon = `/assets/tag-icons/tag-${slug}.png`;
        uploadedImageUrl = imageUrl;
      } else {
        if (!PRESET_TAG_ICON_IDS.includes(iconChoice as (typeof PRESET_TAG_ICON_IDS)[number])) {
          throw new Error(`未知的预设标签图标：${iconChoice}`);
        }
        icon = `/assets/tag-icons/${iconChoice}.png`;
      }

      const tag = createTag({ name, slug, icon, color }, existingTags);
      if (uploadedImageUrl) {
        await downloadManagedAsset(
          uploadedImageUrl,
          ["tag-icons"],
          `tag-${slug}.png`,
          { kind: "tag-icon" }
        );
      }
      await updateJson<Tag>(dataFile, (items) => [...items, tag]);
      resultId = tag.slug;
      processKind = "tag";
    } else if (isProject) {
      const projectName = z.string().min(1).max(80).parse(getField(fields, "项目名称"));
      const slug = assertSafeId(z.string().parse(getField(fields, "项目 slug")));
      const creatureId = assertSafeId(z.string().parse(getField(fields, "灵兽 ID")));
      const mapPosition = assertMapPosition(z.string().min(1).max(64).parse(getField(fields, "地图站位")));
      const showOnMap = getField(fields, "是否在地图显示") !== "否";
      const creatures = JSON.parse(
        await readFile(path.join(process.cwd(), "src", "data", "creatures.json"), "utf8")
      ) as Array<{ id: string; enabled: boolean }>;
      if (!creatures.some((creature) => creature.id === creatureId && creature.enabled)) {
        throw new Error(`未知或未启用的灵兽 ID：${creatureId}`);
      }
      await updateJson<Record<string, unknown>>(path.join(process.cwd(), "src", "data", "projects.json"), (items) => {
        const next = items.filter((item) => item.slug !== slug);
        next.push({ name: projectName, slug, creatureId, mapPosition, showOnMap, createdAt: new Date().toISOString() });
        return next;
      });
      resultId = slug;
    } else {
      const isEmoji = labels.has("asset:emoji") || event.issue.title.startsWith("[表情管理]");
      const isCalendarIcon =
        labels.has("asset:calendar-icon") || event.issue.title.startsWith("[记录球管理]");
      if (!isEmoji && !isCalendarIcon) throw new Error("无法识别素材管理表单类型");
      const id = assertSafeId(z.string().parse(getField(fields, isEmoji ? "表情 ID" : "记录球 ID")));
      const name = z.string().min(1).max(64).parse(getField(fields, "名称"));
      const operation = getField(fields, "操作") ?? "新增";
      const urls = extractImageUrls(getField(fields, "图片"));
      const dataFile = path.join(process.cwd(), "src", "data", isEmoji ? "emojis.json" : "calendar-icons.json");
      const existingItems = JSON.parse(await readFile(dataFile, "utf8")) as Array<Record<string, unknown>>;
      const existing = existingItems.find((item) => item.id === id);
      if ((operation === "启用" || operation === "停用") && !existing) {
        throw new Error(`找不到要${operation}的素材：${id}`);
      }
      await updateJson<Record<string, unknown>>(dataFile, (items) => {
        const existing = items.find((item) => item.id === id);
        if ((operation === "启用" || operation === "停用") && existing) {
          existing.enabled = operation === "启用";
          return items;
        }
        return items;
      });
      if (operation !== "启用" && operation !== "停用") {
        if (!urls[0]) throw new Error("新增或替换素材时必须上传图片");
        const extension = isEmoji ? "webp" : "png";
        const publicPath = await downloadManagedAsset(
          urls[0],
          [isEmoji ? "emojis" : "calendar-icons"],
          `${id}.${extension}`,
          { kind: isEmoji ? "emoji" : "calendar-icon" }
        );
        await updateJson<Record<string, unknown>>(dataFile, (items) => {
          const next = items.filter((item) => item.id !== id);
          next.push({
            id,
            name,
            path: publicPath,
            enabled: true,
            ...(isEmoji ? { createdAt: new Date().toISOString() } : {})
          });
          return next;
        });
      }
      resultId = id;
    }
    await validateAssetLicenses();
    await setActionOutput("result_id", resultId);
    await setActionOutput("process_kind", processKind);
  } catch (error) {
    await reportProcessingFailure(event.issue.number, error);
    process.exitCode = 1;
  }
}

await main();
