const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function assertHttpUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("外部链接只允许 HTTP 或 HTTPS");
  }
  return url;
}

export function assertHttpsImageUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("图片只允许从 HTTPS 地址下载");
  const extension = url.pathname.slice(url.pathname.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) throw new Error("不支持的图片格式");
  return url;
}

export function assertIntegerScale(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error("头像缩放倍数必须是 1 到 6 的整数");
  }
  return value;
}

export function assertKnownId<T extends { id: string }>(value: string, items: T[], label: string): string {
  if (!items.some((item) => item.id === value)) {
    throw new Error(`${label} ID 不存在：${value}`);
  }
  return value;
}
