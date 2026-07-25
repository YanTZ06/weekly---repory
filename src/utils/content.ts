import { getCollection } from "astro:content";
import type { ReportItem } from "@/types/content";

export async function loadReportItems(): Promise<ReportItem[]> {
  const entries = await getCollection("items");
  return entries.map((entry) => ({
    ...entry.data,
    body: (entry.body ?? "").trim()
  }));
}
