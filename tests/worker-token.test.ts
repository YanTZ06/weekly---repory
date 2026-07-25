import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../worker/src/token";

const secret = "test-only-session-secret-with-more-than-32-characters";

describe("管理授权令牌", () => {
  it("签名后可以验证正确用途和账号", async () => {
    const token = await signToken(
      {
        purpose: "management-session",
        exp: 2_000_000_000,
        nonce: "nonce",
        sub: "YanTZ06"
      },
      secret
    );
    await expect(
      verifyToken(token, secret, "management-session", 1_900_000_000_000)
    ).resolves.toMatchObject({ sub: "YanTZ06" });
    await expect(
      verifyToken(token, secret, "oauth-state", 1_900_000_000_000)
    ).resolves.toBeNull();
  });

  it("拒绝篡改、过期和弱密钥", async () => {
    const token = await signToken(
      {
        purpose: "management-session",
        exp: 1_800_000_000,
        nonce: "nonce",
        sub: "YanTZ06"
      },
      secret
    );
    await expect(
      verifyToken(`${token}x`, secret, "management-session", 1_700_000_000_000)
    ).resolves.toBeNull();
    await expect(
      verifyToken(token, secret, "management-session", 1_900_000_000_000)
    ).resolves.toBeNull();
    await expect(
      signToken(
        { purpose: "oauth-state", exp: 2_000_000_000, nonce: "nonce" },
        "too-short"
      )
    ).rejects.toThrow(/32/);
  });
});
