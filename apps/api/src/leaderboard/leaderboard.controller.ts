import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LeaderboardService } from "./leaderboard.service";

@Controller("leaderboard")
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(":slug")
  getLeaderboard(@CurrentUser() user: RequestUser, @Param("slug") slug: string) {
    return this.leaderboardService.getLeaderboard(user.id, slug);
  }
}
