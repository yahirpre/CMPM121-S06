// Tests for the pure game model. These are only possible because game.ts
// has no DOM code (the SRP split): the rules can be exercised headlessly,
// in any order, with relative assertions that do not depend on the state
// earlier tests left behind. getUpgrades()[0] is the click line ("Knock on
// doors"), which changes rally power but not passive production.

import {
  advanceTime,
  buy,
  canBuy,
  getUpgrades,
  getVotes,
  rally,
  totalVotesPerClick,
  upgradeCost,
} from "./game.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

Deno.test("passive growth banks by elapsed time, not frame count", () => {
  const before = getVotes();
  advanceTime(2); // one 2-second frame
  const afterLongFrame = getVotes();
  advanceTime(0.5);
  advanceTime(0.5);
  advanceTime(0.5);
  advanceTime(0.5); // four 0.5-second frames, same total time
  assert(
    getVotes() - afterLongFrame === afterLongFrame - before,
    "the same elapsed seconds bank the same votes however frames split them",
  );
});

Deno.test("buy prevents unaffordable purchases and deducts exactly", () => {
  const canvass = getUpgrades()[0];
  // Fund several purchases, then drain until the gate engages.
  advanceTime(60);
  while (canBuy(canvass)) {
    const before = getVotes();
    const cost = upgradeCost(canvass); // read before buying: cost then rescales
    assert(buy(canvass), "an affordable purchase succeeds");
    assert(
      getVotes() === before - cost,
      "a successful purchase deducts exactly its cost",
    );
  }
  const before = getVotes();
  assert(!canBuy(canvass), "below the cost the gate is shut");
  assert(!buy(canvass), "buy() refuses a purchase it cannot afford");
  assert(getVotes() === before, "a refused purchase changes nothing");
});

Deno.test("purchased effects persist in the system's behavior", () => {
  const canvass = getUpgrades()[0];
  const powerBefore = totalVotesPerClick();
  advanceTime(60); // fund the next purchase
  if (canBuy(canvass)) {
    assert(buy(canvass), "funded purchase succeeds");
    assert(
      totalVotesPerClick() === powerBefore + 1,
      "the bought effect shows up in the derived rally power",
    );
  }
  const power = totalVotesPerClick();
  const before = getVotes();
  rally();
  assert(
    getVotes() - before === power,
    "each rally pays exactly the current rally power",
  );
});
