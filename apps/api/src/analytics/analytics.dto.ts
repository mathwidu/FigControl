import { IsIn, IsObject, IsOptional } from "class-validator";
import {
  ANALYTICS_EVENT_TYPES,
  type AnalyticsEventType,
} from "@figcontrol/shared";

export class TrackAnalyticsEventDto {
  @IsIn(ANALYTICS_EVENT_TYPES)
  eventType!: AnalyticsEventType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
