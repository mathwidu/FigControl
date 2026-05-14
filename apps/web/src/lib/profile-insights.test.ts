import { describe, expect, it } from "vitest";
import type { WebCollection, WebSection, WebSticker } from "./collection";
import { deriveProfileInsights } from "./profile-insights";

describe("deriveProfileInsights", () => {
  it("summarizes overview totals and sorts profile section insights", () => {
    const insights = deriveProfileInsights(
      makeCollection([
        makeSection("brazil", "Brasil", [1, 1, 1]),
        makeSection(
          "one-left-high-percent",
          "One Left High Percent",
          [1, 1, 1, 0],
        ),
        makeSection("one-left-low-percent", "One Left Low Percent", [1, 0]),
        makeSection("three-left", "Three Left", [1, 0, 0, 0]),
        makeSection("large-gap", "Large Gap", [1, 0, 0, 0, 0]),
        makeSection("two-duplicates", "Two Duplicates", [2, 3, 0]),
        makeSection("one-duplicate", "One Duplicate", [2, 0]),
      ]),
    );

    expect(insights.overview).toEqual({
      total: 23,
      have: 12,
      missing: 11,
      duplicates: 3,
      percent: 52,
      sections: 7,
      completedSections: 1,
    });
    expect(insights.completedSections.map((section) => section.slug)).toEqual([
      "brazil",
    ]);
    expect(insights.nearlyComplete.map((section) => section.slug)).toEqual([
      "one-left-high-percent",
      "two-duplicates",
      "one-left-low-percent",
      "one-duplicate",
      "three-left",
    ]);
    expect(insights.biggestGaps.map((section) => section.slug)).toEqual([
      "large-gap",
      "three-left",
      "one-left-high-percent",
      "two-duplicates",
      "one-left-low-percent",
      "one-duplicate",
    ]);
    expect(insights.duplicateSections.map((section) => section.slug)).toEqual([
      "two-duplicates",
      "one-duplicate",
    ]);
  });

  it("marks achievements as unlocked or locked with capped display progress", () => {
    const completedSections = Array.from({ length: 10 }, (_, index) =>
      makeSection(`complete-${index}`, `Complete ${index}`, [1, 1]),
    );
    const insights = deriveProfileInsights(
      makeCollection([
        makeSection("brasil", "Brasil", [2, 1]),
        ...completedSections,
        makeSection("missing", "Missing", [1, 0]),
      ]),
    );
    const achievements = Object.fromEntries(
      insights.achievements.map((achievement) => [achievement.id, achievement]),
    );

    expect(achievements["first-sticker"]).toMatchObject({
      progress: 1,
      target: 1,
      unlocked: true,
    });
    expect(achievements["hundred-stickers"]).toMatchObject({
      progress: 23,
      target: 100,
      unlocked: false,
    });
    expect(achievements["quarter-album"]).toMatchObject({
      progress: 25,
      target: 25,
      unlocked: true,
    });
    expect(achievements["complete-album"]).toMatchObject({
      progress: 96,
      target: 100,
      unlocked: false,
    });
    expect(achievements["ten-sections-complete"]).toMatchObject({
      progress: 10,
      target: 10,
      unlocked: true,
    });
    expect(achievements["brazil-complete"]).toMatchObject({
      progress: 1,
      target: 1,
      unlocked: true,
    });
    expect(achievements["duplicate-trader"]).toMatchObject({
      progress: 1,
      target: 10,
      unlocked: false,
    });
  });
});

function makeCollection(sections: WebSection[]): WebCollection {
  return {
    slug: "world-cup",
    name: "World Cup",
    baseStickerCount: sections.reduce(
      (sum, section) => sum + section.stickers.length,
      0,
    ),
    trackedStickerCount: sections.reduce(
      (sum, section) => sum + section.stickers.length,
      0,
    ),
    summary: {
      base: { total: 0, have: 0, missing: 0, duplicates: 0, percent: 0 },
      tracked: { total: 0, have: 0, missing: 0, duplicates: 0, percent: 0 },
    },
    sections,
  };
}

function makeSection(
  slug: string,
  name: string,
  quantities: number[],
): WebSection {
  return {
    slug,
    name,
    kind: "TEAM",
    stickers: quantities.map((quantity, index) =>
      makeSticker(slug, index + 1, quantity),
    ),
  };
}

function makeSticker(
  sectionSlug: string,
  localNumber: number,
  quantity: number,
): WebSticker {
  return {
    code: `${sectionSlug.toUpperCase()}${localNumber}`,
    localNumber,
    label: `${sectionSlug} ${localNumber}`,
    isBaseAlbum: true,
    special: false,
    quantity,
  };
}
