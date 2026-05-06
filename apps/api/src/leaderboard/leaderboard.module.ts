import { Module } from "@nestjs/common";
import { CollectionStatsService } from "./collection-stats.service";

@Module({
  providers: [CollectionStatsService],
  exports: [CollectionStatsService],
})
export class LeaderboardModule {}
