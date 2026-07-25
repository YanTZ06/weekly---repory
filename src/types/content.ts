export type ReportCategory = "science-association" | "personal" | "other";
export type ReportStatus = "published" | "hidden" | "deleted";
export type EmojiType = "unicode" | "custom";

export interface ReportEmoji {
  type: EmojiType;
  value: string;
}

export interface ReportItem {
  id: string;
  author: string;
  date: string;
  weekYear: number;
  week: number;
  category: ReportCategory;
  projects: string[];
  tags: string[];
  emoji: ReportEmoji;
  calendarIcon: string;
  images: string[];
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  body: string;
}

export interface WeeklyReport {
  key: string;
  weekYear: number;
  week: number;
  startDate: string;
  endDate: string;
  items: ReportItem[];
  projects: string[];
  tags: string[];
}

export interface Creature {
  id: string;
  name: string;
  element: "electric" | "water" | "nature" | "fire" | "psychic" | "mechanical";
  sprite: string;
  largeSprite: string;
  enabled: boolean;
  source: string;
  author: string;
  license: string;
}

export interface Project {
  name: string;
  slug: string;
  creatureId: string;
  mapPosition: string;
  showOnMap: boolean;
  createdAt: string;
}

export interface Tag {
  name: string;
  slug: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface CalendarIcon {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
}

export interface CustomEmoji {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  createdAt: string;
}
