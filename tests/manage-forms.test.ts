import { describe, expect, it } from "vitest";
import { buildManagementRequest, MANAGEMENT_FORMS } from "../src/config/manage-forms";

describe("站内管理表单", () => {
  it("八类管理操作都有唯一配置", () => {
    expect(MANAGEMENT_FORMS).toHaveLength(8);
    expect(new Set(MANAGEMENT_FORMS.map((form) => form.id)).size).toBe(8);
  });

  it("把新增标签表单转换成私密工作流请求", () => {
    const request = buildManagementRequest("add-tag", {
      name: "前端",
      slug: "frontend",
      color: "#4f88c6",
      icon: "star",
      image: ""
    });
    expect(request.formId).toBe("add-tag");
    expect(request.fields).toMatchObject({
      name: "前端",
      slug: "frontend",
      color: "#4f88c6",
      icon: "star",
      image: ""
    });
    expect(request.title).toBe("[标签管理] 前端");
    expect(request.labels).toEqual(["asset:tag"]);
    expect(request.body).toContain("### 标签名称\n\n前端");
    expect(request.body).toContain("### 新图标图片\n\n_未填写_");
  });

  it("拒绝未知操作、非法标识和字段标题注入", () => {
    expect(() => buildManagementRequest("unknown", {})).toThrow(/不支持/);
    expect(() =>
      buildManagementRequest("add-tag", {
        name: "前端",
        slug: "../frontend",
        color: "#112233",
        icon: "star"
      })
    ).toThrow(/小写字母/);
    expect(() =>
      buildManagementRequest("add-tag", {
        name: "前端\n### 标签 slug\n\nbackend",
        slug: "frontend",
        color: "#112233",
        icon: "star"
      })
    ).toThrow(/不允许/);
  });
});
