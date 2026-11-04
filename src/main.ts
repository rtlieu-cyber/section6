// Tile Tycoon: an incremental game in the spirit of Cookie Clicker.
// Click the tile, spend tiles on producers, watch the numbers grow.
// @deno-types="./asset-url.d.ts"
import tileUrl from "./assets/tile.svg?no-inline";
import "./style.css";
import { formatNumber } from "./format.ts";
import {
  BUILDINGS,
  clearSave,
  CLICK_UPGRADES,
  clickPower,
  costOf,
  createInitialState,
  type GameState,
  loadState,
  offlineSeconds,
  ownedOf,
  saveState,
  totalCps,
} from "./game.ts";

const app = document.querySelector<HTMLElement>("#app")!;

let state: GameState = createInitialState();

// --- Save handling ----------------------------------------------------------

const saved = loadState();
if (saved !== null) {
  state = saved;
  const away = offlineSeconds(state, Date.now());
  const earnings = totalCps(state) * away;
  if (earnings > 0) {
    state.tiles += earnings;
    state.totalTiles += earnings;
    const notice = document.createElement("p");
    notice.className = "notice";
    notice.textContent =
      `Welcome back! Your crew produced ${formatNumber(earnings)} tiles ` +
      `while you were away.`;
    app.append(notice);
  }
}

// --- Static layout ----------------------------------------------------------

const heading = document.createElement("h1");
heading.textContent = "Tile Tycoon";
const tagline = document.createElement("p");
tagline.className = "tagline";
tagline.textContent = "Click tiles. Buy machines. Repeat forever.";
app.append(heading, tagline);

const layout = document.createElement("div");
layout.className = "layout";
app.append(layout);

// Left panel: the clickable tile and running totals.
const clicker = document.createElement("section");
clicker.className = "panel clicker";

const tileButton = document.createElement("button");
tileButton.id = "tile-button";
tileButton.type = "button";
tileButton.setAttribute("aria-label", "Make a tile");
const tileImage = document.createElement("img");
tileImage.src = tileUrl;
tileImage.alt = "A teal tile with a cream circle";
tileImage.draggable = false;
tileButton.append(tileImage);

const counter = document.createElement("p");
counter.className = "counter";
const perSecond = document.createElement("p");
perSecond.className = "counter";
const stats = document.createElement("p");
stats.className = "stats";

clicker.append(tileButton, counter, perSecond, stats);
layout.append(clicker);

// Right panel: upgrades and buildings for sale.
const shop = document.createElement("section");
shop.className = "panel shop";
const upgradesHeading = document.createElement("h2");
upgradesHeading.textContent = "Upgrades";
const upgradeList = document.createElement("div");
const buildingsHeading = document.createElement("h2");
buildingsHeading.textContent = "Producers";
const buildingList = document.createElement("div");
shop.append(upgradesHeading, upgradeList, buildingsHeading, buildingList);
layout.append(shop);

const footer = document.createElement("div");
footer.className = "footer";
const saveNote = document.createElement("span");
saveNote.textContent = "Progress saves automatically.";
const resetButton = document.createElement("button");
resetButton.id = "reset";
resetButton.type = "button";
resetButton.textContent = "Reset save";
footer.append(saveNote, resetButton);
app.append(footer);

// --- Upgrade rows -----------------------------------------------------------

interface UpgradeRow {
  row: HTMLButtonElement;
  name: HTMLSpanElement;
  cost: HTMLSpanElement;
}

function makeUpgradeRow(): UpgradeRow {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "row";
  const info = document.createElement("span");
  info.className = "info";
  const name = document.createElement("span");
  name.className = "name";
  const flavor = document.createElement("span");
  flavor.className = "flavor";
  flavor.textContent = "Clicks are twice as effective.";
  const cost = document.createElement("span");
  info.append(
    document.createElement("br"),
    name,
    document.createElement("br"),
    flavor,
  );
  row.append(info, cost);
  row.addEventListener("click", () => buyClickUpgrade());
  upgradeList.append(row);
  return { row, name, cost };
}

const upgradeRows = CLICK_UPGRADES.map(() => makeUpgradeRow());

function buyClickUpgrade(): void {
  const index = state.clickLevel;
  if (index >= CLICK_UPGRADES.length) return;
  const upgrade = CLICK_UPGRADES[index];
  if (state.tiles < upgrade.cost) return;
  state.tiles -= upgrade.cost;
  state.clickLevel += 1;
  refreshShop();
}

// --- Building rows ----------------------------------------------------------

interface BuildingRow {
  row: HTMLButtonElement;
  cost: HTMLSpanElement;
  owned: HTMLSpanElement;
}

function makeBuildingRow(id: string): BuildingRow {
  const building = BUILDINGS.find((b) => b.id === id)!;
  const row = document.createElement("button");
  row.type = "button";
  row.className = "row";
  const info = document.createElement("span");
  info.className = "info";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = `${building.name} — ${
    formatNumber(building.baseCps)
  }/s each`;
  const flavor = document.createElement("span");
  flavor.className = "flavor";
  flavor.textContent = building.flavor;
  const cost = document.createElement("span");
  const owned = document.createElement("span");
  owned.className = "owned";
  info.append(
    document.createElement("br"),
    name,
    document.createElement("br"),
    flavor,
  );
  row.append(info, cost, owned);
  row.addEventListener("click", () => buyBuilding(id));
  buildingList.append(row);
  return { row, cost, owned };
}

const buildingRows = new Map<string, BuildingRow>(
  BUILDINGS.map((building) => [building.id, makeBuildingRow(building.id)]),
);

function buyBuilding(id: string): void {
  const building = BUILDINGS.find((b) => b.id === id)!;
  const owned = ownedOf(state, id);
  const price = costOf(building, owned);
  if (state.tiles < price) return;
  state.tiles -= price;
  state.buildings[id] = owned + 1;
  refreshShop();
}

// --- Clicking ---------------------------------------------------------------

tileButton.addEventListener("click", (event) => {
  const gain = clickPower(state);
  state.tiles += gain;
  state.totalTiles += gain;
  state.clicks += 1;
  spawnFloat(event.clientX, event.clientY, `+${formatNumber(gain)}`, false);
});

function spawnFloat(x: number, y: number, text: string, gold: boolean): void {
  const float = document.createElement("span");
  float.className = gold ? "float gold" : "float";
  float.textContent = text;
  float.style.left = `${x - 20}px`;
  float.style.top = `${y - 20}px`;
  document.body.append(float);
  float.addEventListener("animationend", () => float.remove());
}

// --- Golden tile ------------------------------------------------------------

const goldenTile = document.createElement("button");
goldenTile.id = "golden-tile";
goldenTile.type = "button";
goldenTile.setAttribute("aria-label", "Golden tile!");
const goldenImage = document.createElement("img");
goldenImage.src = tileUrl;
goldenImage.alt = "";
goldenTile.append(goldenImage);
goldenTile.style.display = "none";
goldenTile.addEventListener("click", () => {
  const bonus = Math.max(50, totalCps(state) * 30);
  state.tiles += bonus;
  state.totalTiles += bonus;
  const rect = goldenTile.getBoundingClientRect();
  spawnFloat(
    rect.left + rect.width / 2,
    rect.top,
    `+${formatNumber(bonus)}`,
    true,
  );
  goldenTile.style.display = "none";
  scheduleGoldenTile();
});

function scheduleGoldenTile(): void {
  const delay = 45_000 + Math.random() * 45_000;
  setTimeout(showGoldenTile, delay);
}

function showGoldenTile(): void {
  goldenTile.style.left = `${8 + Math.random() * 78}%`;
  goldenTile.style.top = `${10 + Math.random() * 70}%`;
  goldenTile.style.display = "block";
  setTimeout(() => {
    goldenTile.style.display = "none";
    scheduleGoldenTile();
  }, 10_000);
}

document.body.append(goldenTile);
scheduleGoldenTile();

// --- Main loop --------------------------------------------------------------

function refreshShop(): void {
  const upgradeIndex = state.clickLevel;
  upgradeRows.forEach((entry, index) => {
    if (index < upgradeIndex) {
      entry.row.remove();
      return;
    }
    const upgrade = CLICK_UPGRADES[index];
    entry.name.textContent = upgrade.name;
    entry.cost.textContent = formatNumber(upgrade.cost);
    entry.row.disabled = state.tiles < upgrade.cost;
  });

  for (const building of BUILDINGS) {
    const entry = buildingRows.get(building.id)!;
    const owned = ownedOf(state, building.id);
    const price = costOf(building, owned);
    entry.cost.textContent = formatNumber(price);
    entry.owned.textContent = owned.toString();
    entry.row.disabled = state.tiles < price;
  }
}

function refreshHud(): void {
  counter.innerHTML = "";
  counter.append(
    document.createTextNode(formatNumber(state.tiles)),
    document.createTextNode(" "),
  );
  const label = document.createElement("small");
  label.textContent = "tiles";
  counter.append(label);
  perSecond.innerHTML = "";
  const cpsLabel = document.createElement("small");
  cpsLabel.textContent = `${formatNumber(totalCps(state))} tiles per second`;
  perSecond.append(cpsLabel);
  stats.textContent = `Lifetime: ${formatNumber(state.totalTiles)} · Clicks: ` +
    `${formatNumber(state.clicks)}`;
}

let lastTick = performance.now();

setInterval(() => {
  const now = performance.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  const earnings = totalCps(state) * dt;
  state.tiles += earnings;
  state.totalTiles += earnings;
  refreshHud();
  refreshShop();
}, 100);

// --- Saving and resetting ---------------------------------------------------

setInterval(() => saveState(state), 5_000);
globalThis.addEventListener("beforeunload", () => saveState(state));

resetButton.addEventListener("click", () => {
  const confirmed = confirm("Erase all progress and start over?");
  if (!confirmed) return;
  clearSave();
  state = createInitialState();
  upgradeRows.forEach((entry) => upgradeList.append(entry.row));
  refreshHud();
  refreshShop();
});

refreshHud();
refreshShop();
