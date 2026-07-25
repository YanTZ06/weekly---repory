import { describe, expect, it } from "vitest";
import { assertSafeId, toSafeSlug } from "../src/utils/slug";
import {
  assertHttpUrl,
  assertIntegerScale,
  assertKnownId,
  escapeHtml
} from "../src/utils/security";
import { assertMapPosition } from "../src/utils/config";
import { isOwner } from "../scripts/github-utils";
import { withBase } from "../src/utils/paths";

describe("slug 与安全边界", () => {
  it("中文标签生成确定、路径安全的 slug", () => {
    expect(toSafeSlug("后端")).toBe("u540e-u7aef");
  });

  it("项目名称混合中文和英文时保留可读 ASCII", () => {
    expect(toSafeSlug("科协 SOC")).toBe("u79d1-u534f-soc");
  });

  it("拒绝可造成路径穿越的 ID", () => {
    expect(() => assertSafeId("../avatar")).toThrow(/不安全/);
  });

  it("只接受 HTTP 和 HTTPS 外部链接", () => {
    expect(assertHttpUrl("https://example.com").protocol).toBe("https:");
    expect(() => assertHttpUrl("javascript:alert(1)")).toThrow(/HTTP/);
  });

  it("头像缩放必须为整数", () => {
    expect(assertIntegerScale(2)).toBe(2);
    expect(() => assertIntegerScale(1.5)).toThrow(/整数/);
  });

  it("地图站位必须来自预设配置", () => {
    expect(assertMapPosition("stone-bridge")).toBe("stone-bridge");
    expect(() => assertMapPosition("../../outside")).toThrow(/地图站位/);
  });

  it("记录球和灵兽引用必须存在", () => {
    expect(assertKnownId("lotus", [{ id: "lotus" }], "记录球")).toBe("lotus");
    expect(() => assertKnownId("official-monster", [{ id: "nature-01" }], "灵兽")).toThrow(/不存在/);
  });

  it("管理操作拒绝非仓库所有者", () => {
    expect(isOwner("yantz", "yantz")).toBe(true);
    expect(isOwner("visitor", "yantz")).toBe(false);
  });

  it("HTML 转义防止脚本注入", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("GitHub Pages base path 正确拼接", () => {
    expect(withBase("/reports/2026/30/", "/weekly-report/")).toBe("/weekly-report/reports/2026/30/");
    expect(withBase("/about/", "/")).toBe("/about/");
  });
});
