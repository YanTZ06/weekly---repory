import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assertHttpsImageUrl } from "../src/utils/security";

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  "github.com",
  "githubusercontent.com",
  "user-images.githubusercontent.com",
  "private-user-images.githubusercontent.com",
  "objects.githubusercontent.com"
]);

export interface ProcessedImage {
  absolutePath: string;
  publicPath: string;
}

export interface ManagedAssetOptions {
  kind: "emoji" | "calendar-icon" | "tag-icon";
}

async function download(urlValue: string): Promise<{ buffer: Buffer; extension: string }> {
  const url = assertHttpsImageUrl(urlValue);
  if (!ALLOWED_HOSTS.has(url.hostname) && !url.hostname.endsWith(".githubusercontent.com")) {
    throw new Error(`不允许从该域名下载图片：${url.hostname}`);
  }
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`图片下载失败：HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_SOURCE_BYTES) throw new Error("图片超过 12 MB 限制");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_SOURCE_BYTES) throw new Error("图片超过 12 MB 限制");
  const extension = path.extname(url.pathname).toLowerCase();
  return { buffer, extension };
}

export async function processReportImages(
  urls: string[],
  item: { id: string; weekYear: number; week: number },
  root = process.cwd()
): Promise<ProcessedImage[]> {
  if (urls.length > 9) throw new Error("每条事项最多上传 9 张图片");
  const relativeDirectory = path.join("public", "assets", "reports", String(item.weekYear), `W${String(item.week).padStart(2, "0")}`);
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  if (!absoluteDirectory.startsWith(path.resolve(root))) throw new Error("图片目录越界");
  await mkdir(absoluteDirectory, { recursive: true });

  const output: ProcessedImage[] = [];
  for (const [index, url] of urls.entries()) {
    const { buffer, extension } = await download(url);
    const sequence = String(index + 1).padStart(2, "0");
    if (extension === ".gif") {
      const filename = `${item.id}-${sequence}.gif`;
      const absolutePath = path.join(absoluteDirectory, filename);
      await sharp(buffer, { animated: true, limitInputPixels: 40_000_000 }).metadata();
      await writeFile(absolutePath, buffer, { flag: "wx" });
      output.push({ absolutePath, publicPath: `/assets/reports/${item.weekYear}/W${String(item.week).padStart(2, "0")}/${filename}` });
      continue;
    }
    const filename = `${item.id}-${sequence}.webp`;
    const absolutePath = path.join(absoluteDirectory, filename);
    await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(absolutePath);
    output.push({ absolutePath, publicPath: `/assets/reports/${item.weekYear}/W${String(item.week).padStart(2, "0")}/${filename}` });
  }
  return output;
}

export async function processAvatar(
  urlValue: string,
  root = process.cwd()
): Promise<{ animated: boolean; path: string }> {
  const { buffer, extension } = await download(urlValue);
  const directory = path.resolve(root, "public", "assets", "profile");
  await mkdir(directory, { recursive: true });
  const metadata = await sharp(buffer, { animated: true }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取头像尺寸");
  if (metadata.width > 1024 || metadata.height > 1024) throw new Error("头像尺寸不能超过 1024×1024");
  const animated = extension === ".gif" || (metadata.pages ?? 1) > 1;
  if (animated) {
    const targetExtension = extension === ".gif" ? "gif" : "webp";
    const filename = `avatar-original.${targetExtension}`;
    await writeFile(path.join(directory, filename), buffer);
    return { animated: true, path: `/assets/profile/${filename}` };
  }
  await sharp(buffer).png().toFile(path.join(directory, "avatar-original.png"));
  for (const size of [32, 64, 96, 128]) {
    await sharp(buffer)
      .resize(size, size, { fit: "contain", kernel: sharp.kernel.nearest })
      .png({ palette: true })
      .toFile(path.join(directory, `avatar-${size}.png`));
  }
  return { animated: false, path: "/assets/profile/avatar-64.png" };
}

export async function downloadManagedAsset(
  urlValue: string,
  directoryParts: string[],
  filename: string,
  options: ManagedAssetOptions,
  root = process.cwd()
): Promise<string> {
  if (!/^[a-z0-9][a-z0-9-]*\.(?:png|webp|gif)$/i.test(filename)) throw new Error("不安全的素材文件名");
  const { buffer } = await download(urlValue);
  const directory = path.resolve(root, "public", "assets", ...directoryParts);
  if (!directory.startsWith(path.resolve(root, "public", "assets"))) throw new Error("素材目录越界");
  await mkdir(directory, { recursive: true });
  const output = path.join(directory, filename);
  const image = sharp(buffer, { animated: options.kind === "emoji", limitInputPixels: 20_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取素材尺寸");
  if (metadata.width > 2048 || metadata.height > 2048) throw new Error("素材尺寸不能超过 2048×2048");
  const size = options.kind === "calendar-icon" ? 32 : 24;
  const pipeline = sharp(buffer, { animated: options.kind === "emoji", limitInputPixels: 20_000_000 })
    .resize(size, size, {
      fit: "contain",
      kernel: sharp.kernel.nearest,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
  if (options.kind === "calendar-icon" || options.kind === "tag-icon") {
    await pipeline.png({ palette: true, compressionLevel: 9 }).toFile(output);
  } else {
    await pipeline.webp({ lossless: true, effort: 5 }).toFile(output);
  }
  return `/assets/${[...directoryParts, filename].join("/")}`;
}
