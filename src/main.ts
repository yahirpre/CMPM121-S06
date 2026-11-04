// View layer: builds the page, wires input, and re-renders. Every rule
// (costs, affordability, production, growth) lives in the game model in
// game.ts; this file only calls model actions and reads model values.

import {
  advanceTime,
  buy,
  canBuy,
  getUpgrades,
  getVotes,
  rally,
  totalVotesPerClick,
  totalVotesPerSecond,
  type Upgrade,
  upgradeCost,
  upgradeCostFor,
} from "./game.ts";

const app = document.querySelector<HTMLElement>("#app")!;

// --- Elements ---------------------------------------------------------------
const heading = document.createElement("h1");
heading.textContent = "Campaign Clicker";

const subtitle = document.createElement("p");
subtitle.textContent = "Win the election, one vote at a time.";

const voteCount = document.createElement("span");
voteCount.id = "vote-count";
voteCount.style.fontWeight = "bold";
voteCount.textContent = "0";

const voteUnit = document.createElement("span");
voteUnit.textContent = " votes";

const voteLine = document.createElement("p");
voteLine.append("Current tally: ", voteCount, voteUnit);

// Live readout of both production rates, rebuilt from state on every render
// so it can never disagree with the truth.
const productionLine = document.createElement("p");
productionLine.id = "production-rate";

const rallyButton = document.createElement("button");
rallyButton.id = "campaign-button";
rallyButton.textContent = "📣 Hold a rally";
rallyButton.style.fontSize = "1.25rem";
rallyButton.style.padding = "0.75rem 1.5rem";
rallyButton.style.cursor = "pointer";

const upgradesHeading = document.createElement("h2");
upgradesHeading.textContent = "Get out the vote";

const upgradeList = document.createElement("ul");

type UpgradeRow = {
  upgrade: Upgrade;
  buyButton: HTMLButtonElement;
  infoLine: HTMLParagraphElement;
};

const upgradeRows: UpgradeRow[] = [];

for (const upgrade of getUpgrades()) {
  const buyButton = document.createElement("button");
  buyButton.id = `buy-${upgrade.id}`;

  const infoLine = document.createElement("p");

  const item = document.createElement("li");
  item.append(buyButton, infoLine);
  upgradeList.append(item);

  // The model owns the rules; the view just asks it to buy and re-renders.
  buyButton.addEventListener("click", () => {
    buy(upgrade);
    render();
  });

  upgradeRows.push({ upgrade, buyButton, infoLine });
}

app.append(
  heading,
  subtitle,
  voteLine,
  productionLine,
  rallyButton,
  upgradesHeading,
  upgradeList,
);

document.title = "Campaign Clicker";

// --- Behavior ----------------------------------------------------------------
function pluralSuffix(n: number): string {
  return n === 1 ? "" : "s";
}

function render(): void {
  const votes = getVotes();
  voteCount.textContent = votes.toLocaleString();
  voteUnit.textContent = ` vote${pluralSuffix(votes)}`;

  const perSecond = totalVotesPerSecond();
  const perClick = totalVotesPerClick();
  productionLine.textContent =
    `Production: ${perSecond} vote${pluralSuffix(perSecond)}/sec` +
    ` · Rally power: ${perClick} vote${pluralSuffix(perClick)}/click`;

  for (const row of upgradeRows) {
    const cost = upgradeCost(row.upgrade);
    const nextCost = upgradeCostFor(row.upgrade, row.upgrade.owned + 1);
    row.buyButton.textContent =
      `${row.upgrade.emoji} ${row.upgrade.name} — ${cost} votes`;
    row.infoLine.textContent =
      `Owned: ${row.upgrade.owned} · ${row.upgrade.detail}` +
      ` · next costs ${nextCost} votes` +
      (votes < cost ? ` · ${cost - votes} votes to go` : "");
    row.buyButton.disabled = !canBuy(row.upgrade);
  }
}

// Clicking: each rally earns the current rally power in votes.
rallyButton.addEventListener("click", () => {
  rally();
  render();
});

// Elapsed-time animation: one requestAnimationFrame loop drives the model's
// advanceTime(dt) each frame — the model, not the loop, owns the growth math.
let lastTime: number | null = null;

function tick(now: number): void {
  const dt = lastTime === null ? 0 : (now - lastTime) / 1000; // seconds
  lastTime = now;

  advanceTime(dt);
  render();
  requestAnimationFrame(tick);
}

render();
requestAnimationFrame(tick);
