import { describe, expect, it } from "vitest";
import {
  assertPlainText,
  createReportItem,
  extractImageUrls,
  parseIssueForm,
  parseList,
  parseReportInput,
  parseStatus
} from "../scripts/issue-parser";
import { reportItemToMarkdown } from "../scripts/markdown-generator";

const issueBody = `### 事项日期

2026-07-25

### 分类

为科协做了什么

### 事项内容

完成后端教学文档并整理考核题。

### 项目

科协 SOC，周报系统

### 标签

后端
文档编写

### 事项主表情类型

unicode

### Unicode 表情或自定义表情 ID

📝

### 日历记录球

red-flame

### 图片

https://user-images.githubusercontent.com/1/example.png
`;

describe("Issue Form 解析与事项生成", () => {
  it("解析 GitHub Issue Form 的分节正文", () => {
    const fields = parseIssueForm(issueBody);
    expect(fields["事项日期"]).toBe("2026-07-25");
    expect(fields["事项内容"]).toContain("后端教学文档");
  });

  it("解析多项目和多标签", () => {
    expect(parseList("科协 SOC，周报系统\n优化算法学习")).toEqual([
      "科协 SOC",
      "周报系统",
      "优化算法学习"
    ]);
  });

  it("新增事项校验并计算 ISO 周", () => {
    const input = parseReportInput(parseIssueForm(issueBody), "yantz");
    const item = createReportItem(input, new Date("2026-07-25T07:00:00.000Z"));
    expect(item.weekYear).toBe(2026);
    expect(item.week).toBe(30);
    expect(item.projects).toEqual(["科协 SOC", "周报系统"]);
    expect(item.status).toBe("published");
  });

  it("图片最多 9 张", () => {
    const urls = Array.from({ length: 10 }, (_, index) => `https://github.com/example/image-${index}.png`).join("\n");
    expect(() => extractImageUrls(urls)).toThrow(/最多上传 9 张/);
  });

  it("记录球字段必须是安全 ID", () => {
    const invalid = issueBody.replace("red-flame", "../../secret");
    expect(() => parseReportInput(parseIssueForm(invalid), "yantz")).toThrow();
  });

  it("正文拒绝 Markdown 与 HTML", () => {
    expect(() => assertPlainText("# 伪造标题")).toThrow(/纯文本/);
    expect(() => assertPlainText("<script>alert(1)</script>")).toThrow(/纯文本/);
  });

  it("状态操作映射 published、hidden、deleted", () => {
    expect(parseStatus("隐藏")).toBe("hidden");
    expect(parseStatus("放入回收站")).toBe("deleted");
    expect(parseStatus("恢复公开")).toBe("published");
  });

  it("生成独立 Markdown 文件内容", () => {
    const input = parseReportInput(parseIssueForm(issueBody), "yantz");
    const item = createReportItem(input, new Date("2026-07-25T07:00:00.000Z"));
    const markdown = reportItemToMarkdown(item);
    expect(markdown).toContain('status: "published"');
    expect(markdown).toContain("完成后端教学文档并整理考核题。");
  });
});
