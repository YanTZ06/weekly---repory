import YAML from "yaml";
import type { ReportItem } from "../src/types/content";

export function reportItemToMarkdown(item: ReportItem): string {
  const { body, ...frontmatter } = item;
  const yaml = YAML.stringify(frontmatter, {
    lineWidth: 0,
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN"
  }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.trim()}\n`;
}
