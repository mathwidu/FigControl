import type { LeaderboardItemDto } from "@figcontrol/shared";

export const LEADERBOARD_TOTAL_STICKERS = 994;

export function formatLeaderboardProgress(
  item: LeaderboardItemDto,
  total = LEADERBOARD_TOTAL_STICKERS,
): string {
  return `${item.trackedHave}/${total}`;
}

export function formatLeaderboardLocation(
  item: LeaderboardItemDto,
): string {
  return `${item.cityName}, ${item.stateCode}`;
}

export function getLeaderboardMedalLabel(rank: number): string {
  return `${rank}º`;
}
