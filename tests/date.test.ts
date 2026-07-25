import { describe, expect, it } from "vitest";
import { getISOWeekInfo, isMonday, weekKey } from "../src/utils/date";

describe("ISO 周日期工具", () => {
  it("计算普通日期的 ISO 周数和周一到周日范围", () => {
    expect(getISOWeekInfo("2026-07-25")).toEqual({
      weekYear: 2026,
      week: 30,
      startDate: "2026-07-20",
      endDate: "2026-07-26",
      key: "2026-W30"
    });
  });

  it("正确处理十二月末属于下一 ISO 年第一周", () => {
    const result = getISOWeekInfo("2019-12-31");
    expect(result.weekYear).toBe(2020);
    expect(result.week).toBe(1);
  });

  it("正确处理一月初属于上一 ISO 年最后一周", () => {
    const result = getISOWeekInfo("2021-01-01");
    expect(result.weekYear).toBe(2020);
    expect(result.week).toBe(53);
    expect(result.startDate).toBe("2020-12-28");
  });

  it("一周从周一开始", () => {
    expect(isMonday(getISOWeekInfo("2026-07-25").startDate)).toBe(true);
  });

  it("周键补齐两位周数", () => {
    expect(weekKey(2027, 1)).toBe("2027-W01");
  });
});
