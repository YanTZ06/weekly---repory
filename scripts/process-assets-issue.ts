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
    const isProject = labels.has("asset:project") || event.issue.title.startsWith("[项目灵兽管理]");
    if (isProject) {
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
    } else {
      const isEmoji = labels.has("asset:emoji") || event.issue.title.startsWith("[表情管理]");
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
    }
    await validateAssetLicenses();
  } catch (error) {
    await reportProcessingFailure(event.issue.number, error);
    process.exitCode = 1;
  }
}

await main();
