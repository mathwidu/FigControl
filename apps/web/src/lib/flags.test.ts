import { describe, expect, it } from "vitest";
import { getSectionFlag } from "./flags";

describe("getSectionFlag", () => {
  it("returns the real flag asset for country sections", () => {
    expect(getSectionFlag({ slug: "brazil", name: "Brasil" })).toEqual({
      src: "/flags/br.svg",
      alt: "Bandeira de Brasil",
    });
  });

  it("supports regional teams that have their own football flags", () => {
    expect(getSectionFlag({ slug: "england", name: "England" })?.src).toBe(
      "/flags/gb-eng.svg",
    );
    expect(getSectionFlag({ slug: "scotland", name: "Scotland" })?.src).toBe(
      "/flags/gb-sct.svg",
    );
  });

  it("keeps non-country collection sections on the fallback visual", () => {
    expect(getSectionFlag({ slug: "coca-cola", name: "Coca-Cola" })).toBeNull();
    expect(
      getSectionFlag({ slug: "fifa-world-cup", name: "FIFA World Cup" }),
    ).toBeNull();
  });
});
