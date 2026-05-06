import { describe, expect, it } from "vitest";
import {
  BRAZILIAN_STATES,
  getProfileEligibilityMessage,
  getStateName,
  isProfileReadyForLeaderboard,
} from "./profile";

describe("profile helpers", () => {
  it("lists Brazilian states for the profile form", () => {
    expect(BRAZILIAN_STATES).toHaveLength(27);
    expect(getStateName("RS")).toBe("Rio Grande do Sul");
    expect(getStateName("xx")).toBe("XX");
  });

  it("detects when the profile can join the leaderboard", () => {
    expect(
      isProfileReadyForLeaderboard({
        nickname: "Matheus",
        cityName: "Porto Alegre",
        stateCode: "RS",
        exchangeOptIn: true,
        leaderboardJoinedAt: null,
        profileCompletedAt: new Date().toISOString(),
        leaderboardEligible: true,
        leaderboardEligibilityReasons: [],
      }),
    ).toBe(true);
  });

  it("explains missing requirements in Portuguese", () => {
    expect(
      getProfileEligibilityMessage({
        nickname: null,
        cityName: "",
        stateCode: null,
        exchangeOptIn: false,
        leaderboardJoinedAt: null,
        profileCompletedAt: null,
        leaderboardEligible: false,
        leaderboardEligibilityReasons: ["NICKNAME_REQUIRED", "CITY_REQUIRED"],
      }),
    ).toBe("Escolha um apelido e informe sua cidade para entrar no ranking.");
  });
});
