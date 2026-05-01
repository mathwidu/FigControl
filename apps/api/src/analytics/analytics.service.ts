import { Injectable } from "@nestjs/common";
import type { AnalyticsEventType } from "@figcontrol/shared";
import { PrismaService } from "../prisma/prisma.service";

interface TrackEventInput {
  userId?: string | null;
  eventType: AnalyticsEventType;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(input: TrackEventInput): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId: input.userId ?? null,
          eventType: input.eventType,
          metadata: sanitizeMetadata(input.metadata),
        },
      });
    } catch {
      // Analytics must not interrupt auth or collection updates.
    }
  }
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!metadata) return undefined;

  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;

    if (typeof value === "string") {
      sanitized[key] = value.slice(0, 160);
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
