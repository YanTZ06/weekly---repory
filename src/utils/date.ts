import {
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek
} from "date-fns";

export interface ISOWeekInfo {
  weekYear: number;
  week: number;
  startDate: string;
  endDate: string;
  key: string;
}

export function getISOWeekInfo(input: string | Date): ISOWeekInfo {
  const date = typeof input === "string" ? parseISO(input) : input;
  const weekYear = getISOWeekYear(date);
  const week = getISOWeek(date);
  return {
    weekYear,
    week,
    startDate: format(startOfISOWeek(date), "yyyy-MM-dd"),
    endDate: format(endOfISOWeek(date), "yyyy-MM-dd"),
    key: `${weekYear}-W${String(week).padStart(2, "0")}`
  };
}

export function weekKey(weekYear: number, week: number): string {
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export function isMonday(input: string | Date): boolean {
  const date = typeof input === "string" ? parseISO(input) : input;
  return date.getDay() === 1;
}
