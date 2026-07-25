import { describe, expect, it } from "vitest";
import type { Tag } from "../src/types/content";
import { createTag } from "../scripts/tag-manager";

const existing: Tag[] = [
  {
    name: "后端",
    slug: "backend",
    icon: "/assets/tag-icons/mechanical.png",
    color: "#4F88C6",
    createdAt: "2026-07-20T01:00:00.000Z"
  }
];

describe("标签管理", () => {
  it("创建经过规范化的新标签", () => {
    expect(
      createTag(
        {
          name: " 前端开发 ",
          slug: "frontend",
          icon: "/assets/tag-icons/tag-frontend.png",
          color: "#3c8d63"
        },
        existing,
        new Date("2026-07-25T08:00:00.000Z")
      )
    ).toEqual({
      name: "前端开发",
      slug: "frontend",
      icon: "/assets/tag-icons/tag-frontend.png",
      color: "#3C8D63",
      createdAt: "2026-07-25T08:00:00.000Z"
    });
  });

  it("拒绝重复名称和重复 slug", () => {
    expect(() =>
      createTag(
        { name: "后端", slug: "server", icon: "/assets/tag-icons/star.png", color: "#112233" },
        existing
      )
    ).toThrow(/名称已存在/);
    expect(() =>
      createTag(
        { name: "服务端", slug: "backend", icon: "/assets/tag-icons/star.png", color: "#112233" },
        existing
      )
    ).toThrow(/slug 已存在/);
  });

  it("拒绝非法 slug、颜色和图标路径", () => {
    expect(() =>
      createTag(
        { name: "前端", slug: "../frontend", icon: "/assets/tag-icons/star.png", color: "#112233" },
        existing
      )
    ).toThrow(/不安全/);
    expect(() =>
      createTag(
        { name: "前端", slug: "frontend", icon: "/assets/tag-icons/star.png", color: "blue" },
        existing
      )
    ).toThrow(/#RRGGBB/);
    expect(() =>
      createTag(
        { name: "前端", slug: "frontend", icon: "/assets/other/star.png", color: "#112233" },
        existing
      )
    ).toThrow(/路径不安全/);
  });
});
