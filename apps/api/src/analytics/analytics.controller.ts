import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TrackAnalyticsEventDto } from "./analytics.dto";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics/events")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  async track(
    @CurrentUser() user: RequestUser,
    @Body() dto: TrackAnalyticsEventDto,
  ) {
    await this.analyticsService.track({
      userId: user.id,
      eventType: dto.eventType,
      metadata: dto.metadata,
    });

    return { success: true };
  }
}
