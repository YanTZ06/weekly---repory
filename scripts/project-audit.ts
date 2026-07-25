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
  "src/components/manage/ManagementConsole.astro",
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
  "scripts/process-management-dispatch.ts",
  "scripts/content-validator.ts",
  "scripts/asset-license-validator.ts",
  "scripts/asset-dimension-validator.ts",
  "src/config/manage-forms.ts",
  "worker/src/index.ts",
  "worker/src/token.ts",
  "worker/wrangler.jsonc",
  "worker/tsconfig.json",
  "worker/worker-configuration.d.ts",
  "worker/.dev.vars.example",
  "pnpm-workspace.yaml",
  ".github/workflows/process-management-dispatch.yml",
  ".github/workflows/validate-content.yml",
  ".github/workflows/deploy-pages.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  "README.md",
  "ATTRIBUTIONS.md",
  "LICENSE"
];

const REQUIRED_DEPENDENCIES = ["astro", "date-fns", "zod", "sharp", "photoswipe", "pagefind", "vitest", "wrangler"];
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
  assert.equal(issueForms.length, 0, "不得保留会公开管理内容的 Issue Form");
  parseYaml(await readFile(path.join(root, ".github", "ISSUE_TEMPLATE", "config.yml"), "utf8"));

  const workflowDirectory = path.join(root, ".github", "workflows");
  const workflows = (await readdir(workflowDirectory)).filter((name) => name.endsWith(".yml"));
  assert.equal(workflows.length, 3, "应包含私密管理、验证和部署三个工作流");
  for (const name of workflows) parseYaml(await readFile(path.join(workflowDirectory, name), "utf8"));

  const managementWorkflow = await readFile(
    path.join(workflowDirectory, "process-management-dispatch.yml"),
    "utf8"
  );
  assert.ok(managementWorkflow.includes("repository_dispatch"), "管理工作流必须使用私密派发事件");
  assert.ok(!managementWorkflow.includes("issues:"), "管理工作流不得使用公开 Issue 事件");
  assert.ok(managementWorkflow.includes("github.actor == vars.OWNER_LOGIN"), "管理工作流必须校验所有者");
  assert.ok(managementWorkflow.includes("actions: write"), "管理工作流必须具有触发部署工作流的权限");
  assert.ok(managementWorkflow.includes("gh workflow run deploy-pages.yml"), "管理工作流必须触发 Pages 部署");
  assert.ok(
    managementWorkflow.indexOf("git push") < managementWorkflow.indexOf("gh workflow run deploy-pages.yml"),
    "管理工作流必须在推送内容后触发 Pages 部署"
  );

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
  const deployWorkflow = await readFile(path.join(workflowDirectory, "deploy-pages.yml"), "utf8");
  assert.ok(deployWorkflow.includes("PUBLIC_MANAGE_API_URL"), "Pages 构建必须注入管理 Worker 地址");
  const workerSource = await readFile(path.join(root, "worker", "src", "index.ts"), "utf8");
  for (const boundary of ["OWNER_LOGIN", "ALLOWED_ORIGIN", "SESSION_SECRET", "GITHUB_DISPATCH_TOKEN"]) {
    assert.ok(workerSource.includes(boundary), `授权 Worker 缺少安全边界：${boundary}`);
  }
  assert.ok(!workerSource.includes("/api/issues"), "授权 Worker 不得创建公开 Issue");

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
  console.log("项目结构、静态前台、授权 Worker 与私密管理派发语义审计通过。");
}
