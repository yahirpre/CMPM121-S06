// Pure game model: election clicker state and rules, with no DOM code.
// The view (main.ts) reads state through functions and changes state only
// through the actions below, so every rule lives in exactly one place (SRP)
// and this file can be tested without a browser.

export type Upgrade = {
  id: string;
  emoji: string;
  name: string;
  detail: string;
  baseCost: number;
  costGrowth: number; // cost multiplier per purchase (differs per upgrade)
  owned: number;
  votesPerSecondEach: number;
  votesPerClickEach: number;
};

// Upgrades are data: differences between upgrades are fields on these
// objects, and all of them are processed by the same common code paths.
// Adding a fourth upgrade is one new entry, not new logic.
const upgrades: Upgrade[] = [
  {
    id: "canvass",
    emoji: "🚪",
    name: "Knock on doors",
    detail: "+1 vote per rally click each",
    baseCost: 5,
    costGrowth: 2,
    owned: 0,
    votesPerSecondEach: 0,
    votesPerClickEach: 1,
  },
  {
    id: "volunteers",
    emoji: "🙋",
    name: "Recruit volunteers",
    detail: "+1 vote per second each",
    baseCost: 10,
    costGrowth: 1.6,
    owned: 0,
    votesPerSecondEach: 1,
    votesPerClickEach: 0,
  },
  {
    id: "ads",
    emoji: "📺",
    name: "Run TV ads",
    detail: "+4 votes per second each",
    baseCost: 50,
    costGrowth: 1.8,
    owned: 0,
    votesPerSecondEach: 4,
    votesPerClickEach: 0,
  },
];

// Whole votes banked; voteFraction holds progress toward the next passive
// vote so `votes` stays an exact integer the display can mirror.
let votes = 0;
let voteFraction = 0;

// Baseline production before any upgrades.
const baseVotesPerSecond = 1;
const baseVotesPerClick = 1;

export function getVotes(): number {
  return votes;
}

export function getUpgrades(): readonly Upgrade[] {
  return upgrades;
}

export function upgradeCostFor(upgrade: Upgrade, owned: number): number {
  return Math.floor(upgrade.baseCost * upgrade.costGrowth ** owned);
}

export function upgradeCost(upgrade: Upgrade): number {
  return upgradeCostFor(upgrade, upgrade.owned);
}

export function totalVotesPerSecond(): number {
  const fromUpgrades = upgrades.reduce(
    (sum, upgrade) => sum + upgrade.votesPerSecondEach * upgrade.owned,
    0,
  );
  return baseVotesPerSecond + fromUpgrades;
}

export function totalVotesPerClick(): number {
  const fromUpgrades = upgrades.reduce(
    (sum, upgrade) => sum + upgrade.votesPerClickEach * upgrade.owned,
    0,
  );
  return baseVotesPerClick + fromUpgrades;
}

export function canBuy(upgrade: Upgrade): boolean {
  return votes >= upgradeCost(upgrade);
}

// The one place that owns purchase rules: check affordability, deduct the
// cost, and apply the effect (raising `owned`, which the derived rates read).
export function buy(upgrade: Upgrade): boolean {
  const cost = upgradeCost(upgrade);
  if (votes < cost) return false;
  votes -= cost;
  upgrade.owned += 1;
  return true;
}

export function rally(): void {
  votes += totalVotesPerClick();
}

// Advance passive production by dtSeconds of real elapsed time. Credit is
// proportional to seconds elapsed, not to how this is called (frame rate
// does not matter); only whole votes bank.
export function advanceTime(dtSeconds: number): void {
  voteFraction += totalVotesPerSecond() * dtSeconds;
  const banked = Math.floor(voteFraction);
  if (banked > 0) {
    votes += banked;
    voteFraction -= banked;
  }
}
