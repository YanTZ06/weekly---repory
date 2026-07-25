const LATIN_WORD = /^[a-z0-9]+$/;

export function toSafeSlug(value: string): string {
  const pieces = Array.from(value.normalize("NFKC").trim().toLowerCase()).map((character) => {
    if (/[a-z0-9]/.test(character)) return character;
    if (/\s|[_./]+/.test(character)) return "-";
    if (/[\u3400-\u9fff]/u.test(character)) return `-u${character.codePointAt(0)?.toString(16)}-`;
    return "-";
  });

  const slug = pieces.join("").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("名称无法生成安全 slug");
  if (LATIN_WORD.test(slug)) return slug;
  return slug;
}

export function assertSafeId(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new Error(`不安全的 ID：${value}`);
  }
  return value;
}
