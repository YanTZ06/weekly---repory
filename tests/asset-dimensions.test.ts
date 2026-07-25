import { describe, expect, it } from "vitest";
import sharp from "sharp";
import path from "node:path";
import { validateAssetDimensions } from "../scripts/asset-dimension-validator";

describe("高精度像素资源", () => {
  it("所有核心资源满足约定尺寸、透明通道与整数倍缩放", async () => {
    await expect(validateAssetDimensions()).resolves.toBeUndefined();
  });

  it("分享图为 1280×720", async () => {
    const metadata = await sharp(
      path.join(process.cwd(), "public", "assets", "og", "huizhou-weekly-preview.png")
    ).metadata();
    expect([metadata.width, metadata.height]).toEqual([1280, 720]);
  });
});
