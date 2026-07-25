import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const licensedAssetSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1)
});

export async function validateAssetLicenses(root = process.cwd()): Promise<void> {
  const creatures = JSON.parse(
    await readFile(path.join(root, "src", "data", "creatures.json"), "utf8")
  ) as unknown[];
  creatures.forEach((asset) => licensedAssetSchema.parse(asset));
  const attribution = await readFile(path.join(root, "ATTRIBUTIONS.md"), "utf8");
  for (const creature of creatures as Array<{ id: string }>) {
    if (!attribution.includes(creature.id)) throw new Error(`ATTRIBUTIONS.md 缺少 ${creature.id} 的授权记录`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await validateAssetLicenses();
  console.log("素材授权校验通过。");
}
