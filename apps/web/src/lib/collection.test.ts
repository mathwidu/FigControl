import { describe, expect, it } from "vitest";
import {
  filterSectionStickersByOwnership,
  filterCollectionSections,
  formatStickerDisplayNumber,
  getOfflineMutationMessage,
  getSectionDisplayCode,
  summarizeSectionProgress,
} from "./collection";

const sections = [
  {
    slug: "brazil",
    name: "Brasil",
    kind: "TEAM",
    stickers: [
      {
        code: "BRA1",
        localNumber: 1,
        label: "Escudo",
        isBaseAlbum: true,
        special: true,
        quantity: 1,
      },
      {
        code: "BRA2",
        localNumber: 2,
        label: "Alisson",
        isBaseAlbum: true,
        special: false,
        quantity: 0,
      },
      {
        code: "BRA3",
        localNumber: 3,
        label: "Bento",
        isBaseAlbum: true,
        special: false,
        quantity: 3,
      },
    ],
  },
];

describe("filterCollectionSections", () => {
  it("filters missing stickers and searches by code or label", () => {
    const filtered = filterCollectionSections(sections, {
      filter: "missing",
      query: "alis",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].stickers.map((sticker) => sticker.code)).toEqual([
      "BRA2",
    ]);
  });

  it("filters duplicate stickers", () => {
    const filtered = filterCollectionSections(sections, {
      filter: "duplicates",
      query: "",
    });

    expect(filtered[0].stickers.map((sticker) => sticker.code)).toEqual([
      "BRA3",
    ]);
  });
});

describe("summarizeSectionProgress", () => {
  it("summarizes a section using sticker ownership state", () => {
    expect(summarizeSectionProgress(sections[0])).toEqual({
      total: 3,
      have: 2,
      missing: 1,
      duplicates: 1,
      percent: 67,
    });
  });
});

describe("filterSectionStickersByOwnership", () => {
  it("keeps every sticker visible in the missing tab to avoid grid shifts", () => {
    expect(
      filterSectionStickersByOwnership(sections[0], "missing").map(
        (sticker) => sticker.code,
      ),
    ).toEqual(["BRA1", "BRA2", "BRA3"]);
  });

  it("returns owned and duplicate stickers for the owned tab", () => {
    expect(
      filterSectionStickersByOwnership(sections[0], "owned").map(
        (sticker) => sticker.code,
      ),
    ).toEqual(["BRA1", "BRA3"]);
  });
});

describe("getSectionDisplayCode", () => {
  it("uses the sticker code prefix when the section has coded stickers", () => {
    expect(getSectionDisplayCode(sections[0])).toBe("BRA");
  });

  it("falls back to initials when the section has no coded stickers", () => {
    expect(
      getSectionDisplayCode({
        slug: "coca-cola",
        name: "Coca-Cola",
        kind: "COCA_COLA",
        stickers: [],
      }),
    ).toBe("CC");
  });
});

describe("formatStickerDisplayNumber", () => {
  it("keeps the FIFA special 00 visible to the user", () => {
    expect(
      formatStickerDisplayNumber({
        code: "FWC00",
        localNumber: 0,
        label: "Panini Logo",
        isBaseAlbum: true,
        special: true,
        quantity: 0,
      }),
    ).toBe("00");
  });

  it("uses the regular local number for normal stickers", () => {
    expect(formatStickerDisplayNumber(sections[0].stickers[1])).toBe("2");
  });
});

describe("getOfflineMutationMessage", () => {
  it("explains that offline mode is read-only", () => {
    expect(getOfflineMutationMessage()).toContain("conectar");
  });
});
