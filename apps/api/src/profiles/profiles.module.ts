import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [AnalyticsModule, AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
