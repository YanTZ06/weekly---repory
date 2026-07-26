# YanTZ的周记

一个以 GitHub 为内容仓库的单用户个人周报系统。首页不是传统博客列表，而是一座可横向探索的明亮像素徽州村落：书院保存周报，告示栏展示日历，灵兽馆整理项目，百宝阁收纳标签，藏书楼提供本地搜索，管理小屋提供经过 GitHub 身份验证的站内编辑控制台。

> 公开页面仍是纯静态站点，没有数据库。一个最小化的 Cloudflare Worker 只负责 GitHub OAuth、所有者白名单校验和发送私密管理请求；内容、图片和历史版本仍保存在 GitHub 仓库，表单正文不会进入公开 Issues。

## 功能列表

- 分层、可拖动、可触控滑动的像素徽州村落地图。
- 建筑可点击，同时保留标准桌面导航和移动端导航。
- 白天/夜晚主题、季节装饰、动画开关和 `prefers-reduced-motion`。
- 个人像素头像、固定站位、整数倍缩放和主人信息弹窗。
- 项目与原创像素灵兽绑定，项目图鉴和项目事项时间线。
- 标签与像素属性徽章绑定。
- 每条事项一个主表情和一个独立日历记录球。
- 按 ISO week-year 与 ISO 周自动聚合周报，周一为每周第一天。
- 月视图日历、年月切换、当天记录球和事项数量。
- 1–9 张图片网格与 PhotoSwipe 灯箱。
- Pagefind 浏览器本地全文搜索。
- giscus 整周评论；未配置时不影响构建。
- `published`、`hidden`、`deleted` 三种状态和软删除。
- GitHub OAuth 登录状态、`YanTZ06` 服务端白名单和站内直接管理表单。
- 八类站内管理表单、一个私密派发工作流、验证工作流和 Pages 部署工作流。
- Vitest 覆盖日期、聚合、解析、安全和路径等核心逻辑。

## 世界观与视觉

像素画负责建筑、角色、灵兽、记录球、边框和动画；明亮冒险配色负责天空、水面、植物和状态反馈；白墙黛瓦、马头墙、石桥、水巷、牌坊、书院与木窗负责空间结构。深色模式不是简单反色，而是夜晚村落：深蓝天空、暗水面和暖色灯光。

默认视觉资源均为项目内程序化原创占位资源，不包含官方宝可梦、星露谷物语角色、官方精灵球、游戏贴图或其他第三方游戏素材。

## 技术栈

- Astro 7 + TypeScript
- Astro Content Collections + Zod
- date-fns
- Sharp
- Vitest
- Pagefind
- PhotoSwipe
- GitHub Pages / Actions / Repository Dispatch / Discussions / giscus
- Cloudflare Workers / GitHub OAuth

## 本地开发

### Node.js 版本

推荐 Node.js 24，最低版本见 `package.json` 的 `engines` 字段。

### 安装依赖

项目提交 `pnpm-lock.yaml` 时推荐：

```bash
pnpm install
```

也可以使用 npm：

```bash
npm install
```

### 重新生成默认原创像素资源

```bash
pnpm run assets:generate
```

仓库已提交可直接使用的默认资源，通常不需要执行此命令。它会重绘并覆盖默认头像、灵兽、记录球、标签图标和分享图，仅适合初始化或主动恢复默认视觉；常规构建不会覆盖通过站内管理流程上传的素材。

默认资源使用真正的原生像素稿，而不是先画低分辨率再做 1.5 倍模糊放大：

| 资源 | 原生/输出尺寸 | 缩放规则 |
| --- | --- | --- |
| 地图头像 | 64×64，另有 32/96/128 版本 | 32→96 为 3 倍；64→128 为 2 倍 |
| 项目灵兽 | 64×64 与 128×128 | 大图严格为 2 倍最近邻 |
| 记录球 | 32×32 | 页面按 32×32 显示 |
| 标签徽章 | 24×24 | 页面按 24×24 显示 |
| 分享预览图 | 1280×720 | 由 640×360 像素稿按 2 倍最近邻生成 |

可以单独验证尺寸、透明通道、配置引用和整数倍缩放：

```bash
pnpm run validate:dimensions
```

### 启动开发服务器

```bash
pnpm run dev
```

### 测试

```bash
pnpm run test
```

### 类型与 Astro 检查

```bash
pnpm run check
```

### 构建

```bash
pnpm run build
```

构建流程会依次校验像素资源尺寸、校验内容与素材授权、生成 Astro 静态站点并创建 Pagefind 索引。资源文件直接来自仓库，构建不会覆盖管理员上传的头像、表情或记录球。

## GitHub Pages 配置

1. 新建 GitHub 仓库并把本项目推送到 `main`。
2. 打开仓库 `Settings → Pages`。
3. 在 `Build and deployment` 中将 Source 设为 `GitHub Actions`。
4. 在仓库 Actions 设置中允许工作流读写仓库内容。
5. 推送到 `main` 或手动运行 `Deploy GitHub Pages`。

`astro.config.mjs` 会在 GitHub Actions 中从 `GITHUB_REPOSITORY` 自动推导项目站点 base path，例如 `/weekly-report/`。如需覆盖，设置构建环境变量 `PUBLIC_BASE_PATH`。

## GitHub Actions 权限

在 `Settings → Actions → General → Workflow permissions` 中选择 `Read and write permissions`。私密管理工作流只声明：

```yaml
permissions:
  actions: write
  contents: write
```

Pages 工作流只声明读取代码、写入 Pages 和 OIDC 所需权限。

## Cloudflare Worker 管理授权配置

管理页不会读取或保存 GitHub 密码。Worker 完成 OAuth 回调后，只给仓库所有者签发一个两小时有效的短时管理令牌；GitHub OAuth 密钥和仓库派发令牌始终保存在 Cloudflare Secrets 中。

### 1. 确认 Worker 地址

当前生产 Worker 已创建，地址为：

```text
https://yantz-weekly-manage-api.yantz06-weekly.workers.dev
```

### 2. 创建 GitHub OAuth App

打开 `GitHub → Settings → Developer settings → OAuth Apps → New OAuth App`：

```text
Application name: YanTZ Weekly Management
Homepage URL: https://yantz06.github.io/weekly---repory/
Authorization callback URL: https://yantz-weekly-manage-api.yantz06-weekly.workers.dev/auth/callback
```

创建后保存 `Client ID`，并生成一个 `Client Secret`。

### 3. 创建最小权限派发令牌

创建 Fine-grained personal access token：

- Repository access：只选择 `YanTZ06/weekly---repory`
- Repository permissions：`Contents → Read and write`
- 其他权限保持默认最小值

### 4. 写入 Cloudflare Secrets

依次执行并按提示粘贴对应值：

```powershell
pnpm exec wrangler secret put GITHUB_OAUTH_CLIENT_ID --config worker/wrangler.jsonc
pnpm exec wrangler secret put GITHUB_OAUTH_CLIENT_SECRET --config worker/wrangler.jsonc
pnpm exec wrangler secret put GITHUB_DISPATCH_TOKEN --config worker/wrangler.jsonc
pnpm exec wrangler secret put SESSION_SECRET --config worker/wrangler.jsonc
```

`SESSION_SECRET` 可使用下面的 PowerShell 命令生成：

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

设置后重新部署：

```powershell
pnpm run worker:deploy
```

### 5. 连接 GitHub Pages

在仓库 `Settings → Secrets and variables → Actions → Variables` 中添加：

```text
PUBLIC_MANAGE_API_URL=https://yantz-weekly-manage-api.yantz06-weekly.workers.dev
```

然后手动运行一次 `Deploy GitHub Pages`，或再推送一次提交。管理页第一次使用时需要点击“使用 GitHub 验证身份”；验证成功后的两小时内，同一浏览器会自动恢复短时授权。账号不是 `YanTZ06`、授权过期或没有授权时，页面只显示“你没有权限更改”。

本地联调时，复制 `worker/.dev.vars.example` 为 `worker/.dev.vars` 并填入测试值，然后运行：

```powershell
pnpm run worker:dev
```

## OWNER_LOGIN 配置

在 `Settings → Secrets and variables → Actions → Variables` 中创建：

```text
OWNER_LOGIN=你的 GitHub 用户名
```

私密管理工作流在写入仓库前会同时校验触发账号和请求中的所有者：

```text
github.actor == OWNER_LOGIN
```

非所有者无法从管理页获得短时令牌；即使绕过前端，Worker 与 Actions 的两层所有者校验也会阻止写入。

## GitHub Discussions 与 giscus

1. 打开 `Settings → General → Features`，启用 Discussions。
2. 安装 [Giscus GitHub App](https://github.com/apps/giscus)，并授权仓库 `YanTZ06/weekly---repory`。
3. 使用默认的 `Announcements` 分类，或创建一个用于周报评论的公告类型分类。
4. 在 [giscus.app](https://giscus.app/zh-CN) 输入 `YanTZ06/weekly---repory`，分类选择上一步的分类，映射方式选择 `pathname`，启用严格匹配、回应和懒加载。
5. 在 `Settings → Secrets and variables → Actions → Variables` 中提供生成代码里的分类 ID：

```text
PUBLIC_GISCUS_CATEGORY_ID
```

仓库名与仓库 ID 已内置，分类默认使用 `Announcements`；使用其他分类时，再增加 `PUBLIC_GISCUS_CATEGORY`。

未配置时周报详情页显示“驿站正在开门准备中”，构建不会失败。评论者必须登录 GitHub；点赞和其他回应使用 GitHub Discussions 原生能力。

## 站内私密管理使用方法

访问站点 `/manage/`，通过 GitHub 身份验证后可以直接填写八类管理表单。Worker 校验请求后通过 GitHub Repository Dispatch 触发工作流，不创建公开 Issue。处理流程为：

```text
验证 GitHub 身份 → Worker 所有者白名单 → 私密派发 → Actions 再次校验触发者
→ 解析字段 → 处理图片 → 内容/测试校验 → 单次 Git 提交 → 触发 Pages 部署
```

失败时不会提交，输入内容也不会写入公开日志。管理工作流使用 `workflow_dispatch` 主动触发 Pages 部署，因为由 `GITHUB_TOKEN` 推送的提交本身不会再次触发普通 `push` 工作流。

### 新增事项

选择“新增周报事项”，填写日期、分类、纯文本内容、项目、标签、表情、记录球和最多 9 张图片。文件 ID 与文件名由脚本生成，Issue 内容不能控制路径。

### 新增标签

选择“新增标签”，填写标签名称、URL 标识和 `#RRGGBB` 颜色。图标可以复用 `mechanical`、`scroll`、`star`、`mountain`，也可以上传新图片；上传图片会被自动转换为 24×24 透明 PNG。创建成功后，在新增或修改周报事项时填写完全一致的标签名称即可。

### 修改事项

选择“修改已有事项”并填写事项 ID。留空字段保留原值；若修改日期，文件会移动到正确的 ISO 周目录。

### 隐藏、删除和恢复

- 隐藏：状态变为 `hidden`。
- 放入回收站：状态变为 `deleted`。
- 恢复公开：状态变为 `published`。

不会物理删除 Markdown 文件；Git 历史长期保留全部版本。

## 上传像素头像

在“更新个人资料”表单中上传 PNG、WebP、GIF 或动画 WebP。不接受 SVG。静态头像由 Sharp 生成 32、64、96、128 像素版本，使用最近邻插值；动画头像保存原文件并通过 CSS 整数倍缩放。

建议原生尺寸为 64×64，透明背景，避免快速闪烁。地图站位支持：

```text
village-gate
waterside-courtyard
academy-door
stone-bridge
lotus-pond
```

## 管理自定义表情

通过“管理自定义表情”表单新增、替换、启用或停用。文件保存在 `public/assets/emojis/`，配置保存在 `src/data/emojis.json`。

## 管理记录球

通过“管理记录球”表单管理 `public/assets/calendar-icons/` 和 `src/data/calendar-icons.json`。记录球必须为原创或拥有清晰授权，不要上传官方精灵球图片。

## 管理项目灵兽

项目与灵兽的绑定保存在 `src/data/projects.json`，灵兽元数据和授权信息保存在 `src/data/creatures.json`。项目详情不维护介绍、开始时间、结束时间或状态，只展示关联事项。

## 替换地图建筑素材

首页地图主体由 `src/components/map/VillageMap.astro` 和 `MapBuilding.astro` 的独立图层、CSS 像素形状及 HTML 热点构成。可替换 `public/assets/buildings/` 中的资源，但必须保留：

- 独立天空、云、远山、建筑、道路、水面、植物、角色、热点和前景层。
- 真实链接或按钮热点。
- 标准导航替代方案。
- 整数倍像素缩放和明确宽高。

不要把整张地图改成一张不可交互背景。

## 昼夜与季节配置

主题偏好保存在浏览器 `localStorage`，未设置时跟随系统。季节由当前月份推导，可在 `src/data/map-config.json` 中设置：

```json
{
  "autoSeason": true,
  "disableAnimations": false
}
```

用户可在首页关闭动画，系统的 `prefers-reduced-motion` 始终优先。

## 图片限制

- 每条事项最多 9 张。
- 接受 PNG、JPG、JPEG、WebP、GIF。
- 来源必须为 HTTPS 且限 GitHub 图片域名。
- 原图最大 12 MB、最大解析像素受 Sharp 限制。
- 静态图最长边压缩到 1920 像素并转为 WebP。
- GIF 保留动画。
- 用户输入不能控制输出目录或文件名。

## 素材授权规则

第三方素材进入仓库前必须确认原始页面与许可证。优先 CC0、CC BY、MIT 或明确允许修改和公开发布的素材。必须在 `ATTRIBUTIONS.md` 记录原始页面、作者、许可证、是否修改和使用位置。

本项目默认不包含官方宝可梦素材或其他现有游戏素材。用户自行添加素材时必须确保拥有使用权；搜索引擎缩略图、来源不明图片和未经授权的官方素材不得进入仓库。

## `ATTRIBUTIONS.md` 使用方法

每增加一项外部视觉资源，新增一行：

```text
| 资源 ID | 原始页面 | 作者 | 许可证 | 是否修改 | 使用位置 |
```

`pnpm run validate:licenses` 会检查每只灵兽的来源、作者、许可证字段，并确认归属文件包含对应 ID。

## 数据备份和迁移

整个 Git 仓库就是完整备份。迁移时克隆仓库或导出 Git bundle，保留：

```text
src/content/items/
src/data/
public/assets/
ATTRIBUTIONS.md
```

Git 提交历史包含内容的历史版本。不要只复制 `dist/`，它只是可重新生成的静态产物。

## 自定义域名

在 `public/CNAME` 中写入域名，在 DNS 服务商处配置记录，并将 `PUBLIC_SITE_URL` 设置为自定义域名。自定义域名部署时把 `PUBLIC_BASE_PATH` 设为 `/`。

## 常见问题

### 为什么搜索在开发模式不可用？

Pagefind 在 Astro 构建后索引 `dist/`。运行 `pnpm run build` 后使用静态服务器预览即可。

```bash
pnpm run preview:static
```

### giscus 没配置会失败吗？

不会。页面显示明确占位提示。

### 为什么空日期不能打开周报？

站点只为存在公开事项的 ISO 周生成周报详情。空日期仍可查看，但不会链接到不存在的档案。

### 能否让访客投稿？

第一版是单用户模式。访客可浏览和通过 giscus 评论，不能通过管理表单写入仓库。

### 能否直接删除事项文件？

管理流程只做软删除。若仓库所有者手动删除文件，历史仍可从 Git 恢复，但不属于站点推荐流程。

## 项目目录

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/          # 仅保留评论入口配置
│   └── workflows/               # 私密管理、验证和部署
├── public/assets/               # 原创像素资源与周报图片
├── scripts/                     # 私密管理、图片、校验和 GitHub 工具
├── src/
│   ├── components/
│   │   ├── calendar/
│   │   ├── comments/
│   │   ├── common/
│   │   ├── creatures/
│   │   ├── map/
│   │   ├── reports/
│   │   └── search/
│   ├── content/items/           # 一事项一 Markdown
│   ├── data/                    # 资料、项目、灵兽、标签和地图配置
│   ├── layouts/
│   ├── pages/
│   ├── styles/
│   ├── types/
│   └── utils/
├── tests/
├── astro.config.mjs
├── ATTRIBUTIONS.md
└── package.json
```

## 需要优先替换的配置

1. `.env.example` 中的 GitHub 仓库和站点地址。
2. `src/data/profile.json` 中的昵称、简介、GitHub 链接。
3. 仓库变量 `OWNER_LOGIN`。
4. giscus 的四个公开环境变量。
5. 可选：程序化原创占位头像、三只灵兽、建筑预览和八个记录球。

## 许可证

代码使用 MIT 许可证。项目内标记为 CC0-1.0 的程序化原创占位视觉资源可自由替换和使用。
