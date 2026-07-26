import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

interface ExpectedAsset {
  relativePath: string;
  width: number;
  height: number;
  alpha?: boolean;
}

const EXPECTED_ASSETS: ExpectedAsset[] = [
  { relativePath: "profile/avatar-32.png", width: 32, height: 32, alpha: true },
  { relativePath: "profile/avatar-64.png", width: 64, height: 64, alpha: true },
  { relativePath: "profile/avatar-96.png", width: 96, height: 96, alpha: true },
  { relativePath: "profile/avatar-128.png", width: 128, height: 128, alpha: true },
  { relativePath: "creatures/mechanical/mechanical-01.png", width: 64, height: 64, alpha: true },
  { relativePath: "creatures/mechanical/mechanical-01-large.png", width: 128, height: 128, alpha: true },
  { relativePath: "creatures/water/water-01.png", width: 64, height: 64, alpha: true },
  { relativePath: "creatures/water/water-01-large.png", width: 128, height: 128, alpha: true },
  { relativePath: "creatures/nature/nature-01.png", width: 64, height: 64, alpha: true },
  { relativePath: "creatures/nature/nature-01-large.png", width: 128, height: 128, alpha: true },
  { relativePath: "creatures/fire/fire-01.png", width: 64, height: 64, alpha: true },
  { relativePath: "creatures/fire/fire-01-large.png", width: 128, height: 128, alpha: true },
  { relativePath: "emojis/soc.webp", width: 24, height: 24, alpha: true },
  { relativePath: "emojis/code-terminal.webp", width: 24, height: 24, alpha: true },
  { relativePath: "emojis/reading-book.webp", width: 24, height: 24, alpha: true },
  { relativePath: "emojis/idea-lamp.webp", width: 24, height: 24, alpha: true },
  { relativePath: "emojis/achievement-star.webp", width: 24, height: 24, alpha: true },
  { relativePath: "emojis/research-flask.webp", width: 24, height: 24, alpha: true },
  { relativePath: "emojis/coffee-break.webp", width: 24, height: 24, alpha: true },
  { relativePath: "buildings/academy-tile.png", width: 192, height: 128 },
  { relativePath: "map/village-preview.png", width: 384, height: 256 },
  { relativePath: "og/huizhou-weekly-preview.png", width: 1280, height: 720 }
];

const CALENDAR_ICON_FILES = [
  "red-flame.png",
  "blue-stream.png",
  "gold-harvest.png",
  "ink-jade.png",
  "cloud-pattern.png",
  "lotus.png",
  "star-moon.png",
  "huizhou-pattern.png"
];

const TAG_ICON_FILES = ["mechanical.png", "scroll.png", "star.png", "mountain.png"];

async function assertAsset(assetRoot: string, expected: ExpectedAsset): Promise<void> {
  const target = path.join(assetRoot, ...expected.relativePath.split("/"));
  const metadata = await sharp(target).metadata();
  assert.equal(metadata.width, expected.width, `${expected.relativePath} 宽度应为 ${expected.width}`);
  assert.equal(metadata.height, expected.height, `${expected.relativePath} 高度应为 ${expected.height}`);
  if (expected.alpha) assert.equal(metadata.hasAlpha, true, `${expected.relativePath} 必须保留透明通道`);
}

function publicPathToAsset(assetRoot: string, publicPath: string): string {
  if (!publicPath.startsWith("/assets/")) throw new Error(`素材路径必须位于 /assets/：${publicPath}`);
  return path.join(assetRoot, ...publicPath.replace(/^\/assets\//, "").split("/"));
}

async function assertPublicAsset(
  assetRoot: string,
  publicPath: string,
  width: number,
  height: number,
  alpha = true
): Promise<void> {
  const metadata = await sharp(publicPathToAsset(assetRoot, publicPath)).metadata();
  assert.equal(metadata.width, width, `${publicPath} 宽度应为 ${width}`);
  assert.equal(metadata.height, height, `${publicPath} 高度应为 ${height}`);
  if (alpha) assert.equal(metadata.hasAlpha, true, `${publicPath} 必须保留透明通道`);
}

async function assertExactNearestScale(source: string, scaled: string, factor: number): Promise<void> {
  const sourcePixels = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const scaledPixels = await sharp(scaled)
    .resize(sourcePixels.info.width, sourcePixels.info.height, { kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(
    scaledPixels.info.width * factor,
    (await sharp(scaled).metadata()).width,
    `${path.basename(scaled)} 不是 ${factor} 倍整数缩放`
  );
  for (const buffer of [sourcePixels.data, scaledPixels.data]) {
    for (let index = 0; index < buffer.length; index += 4) {
      if (buffer[index + 3] === 0) {
        buffer[index] = 0;
        buffer[index + 1] = 0;
        buffer[index + 2] = 0;
      }
    }
  }
  assert.equal(
    scaledPixels.data.equals(sourcePixels.data),
    true,
    `${path.basename(scaled)} 必须使用最近邻整数缩放`
  );
}

export async function validateAssetDimensions(root = process.cwd()): Promise<void> {
  const assetRoot = path.join(root, "public", "assets");
  await Promise.all(EXPECTED_ASSETS.map((asset) => assertAsset(assetRoot, asset)));
  await Promise.all(
    CALENDAR_ICON_FILES.map((filename) =>
      assertAsset(assetRoot, { relativePath: `calendar-icons/${filename}`, width: 32, height: 32, alpha: true })
    )
  );
  await Promise.all(
    TAG_ICON_FILES.map((filename) =>
      assertAsset(assetRoot, { relativePath: `tag-icons/${filename}`, width: 24, height: 24, alpha: true })
    )
  );

  for (const kind of ["mechanical", "water", "nature", "fire"]) {
    await assertExactNearestScale(
      path.join(assetRoot, "creatures", kind, `${kind}-01.png`),
      path.join(assetRoot, "creatures", kind, `${kind}-01-large.png`),
      2
    );
  }
  await assertExactNearestScale(
    path.join(assetRoot, "profile", "avatar-64.png"),
    path.join(assetRoot, "profile", "avatar-128.png"),
    2
  );
  await assertExactNearestScale(
    path.join(assetRoot, "profile", "avatar-32.png"),
    path.join(assetRoot, "profile", "avatar-96.png"),
    3
  );

  const creatures = JSON.parse(
    await readFile(path.join(root, "src", "data", "creatures.json"), "utf8")
  ) as Array<{ id: string; sprite: string; largeSprite: string }>;
  const calendarIcons = JSON.parse(
    await readFile(path.join(root, "src", "data", "calendar-icons.json"), "utf8")
  ) as Array<{ id: string; path: string }>;
  const tags = JSON.parse(await readFile(path.join(root, "src", "data", "tags.json"), "utf8")) as Array<{
    id: string;
    icon: string;
  }>;
  const emojis = JSON.parse(await readFile(path.join(root, "src", "data", "emojis.json"), "utf8")) as Array<{
    id: string;
    path: string;
  }>;
  const profile = JSON.parse(await readFile(path.join(root, "src", "data", "profile.json"), "utf8")) as {
    avatar: { path: string; animated: boolean };
  };

  await Promise.all([
    ...creatures.flatMap((creature) => [
      assertPublicAsset(assetRoot, creature.sprite, 64, 64),
      assertPublicAsset(assetRoot, creature.largeSprite, 128, 128)
    ]),
    ...calendarIcons.map((icon) => assertPublicAsset(assetRoot, icon.path, 32, 32)),
    ...tags.map((tag) => assertPublicAsset(assetRoot, tag.icon, 24, 24)),
    ...emojis.map((emoji) => assertPublicAsset(assetRoot, emoji.path, 24, 24))
  ]);

  const profilePath = publicPathToAsset(assetRoot, profile.avatar.path);
  const profileMetadata = await sharp(profilePath, { animated: profile.avatar.animated }).metadata();
  assert.ok(profileMetadata.width && profileMetadata.height, "无法读取当前头像尺寸");
  assert.ok(profileMetadata.width <= 1024 && profileMetadata.height <= 1024, "当前头像不能超过 1024×1024");

  const referencedPaths = [
    profile.avatar.path,
    ...creatures.flatMap((creature) => [creature.sprite, creature.largeSprite]),
    ...calendarIcons.map((icon) => icon.path),
    ...tags.map((tag) => tag.icon),
    ...emojis.map((emoji) => emoji.path)
  ];
  await Promise.all(
    referencedPaths.map((publicPath) =>
      access(path.join(root, "public", ...publicPath.replace(/^\/+/, "").split("/")))
    )
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await validateAssetDimensions();
  console.log("像素资源尺寸、透明通道、引用路径和整数倍最近邻缩放校验通过。");
}
