import { describe, expect, it, vi } from "vitest";
import { AnalyticsService } from "../src/analytics/analytics.service";

describe("AnalyticsService", () => {
  it("stores a user event with compact metadata", async () => {
    const prisma = {
      analyticsEvent: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    const service = new AnalyticsService(prisma as never);

    await service.track({
      userId: "user-1",
      eventType: "section_opened",
      metadata: {
        sectionSlug: "brazil",
        ignoredNested: { value: "nope" },
        longText: "a".repeat(400),
      },
    });

    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        eventType: "section_opened",
        metadata: {
          sectionSlug: "brazil",
          longText: "a".repeat(160),
        },
      },
    });
  });

  it("does not interrupt the product flow when event storage fails", async () => {
    const prisma = {
      analyticsEvent: {
        create: vi.fn().mockRejectedValue(new Error("storage unavailable")),
      },
    };
    const service = new AnalyticsService(prisma as never);

    await expect(
      service.track({
        userId: "user-1",
        eventType: "app_opened",
      }),
    ).resolves.toBeUndefined();
  });
});
