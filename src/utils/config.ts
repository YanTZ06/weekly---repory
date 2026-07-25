import type { MapPosition } from "@/types/config";

const MAP_POSITIONS = new Set<MapPosition>([
  "village-gate",
  "waterside-courtyard",
  "academy-door",
  "stone-bridge",
  "lotus-pond"
]);

export function assertMapPosition(value: string): MapPosition {
  if (!MAP_POSITIONS.has(value as MapPosition)) {
    throw new Error(`未知的地图站位：${value}`);
  }
  return value as MapPosition;
}
