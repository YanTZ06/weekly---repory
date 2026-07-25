import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REQUIRED_FILES = [
  "astro.config.mjs",
  "src/content.config.ts",
  "src/layouts/BaseLayout.astro",
  "src/components/map/VillageMap.astro",
  "src/components/map/MapLayer.astro",
  "src/components/map/MapBuilding.astro",
  "src/components/map/MapHotspot.astro",
  "src/components/map/MapCreature.astro",
  "src/components/map/PlayerAvatar.astro",
  "src/components/map/CharacterDialog.astro",
  "src/components/map/BuildingTooltip.astro",
  "src/components/common/QuickNavigation.astro",
  "src/components/map/ReturnToGateButton.astro",
  "src/components/map/SeasonOverlay.astro",
  "src/components/map/DayNightOverlay.astro",
  "src/components/reports/WeeklyReportPage.astro",
  "src/components/reports/WeeklyReportCard.astro",
  "src/components/reports/CategorySection.astro",
  "src/components/reports/ReportItem.astro",
  "src/components/creatures/ProjectCreatureBadge.astro",
  "src/components/common/TagBadge.astro",
  "src/components/reports/EmojiDisplay.astro",
  "src/components/reports/CalendarIconDisplay.astro",
  "src/components/reports/ImageGrid.astro",
  "src/components/reports/ImageLightbox.astro",
  "src/components/calendar/CalendarBoard.astro",
  "src/components/calendar/CalendarCell.astro",
  "src/components/calendar/CalendarMonthNavigation.astro",
  "src/components/creatures/ProjectCreaturePanel.astro",
  "src/components/creatures/CreatureDex.astro",
  "src/components/creatures/CreatureCard.astro",
  "src/components/comments/GiscusComments.astro",
  "src/components/search/SearchBox.astro",
  "src/components/search/SearchResults.astro",
  "src/components/common/PixelWindow.astro",
  "src/components/common/PixelButton.astro",
  "src/components/common/PixelSignboard.astro",
  "src/components/common/ExternalLinks.astro",
  "src/components/common/ThemeToggle.astro",
  "src/pages/index.astro",
  "src/pages/reports/index.astro",
  "src/pages/reports/[weekYear]/[week].astro",
  "src/pages/calendar/index.astro",
  "src/pages/projects/index.astro",
  "src/pages/projects/[slug].astro",
  "src/pages/tags/index.astro",
  "src/pages/tags/[slug].astro",
  "src/pages/search/index.astro",
  "src/pages/about/index.astro",
  "src/pages/manage/index.astro",
  "src/pages/404.astro",
  "scripts/issue-parser.ts",
  "scripts/markdown-generator.ts",
  "scripts/github-utils.ts",
  "scripts/image-processor.ts",
  "scripts/process-report-issue.ts",
  "scripts/process-profile-issue.ts",
  "scripts/process-assets-issue.ts",
  "scripts/finalize-issue.ts",
  "scripts/content-validator.ts",
  "scripts/asset-license-validator.ts",
  "scripts/asset-dimension-validator.ts",
  ".github/workflows/process-report-issue.yml",
  ".github/workflows/process-profile-issue.yml",
  ".github/workflows/process-assets-issue.yml",
  ".github/workflows/validate-content.yml",
  ".github/workflows/deploy-pages.yml",
  ".github/ISSUE_TEMPLATE/add-tag.yml",
  "README.md",
  "ATTRIBUTIONS.md",
  "LICENSE"
];

const REQUIRED_DEPENDENCIES = ["astro", "date-fns", "zod", "sharp", "photoswipe", "pagefind", "vitest"];
const FORBIDDEN_BACKEND_DEPENDENCIES = [
  "express",
  "fastify",
  "hono",
  "koa",
  "prisma",
  "@prisma/client",
  "mongoose",
  "pg",
  "mysql",
  "mysql2",
  "redis",
  "sqlite3",
  "better-sqlite3",
  "firebase",
  "@supabase/supabase-js"
];

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function auditProject(root = process.cwd()): Promise<void> {
  const missing = (
    await Promise.all(
      REQUIRED_FILES.map(async (relativePath) => ({
        relativePath,
        exists: await exists(path.join(root, ...relativePath.split("/")))
      }))
    )
  )
    .filter((entry) => !entry.exists)
    .map((entry) => entry.relativePath);
  assert.deepEqual(missing, [], `缺少提示词要求的文件：${missing.join(", ")}`);

  const issueForms = (await readdir(path.join(root, ".github", "ISSUE_TEMPLATE")))
    .filter((name) => name.endsWith(".yml") && name !== "config.yml");
  assert.equal(issueForms.length, 8, "应包含 8 个 Issue Form 和 1 个 config.yml");
  for (const name of [...issueForms, "config.yml"]) {
    parseYaml(await readFile(path.join(root, ".github", "ISSUE_TEMPLATE", name), "utf8"));
  }

  const workflowDirectory = path.join(root, ".github", "workflows");
  const workflows = (await readdir(workflowDirectory)).filter((name) => name.endsWith(".yml"));
  assert.equal(workflows.length, 5, "应包含 3 个管理工作流、1 个验证工作流和 1 个部署工作流");
  for (const name of workflows) parseYaml(await readFile(path.join(workflowDirectory, name), "utf8"));

  for (const name of ["process-report-issue.yml", "process-profile-issue.yml", "process-assets-issue.yml"]) {
    const source = await readFile(path.join(workflowDirectory, name), "utf8");
    assert.ok(source.includes("OWNER_LOGIN"), `${name} 必须校验 OWNER_LOGIN`);
    assert.ok(source.includes("steps.process.outputs.skip"), `${name} 必须跳过未授权写操作`);
    assert.ok(source.indexOf("git push") < source.indexOf("finalize-issue.ts"), `${name} 必须在推送后关闭 Issue`);
    assert.ok(source.includes("actions: write"), `${name} 必须具有触发部署工作流的权限`);
    assert.ok(source.includes("gh workflow run deploy-pages.yml"), `${name} 必须在内容更新后触发 Pages 部署`);
    assert.ok(
      source.indexOf("git push") < source.indexOf("gh workflow run deploy-pages.yml"),
      `${name} 必须在推送内容后触发 Pages 部署`
    );
  }

  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const packages = { ...packageJson.dependencies, ...packageJson.devDependencies };
  for (const dependency of REQUIRED_DEPENDENCIES) {
    assert.ok(packages[dependency], `缺少依赖：${dependency}`);
  }
  for (const dependency of FORBIDDEN_BACKEND_DEPENDENCIES) {
    assert.equal(packages[dependency], undefined, `静态站点不得引入后端依赖：${dependency}`);
  }
  const buildScript = packageJson.scripts.build;
  assert.ok(buildScript, "缺少 build 脚本");
  assert.ok(buildScript.includes("pagefind"), "构建流程必须生成 Pagefind 索引");
  assert.ok(buildScript.includes("validate:dimensions"), "构建流程必须校验像素资源");
  assert.ok(!buildScript.includes("assets:generate"), "常规构建不得覆盖仓库中已管理的素材");

  const astroConfig = await readFile(path.join(root, "astro.config.mjs"), "utf8");
  assert.match(astroConfig, /output:\s*["']static["']/, "Astro 必须使用纯静态输出");
  assert.equal(await exists(path.join(root, "src", "pages", "api")), false, "不得创建服务端 API 路由");

  for (const dataFile of [
    "profile.json",
    "projects.json",
    "tags.json",
    "creatures.json",
    "emojis.json",
    "calendar-icons.json",
    "map-config.json"
  ]) {
    JSON.parse(await readFile(path.join(root, "src", "data", dataFile), "utf8"));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await auditProject();
  console.log("项目结构、静态架构、Issue Forms 与提交后关闭语义审计通过。");
}
