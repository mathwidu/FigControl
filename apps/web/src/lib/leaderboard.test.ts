import { describe, expect, it } from "vitest";
import {
  formatLeaderboardLocation,
  formatLeaderboardProgress,
  getLeaderboardMedalLabel,
} from "./leaderboard";

describe("leaderboard helpers", () => {
  it("formats total progress", () => {
    expect(
      formatLeaderboardProgress({
        rank: 4,
        nickname: "FigHunter",
        cityName: "Caxias do Sul",
        stateCode: "RS",
        trackedHave: 622,
        trackedMissing: 372,
        duplicateCount: 8,
      }),
    ).toBe("622/994");
  });

  it("formats city and state", () => {
    expect(
      formatLeaderboardLocation({
        rank: 1,
        nickname: "Matheus",
        cityName: "Porto Alegre",
        stateCode: "RS",
        trackedHave: 994,
        trackedMissing: 0,
        duplicateCount: 0,
      }),
    ).toBe("Porto Alegre, RS");
  });

  it("labels podium positions", () => {
    expect(getLeaderboardMedalLabel(1)).toBe("1º");
    expect(getLeaderboardMedalLabel(12)).toBe("12º");
  });
});
