import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthRateLimit } from "../auth/auth-rate-limit.decorator";
import { AuthRateLimitGuard } from "../auth/auth-rate-limit.guard";
import { CurrentUser, RequestUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateProfileRequestDto } from "./profiles.dto";
import { ProfilesService } from "./profiles.service";

const minute = 60_000;

@Controller()
@UseGuards(JwtAuthGuard, AuthRateLimitGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me/profile")
  getProfile(@CurrentUser() user: RequestUser) {
    return this.profilesService.getProfile(user.id);
  }

  @Patch("me/profile")
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileRequestDto,
  ) {
    return this.profilesService.updateProfile(user.id, dto);
  }

  @AuthRateLimit({
    key: "nickname-availability",
    limit: 60,
    windowMs: 15 * minute,
  })
  @Get("profiles/nickname-availability")
  checkNicknameAvailability(
    @CurrentUser() user: RequestUser,
    @Query("nickname") nickname = "",
  ) {
    return this.profilesService.checkNicknameAvailability(user.id, nickname);
  }

  @Post("me/profile/leaderboard/join")
  joinLeaderboard(@CurrentUser() user: RequestUser) {
    return this.profilesService.joinLeaderboard(user.id);
  }
}
