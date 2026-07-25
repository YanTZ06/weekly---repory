export function normalizeBase(base: string): string {
  if (!base || base === "/") return "/";
  return `/${base.replace(/^\/+|\/+$/g, "")}/`;
}

export function withBase(path: string, base = import.meta.env.BASE_URL): string {
  if (/^(?:https?:)?\/\//.test(path) || path.startsWith("#") || path.startsWith("mailto:")) return path;
  const normalizedBase = normalizeBase(base);
  const cleanPath = path.replace(/^\/+/, "");
  return normalizedBase === "/" ? `/${cleanPath}` : `${normalizedBase}${cleanPath}`;
}

export function assetUrl(path: string, base = import.meta.env.BASE_URL): string {
  return withBase(path, base);
}
