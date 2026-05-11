import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { CollectionStatsService } from "../leaderboard/collection-stats.service";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [AnalyticsModule, AuthModule],
  controllers: [ProfilesController],
  providers: [CollectionStatsService, ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
