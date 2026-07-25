import { describe, expect, it } from "vitest";
import { aggregateWeeklyReports, publicItems, retainUnchangedFields } from "../src/utils/reports";
import type { ReportItem } from "../src/types/content";

function item(overrides: Partial<ReportItem> = {}): ReportItem {
  return {
    id: "20260725-a1b2c3",
    author: "yantz",
    date: "2026-07-25",
    weekYear: 2026,
    week: 30,
    category: "personal",
    projects: ["周报系统"],
    tags: ["后端"],
    emoji: { type: "unicode", value: "📝" },
    calendarIcon: "red-flame",
    images: [],
    status: "published",
    createdAt: "2026-07-25T15:00:00+08:00",
    updatedAt: "2026-07-25T15:00:00+08:00",
    body: "完成事项",
    ...overrides
  };
}

describe("周报过滤、聚合和更新", () => {
  it("公开页面只保留 published", () => {
    const items = [
      item(),
      item({ id: "20260725-b1b2c3", status: "hidden" }),
      item({ id: "20260725-c1b2c3", status: "deleted" })
    ];
    expect(publicItems(items)).toHaveLength(1);
  });

  it("同一 ISO 周事项聚合为一份周报", () => {
    const reports = aggregateWeeklyReports([
      item(),
      item({ id: "20260723-b1b2c3", date: "2026-07-23", category: "science-association" })
    ]);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.items).toHaveLength(2);
  });

  it("跨年周按 ISO week-year 聚合", () => {
    const reports = aggregateWeeklyReports([
      item({ id: "20201231-a1b2c3", date: "2020-12-31", weekYear: 2020, week: 53 }),
      item({ id: "20210101-b1b2c3", date: "2021-01-01", weekYear: 2020, week: 53 })
    ]);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.key).toBe("2020-W53");
    expect(reports[0]?.startDate).toBe("2020-12-28");
  });

  it("更新事项时保留未填写字段", () => {
    const original = item();
    const updated = retainUnchangedFields(original, {
      body: "只更新正文",
      updatedAt: "2026-07-26T00:00:00+08:00"
    });
    expect(updated.body).toBe("只更新正文");
    expect(updated.category).toBe(original.category);
    expect(updated.projects).toEqual(original.projects);
    expect(updated.createdAt).toBe(original.createdAt);
  });
});
