import { describe, expect, it } from "vitest";
import {
  isBrazilianStateCode,
  normalizeNickname,
  validateProfileInput,
} from "../src/profiles/profile-validation";

describe("profile validation", () => {
  it("normalizes nicknames for case and accent insensitive uniqueness", () => {
    expect(normalizeNickname(" Matheus ")).toBe("matheus");
    expect(normalizeNickname("matheus")).toBe("matheus");
    expect(normalizeNickname("MÁTHEUS")).toBe("matheus");
  });

  it("rejects reserved and malformed nicknames", () => {
    expect(validateProfileInput({ nickname: "admin" }).valid).toBe(false);
    expect(validateProfileInput({ nickname: "ab" }).valid).toBe(false);
    expect(validateProfileInput({ nickname: "nome@ruim" }).valid).toBe(false);
  });

  it("validates Brazilian state codes", () => {
    expect(isBrazilianStateCode("RS")).toBe(true);
    expect(isBrazilianStateCode("sp")).toBe(true);
    expect(isBrazilianStateCode("ZZ")).toBe(false);
  });

  it("accepts a complete valid profile input", () => {
    const result = validateProfileInput({
      nickname: "Matheus_WD",
      cityName: "Porto Alegre",
      stateCode: "rs",
    });

    expect(result).toEqual({
      valid: true,
      normalizedNickname: "matheus_wd",
      normalizedStateCode: "RS",
      errors: [],
    });
  });
});
