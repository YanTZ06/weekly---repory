export type MapPosition =
  | "village-gate"
  | "waterside-courtyard"
  | "academy-door"
  | "stone-bridge"
  | "lotus-pond";

export interface Profile {
  name: string;
  siteTitle: string;
  description: string;
  avatar: {
    path: string;
    animated: boolean;
    nativeWidth: number;
    nativeHeight: number;
    mapScale: number;
    mapPosition: MapPosition;
    showName: boolean;
  };
  links: Array<{
    id: string;
    name: string;
    url: string;
    icon: string;
    visible: boolean;
    order: number;
  }>;
}

export interface MapBuildingConfig {
  id: string;
  name: string;
  description: string;
  href: string;
  x: number;
  y: number;
  width: number;
  kind: string;
}

export interface MapConfig {
  autoSeason: boolean;
  disableAnimations: boolean;
  width: number;
  height: number;
  buildings: MapBuildingConfig[];
}
