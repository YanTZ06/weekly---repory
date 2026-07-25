import type { ReportItem, WeeklyReport } from "@/types/content";
import { getISOWeekInfo, weekKey } from "@/utils/date";

export function publicItems(items: ReportItem[]): ReportItem[] {
  return items.filter((item) => item.status === "published");
}

export function aggregateWeeklyReports(items: ReportItem[]): WeeklyReport[] {
  const buckets = new Map<string, ReportItem[]>();
  for (const item of publicItems(items)) {
    const key = weekKey(item.weekYear, item.week);
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]) => {
      const sortedItems = [...bucket].sort((a, b) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
      );
      const range = getISOWeekInfo(sortedItems[0]?.date ?? new Date());
      return {
        key,
        weekYear: sortedItems[0]?.weekYear ?? range.weekYear,
        week: sortedItems[0]?.week ?? range.week,
        startDate: range.startDate,
        endDate: range.endDate,
        items: sortedItems,
        projects: [...new Set(sortedItems.flatMap((item) => item.projects))],
        tags: [...new Set(sortedItems.flatMap((item) => item.tags))]
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export function retainUnchangedFields(
  existing: ReportItem,
  updates: Partial<Omit<ReportItem, "id" | "createdAt">>
): ReportItem {
  return {
    ...existing,
    ...Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)),
    id: existing.id,
    createdAt: existing.createdAt
  } as ReportItem;
}
