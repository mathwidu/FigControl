import { describe, expect, it } from "vitest";
import {
  buildStickerListShareText,
  buildWhatsAppShareText,
} from "../src/index";

describe("buildWhatsAppShareText", () => {
  it("groups missing and duplicate stickers by section", () => {
    const text = buildWhatsAppShareText({
      collectionName: "Copa 2026",
      sections: [
        {
          name: "Brasil",
          stickers: [
            { code: "BRA1", label: "Escudo", quantity: 1 },
            { code: "BRA2", label: "Alisson", quantity: 0 },
            { code: "BRA3", label: "Bento", quantity: 3 },
          ],
        },
        {
          name: "Coca-Cola",
          stickers: [{ code: "CC1", label: "Lionel Messi", quantity: 0 }],
        },
      ],
    });

    expect(text).toContain("Faltam");
    expect(text).toContain("BRA- 2");
    expect(text).toContain("CC- 1");
    expect(text).toContain("Repetidas");
    expect(text).toContain("BRA- 3 (2)");
  });
});

describe("buildStickerListShareText", () => {
  it("builds a compact missing sticker text grouped by code prefix", () => {
    const text = buildStickerListShareText({
      collectionName: "Copa 2026",
      mode: "missing",
      sections: [
        {
          name: "Brasil",
          stickers: [
            { code: "BRA1", label: "Escudo", quantity: 1 },
            { code: "BRA2", label: "Alisson", quantity: 0 },
          ],
        },
        {
          name: "Alemanha",
          stickers: [{ code: "GER1", label: "Escudo", quantity: 0 }],
        },
      ],
    });

    expect(text).toBe("Faltantes\n\nBRA- 2\nGER- 1");
  });

  it("builds a compact duplicate sticker text grouped by code prefix", () => {
    const text = buildStickerListShareText({
      collectionName: "Copa 2026",
      mode: "duplicates",
      sections: [
        {
          name: "Brasil",
          stickers: [
            { code: "BRA1", label: "Escudo", quantity: 1 },
            { code: "BRA2", label: "Alisson", quantity: 3 },
          ],
        },
        {
          name: "Alemanha",
          stickers: [{ code: "GER1", label: "Escudo", quantity: 2 }],
        },
      ],
    });

    expect(text).toBe("Repetidas\n\nBRA- 2 (2)\nGER- 1");
  });

  it("groups multiple stickers from the same prefix on one line", () => {
    const text = buildStickerListShareText({
      collectionName: "Copa 2026",
      mode: "duplicates",
      sections: [
        {
          name: "FIFA World Cup",
          stickers: [
            { code: "FWC2", label: "Mascote", quantity: 2 },
            { code: "FWC15", label: "Historia", quantity: 2 },
          ],
        },
        {
          name: "Iraq",
          stickers: [{ code: "IRQ18", label: "Jogador", quantity: 3 }],
        },
      ],
    });

    expect(text).toBe("Repetidas\n\nFWC- 2-15\nIRQ- 18 (2)");
  });
});
