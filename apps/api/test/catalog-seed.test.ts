import { describe, expect, it } from "vitest";
import { validateCatalogSeed } from "@figcontrol/shared";
import { worldCup2026Seed } from "../src/catalog/world-cup-2026.seed";

describe("worldCup2026Seed", () => {
  it("has a valid tracked checklist with base album and Coca-Cola extras", () => {
    const result = validateCatalogSeed(worldCup2026Seed);

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(worldCup2026Seed.baseStickerCount).toBe(980);
    expect(worldCup2026Seed.trackedStickerCount).toBe(994);
    expect(
      worldCup2026Seed.sections.filter((section) => section.kind === "TEAM"),
    ).toHaveLength(48);
    expect(
      worldCup2026Seed.sections.find((section) => section.slug === "coca-cola")
        ?.stickers,
    ).toHaveLength(14);
    expect(
      worldCup2026Seed.sections.find(
        (section) => section.slug === "fifa-world-cup",
      )?.stickers[0],
    ).toMatchObject({
      code: "FWC00",
      localNumber: 0,
    });
    expect(
      worldCup2026Seed.sections
        .find((section) => section.slug === "brazil")
        ?.stickers.find((sticker) => sticker.code === "BRA20")?.label,
    ).toBe("Estévão");
  });
});
