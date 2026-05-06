import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProfilesModule } from "../profiles/profiles.module";
import { CollectionStatsService } from "./collection-stats.service";
import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";

@Module({
  imports: [AuthModule, ProfilesModule],
  controllers: [LeaderboardController],
  providers: [CollectionStatsService, LeaderboardService],
  exports: [CollectionStatsService],
})
export class LeaderboardModule {}
