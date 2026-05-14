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
      phoneNumber: "(51) 99999-9999",
    });

    expect(result).toEqual({
      valid: true,
      normalizedNickname: "matheus_wd",
      normalizedStateCode: "RS",
      normalizedPhoneNumber: "+5551999999999",
      errors: [],
    });
  });

  it("normalizes empty profile phone numbers to null", () => {
    const result = validateProfileInput({ phoneNumber: "   " });

    expect(result).toMatchObject({
      valid: true,
      normalizedPhoneNumber: null,
      errors: [],
    });
  });

  it("rejects invalid Brazilian phone numbers", () => {
    const result = validateProfileInput({ phoneNumber: "12345" });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Informe um telefone brasileiro valido.");
  });
});
