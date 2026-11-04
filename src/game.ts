/** Game data, state, and rules for Tile Tycoon. No DOM code lives here. */

export interface Building {
  id: string;
  name: string;
  flavor: string;
  baseCost: number;
  baseCps: number;
}

export interface ClickUpgrade {
  name: string;
  flavor: string;
  cost: number;
}

export const BUILDINGS: Building[] = [
  {
    id: "pickaxe",
    name: "Pickaxe",
    flavor: "Chips fresh tiles off a nearby cliff.",
    baseCost: 5,
    baseCps: 0.5,
  },
  {
    id: "drill",
    name: "Drill",
    flavor: "Grinds through bedrock around the clock.",
    baseCost: 10,
    baseCps: 2,
  },
  {
    id: "quarry",
    name: "Quarry",
    flavor: "Industrial-scale tile extraction.",
    baseCost: 110,
    baseCps: 16,
  },
  {
    id: "kiln",
    name: "Kiln",
    flavor: "Fires new tiles straight from wet clay.",
    baseCost: 1200,
    baseCps: 100,
  },
  {
    id: "factory",
    name: "Tile Factory",
    flavor: "Mass production, artisanal finish.",
    baseCost: 13000,
    baseCps: 350,
  },
  {
    id: "portal",
    name: "Tile Portal",
    flavor: "Imports tiles from the tile dimension.",
    baseCost: 140000,
    baseCps: 2800,
  },
];

export const CLICK_UPGRADES: ClickUpgrade[] = [
  {
    name: "Sturdy Gloves",
    flavor: "Clicks are twice as effective.",
    cost: 10,
  },
  {
    name: "Silicone Grip",
    flavor: "Clicks are twice as effective.",
    cost: 500,
  },
  {
    name: "Robotic Exoskeleton",
    flavor: "Clicks are twice as effective.",
    cost: 5000,
  },
  {
    name: "Neural Link",
    flavor: "Clicks are twice as effective.",
    cost: 50000,
  },
  {
    name: "Quantum Taps",
    flavor: "Clicks are twice as effective.",
    cost: 500000,
  },
];

/** Price of the next unit of a building, given how many are owned. */
export function costOf(building: Building, owned: number): number {
  return Math.ceil(building.baseCost * 1.15 ** owned);
}

/** Tiles produced per second by the whole empire. */
export function totalCps(state: GameState): number {
  return BUILDINGS.reduce(
    (sum, building) => sum + building.baseCps * ownedOf(state, building.id),
    0,
  );
}

/** Tiles granted by one click. Scales with both upgrades and passive income. */
export function clickPower(state: GameState): number {
  const cpsShare = totalCps(state) * 0.02;
  return (1 + cpsShare) * 2 ** state.clickLevel;
}

export function ownedOf(state: GameState, id: string): number {
  return state.buildings[id] ?? 0;
}

export interface GameState {
  tiles: number;
  totalTiles: number;
  clicks: number;
  clickLevel: number;
  buildings: Record<string, number>;
  lastSaved: number;
}

const SAVE_KEY = "tile-tycoon-save-v1";

export function createInitialState(): GameState {
  return {
    tiles: 0,
    totalTiles: 0,
    clicks: 0,
    clickLevel: 0,
    buildings: {},
    lastSaved: Date.now(),
  };
}

export function saveState(state: GameState): void {
  state.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const state = parsed as Partial<GameState>;
    if (
      typeof state.tiles !== "number" ||
      typeof state.totalTiles !== "number" ||
      typeof state.buildings !== "object" ||
      state.buildings === null
    ) {
      return null;
    }
    return {
      tiles: state.tiles,
      totalTiles: state.totalTiles,
      clicks: state.clicks ?? 0,
      clickLevel: state.clickLevel ?? 0,
      buildings: state.buildings,
      lastSaved: state.lastSaved ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/** Seconds of passive income earned while the game was closed (capped). */
export function offlineSeconds(state: GameState, now: number): number {
  const elapsed = (now - state.lastSaved) / 1000;
  return Math.min(Math.max(elapsed, 0), 2 * 60 * 60);
}
