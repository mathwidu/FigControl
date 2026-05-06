# Profile and Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user profiles and a total-progress leaderboard while preserving all existing production users.

**Architecture:** Store public profile data separately from authentication data in `user_profiles`, and store ranking-ready collection totals in `user_collection_stats`. The API owns validation, nickname uniqueness, leaderboard eligibility, and stats updates; the web app consumes typed DTOs from `packages/shared`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js App Router, TypeScript, Vitest, npm workspaces.

---

## File Map

- Modify `apps/api/prisma/schema.prisma`: add `UserProfile`, `UserCollectionStats`, and relations.
- Create `apps/api/prisma/migrations/<timestamp>_user_profiles_leaderboard/migration.sql`: migration for profiles and stats.
- Create `apps/api/src/profiles/*`: profile DTOs, service, controller, module, nickname normalization and validation.
- Create `apps/api/src/leaderboard/*`: leaderboard service, controller, module.
- Modify `apps/api/src/collections/collections.service.ts`: update stats after sticker quantity changes.
- Modify `apps/api/src/app.module.ts`: register profile and leaderboard modules.
- Modify `packages/shared/src/index.ts`: add profile and leaderboard DTO types.
- Modify `apps/web/src/lib/api.ts`: add profile and leaderboard API client methods.
- Create `apps/web/src/lib/profile.ts`: frontend helpers for validation messages and state mapping.
- Create `apps/web/src/components/ProfilePage.tsx`: profile form and leaderboard join UI.
- Create `apps/web/src/components/LeaderboardPage.tsx`: ranking view.
- Modify `apps/web/src/components/AlbumApp.tsx`: entry points to profile and leaderboard plus first-profile prompt.
- Create `apps/web/src/app/perfil/page.tsx`: profile route.
- Create `apps/web/src/app/ranking/page.tsx`: leaderboard route.
- Modify `apps/web/src/app/sitemap.ts`: keep `/perfil` and `/ranking` out of the public sitemap because v1 leaderboard is authenticated.
- Modify `apps/web/src/app/robots.ts`: disallow `/perfil` and `/ranking`.
- Modify `apps/web/src/app/termos/page.tsx`: document profile, city, leaderboard, and future exchange intent.
- Modify `apps/web/src/app/privacidade/page.tsx`: document public nickname, public city/state in ranking, and email privacy.
- Modify `apps/web/src/app/sobre/page.tsx`: describe the Fase 2 evolution.
- Add tests under `apps/api/test` and `apps/web/src/lib/*.test.ts`.
- Update `docs/VPS_RUNBOOK.md`: mention migration/backfill validation commands.

## Task 1: Shared Contracts

**Files:**
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/test/profile-leaderboard.test.ts`

- [ ] Add shared types:

```ts
export interface UserProfileDto {
  nickname: string | null;
  cityName: string | null;
  stateCode: string | null;
  exchangeOptIn: boolean;
  leaderboardJoinedAt: string | null;
  profileCompletedAt: string | null;
  leaderboardEligible: boolean;
  leaderboardEligibilityReasons: string[];
}

export interface NicknameAvailabilityDto {
  nickname: string;
  available: boolean;
  reason: string | null;
}

export interface UpdateProfileDto {
  nickname?: string;
  cityName?: string;
  stateCode?: string;
  exchangeOptIn?: boolean;
}

export interface LeaderboardItemDto {
  rank: number;
  nickname: string;
  cityName: string;
  stateCode: string;
  trackedHave: number;
  trackedMissing: number;
  duplicateCount: number;
}

export interface LeaderboardMeDto {
  rank: number | null;
  trackedHave: number;
  trackedMissing: number;
  duplicateCount: number;
  joined: boolean;
  eligible: boolean;
}

export interface LeaderboardDto {
  collectionSlug: string;
  total: number;
  items: LeaderboardItemDto[];
  me: LeaderboardMeDto | null;
}
```

- [ ] Add tests that compile and assert representative DTO shape.
- [ ] Run `npm run test --workspace packages/shared`.
- [ ] Commit with `feat(shared): add profile leaderboard contracts`.

## Task 2: Database Schema and Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_user_profiles_leaderboard/migration.sql`

- [ ] Add `UserProfile` model with `nickname`, `nicknameNormalized`, `cityName`, `stateCode`, `exchangeOptIn`, `leaderboardJoinedAt`, `profileCompletedAt`, timestamps, unique nickname index, and relation to `User`.
- [ ] Add `UserCollectionStats` model with `(userId, collectionId)` primary key, progress counters, `lastProgressAt`, and timestamps.
- [ ] Add relations on `User` and `Collection`.
- [ ] Generate migration with `npm run prisma:migrate --workspace apps/api -- --name user_profiles_leaderboard`.
- [ ] Run `npm run prisma:generate --workspace apps/api`.
- [ ] Commit with `feat(api): add profile leaderboard schema`.

## Task 3: Nickname Normalization and Profile Validation

**Files:**
- Create: `apps/api/src/profiles/profile-validation.ts`
- Test: `apps/api/test/profile-validation.test.ts`

- [ ] Implement `normalizeNickname(value: string): string` using trim, lowercase, Unicode NFD accent removal, internal whitespace collapse, and removal of unsupported symbols.
- [ ] Accept displayed nickname length from 3 to 24 characters.
- [ ] Allow letters, numbers, spaces, underscore, hyphen, and dot in the displayed nickname.
- [ ] Reject reserved names: `admin`, `figcontrol`, `suporte`, `moderador`, `ranking`.
- [ ] Validate Brazilian state code against fixed list: `AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO`.
- [ ] Add tests proving `Matheus`, `matheus`, and `MÁTHEUS` normalize to the same key.
- [ ] Run `npm run test --workspace apps/api -- profile-validation.test.ts`.
- [ ] Commit with `feat(api): add profile validation helpers`.

## Task 4: Profile API

**Files:**
- Create: `apps/api/src/profiles/profiles.dto.ts`
- Create: `apps/api/src/profiles/profiles.service.ts`
- Create: `apps/api/src/profiles/profiles.controller.ts`
- Create: `apps/api/src/profiles/profiles.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/profiles-service.test.ts`

- [ ] Implement `GET /me/profile`.
- [ ] Implement `PATCH /me/profile`.
- [ ] Implement `GET /profiles/nickname-availability?nickname={nickname}`.
- [ ] Implement `POST /me/profile/leaderboard/join`.
- [ ] Enforce leaderboard join rules: verified email, valid nickname, valid city, valid state.
- [ ] Make `leaderboard_joined_at` write-once from normal API flows.
- [ ] Return user-friendly validation errors in Portuguese.
- [ ] Rate-limit nickname availability using existing auth/rate-limit pattern.
- [ ] Add service tests for create, update, duplicate nickname, invalid state, and join eligibility.
- [ ] Run `npm run test --workspace apps/api -- profiles-service.test.ts`.
- [ ] Commit with `feat(api): add user profile endpoints`.

## Task 5: Collection Stats Projection

**Files:**
- Create: `apps/api/src/leaderboard/collection-stats.service.ts`
- Modify: `apps/api/src/collections/collections.service.ts`
- Test: `apps/api/test/collection-stats.test.ts`

- [ ] Implement a service that recalculates one user's stats for one collection.
- [ ] Count `trackedHave` as number of tracked stickers with quantity greater than zero.
- [ ] Count `trackedMissing` as tracked total minus `trackedHave`.
- [ ] Count `baseHave` and `baseMissing` using `isBaseAlbum`.
- [ ] Count `duplicateCount` as sum of `quantity - 1` for quantities greater than one.
- [ ] Update stats after single sticker changes and bulk changes.
- [ ] Preserve existing collection response behavior.
- [ ] Add tests for missing, have, and duplicate quantities.
- [ ] Run `npm run test --workspace apps/api -- collection-stats.test.ts`.
- [ ] Commit with `feat(api): maintain user collection stats`.

## Task 6: Backfill Script

**Files:**
- Create: `apps/api/prisma/backfill-user-collection-stats.ts`
- Modify: `apps/api/package.json`
- Update: `docs/VPS_RUNBOOK.md`

- [ ] Create an idempotent backfill script that finds all users and the `world-cup-2026` collection, then upserts `user_collection_stats`.
- [ ] Add npm script `backfill:collection-stats`.
- [ ] Document VPS command:

```bash
docker service update --force figcontrol-dev_api
docker exec -it "$(docker ps -q --filter name=figcontrol-dev_api | head -n 1)" npm run backfill:collection-stats --workspace apps/api
```

- [ ] Run locally against development database.
- [ ] Commit with `chore(api): add collection stats backfill`.

## Task 7: Leaderboard API

**Files:**
- Create: `apps/api/src/leaderboard/leaderboard.service.ts`
- Create: `apps/api/src/leaderboard/leaderboard.controller.ts`
- Create: `apps/api/src/leaderboard/leaderboard.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/leaderboard-service.test.ts`

- [ ] Implement `GET /leaderboard/world-cup-2026`.
- [ ] Require authentication for v1.
- [ ] Include only profiles with `leaderboard_joined_at IS NOT NULL`.
- [ ] Sort by `tracked_have DESC`, `tracked_missing ASC`, `last_progress_at ASC NULLS LAST`, `leaderboard_joined_at ASC`.
- [ ] Return `me` block for the current user.
- [ ] Add tests for ordering, hidden emails, city/state display, and unjoined user behavior.
- [ ] Run `npm run test --workspace apps/api -- leaderboard-service.test.ts`.
- [ ] Commit with `feat(api): add leaderboard endpoint`.

## Task 8: Web Profile Client and Helpers

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/profile.ts`
- Test: `apps/web/src/lib/profile.test.ts`

- [ ] Add `getProfile`, `updateProfile`, `checkNicknameAvailability`, `joinLeaderboard`, and `getLeaderboard`.
- [ ] Add helper for state list and display labels.
- [ ] Add helper that maps backend eligibility reasons to short UI messages.
- [ ] Add tests for nickname message states and state list.
- [ ] Run `npm run test --workspace apps/web -- profile.test.ts`.
- [ ] Commit with `feat(web): add profile api client`.

## Task 9: Profile Page

**Files:**
- Create: `apps/web/src/components/ProfilePage.tsx`
- Create: `apps/web/src/app/perfil/page.tsx`
- Modify: `apps/web/src/components/AlbumApp.tsx`
- Test: `e2e/album.spec.ts`

- [ ] Build form for nickname, city, state, and exchange interest.
- [ ] Debounce nickname availability check.
- [ ] Show `Entrar no ranking` only when eligible and not joined.
- [ ] Lock ranking opt-out in the UI after join.
- [ ] Keep account email visible only on the private profile page.
- [ ] Run `npm run lint --workspace apps/web`.
- [ ] Commit with `feat(web): add profile page`.

## Task 10: First Profile Prompt

**Files:**
- Modify: `apps/web/src/components/AlbumApp.tsx`
- Create: `apps/web/src/components/ProfilePrompt.tsx`

- [ ] Load profile after authentication.
- [ ] Show prompt once per session for logged-in users with no `profileCompletedAt`.
- [ ] Allow `Agora não` without blocking album use.
- [ ] Link to `/perfil`.
- [ ] Track analytics event `profile_prompt_opened`, `profile_prompt_skipped`, and `profile_saved`.
- [ ] Run `npm run lint --workspace apps/web`.
- [ ] Commit with `feat(web): prompt users to create profile`.

## Task 11: Leaderboard Page

**Files:**
- Create: `apps/web/src/components/LeaderboardPage.tsx`
- Create: `apps/web/src/app/ranking/page.tsx`
- Modify: `apps/web/src/components/AlbumApp.tsx`
- Create: `apps/web/src/lib/leaderboard.ts`
- Test: `apps/web/src/lib/leaderboard.test.ts`

- [ ] Build ranking table/cards responsive for mobile and desktop.
- [ ] Show rank, nickname, city/state, total progress, missing, and duplicates.
- [ ] Highlight current user's row when present.
- [ ] Show CTA to complete profile when `me.joined=false`.
- [ ] Add home entry point to `Ranking`.
- [ ] Add `formatLeaderboardProgress(item, total)` in `apps/web/src/lib/leaderboard.ts` and test it returns strings like `822/994`.
- [ ] Run `npm run build --workspace apps/web`.
- [ ] Commit with `feat(web): add leaderboard page`.

## Task 12: Legal Pages and Admin Metrics

**Files:**
- Modify legal/about pages under `apps/web/src/app/privacidade`, `apps/web/src/app/termos`, and `apps/web/src/app/sobre`.
- Modify: `apps/api/src/admin/admin.service.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/components/AdminDashboardPage.tsx`

- [ ] Update legal copy explaining public nickname, city/state in ranking, and future exchange opt-in.
- [ ] Add admin metrics: profiles created, leaderboard participants, exchange opt-ins.
- [ ] Ensure admin view does not expose unnecessary profile data beyond operational metrics.
- [ ] Run API and web tests.
- [ ] Commit with `feat(admin): report profile leaderboard adoption`.

## Task 13: E2E and Deploy Validation

**Files:**
- Modify: `scripts/smoke-figcontrol.sh`
- Modify: `e2e/album.spec.ts`
- Update: `docs/VPS_RUNBOOK.md`

- [ ] Add smoke check that authenticated user can call `/me/profile`.
- [ ] Add smoke check that `/leaderboard/world-cup-2026` returns HTTP 200 for authenticated smoke user if credentials exist.
- [ ] Document dev deployment sequence: migration, backfill, smoke, manual browser validation.
- [ ] Run:

```bash
npm run lint
npm run test
npm run build
bash scripts/smoke-figcontrol.sh
```

- [ ] Commit with `test: add profile leaderboard smoke checks`.

## Release Notes for Dev

After merging to `dev`, validate:

- Existing user without profile can log in and mark figurinhas.
- New user can create profile.
- Duplicate nickname is rejected even with case/accent differences.
- User can join leaderboard only after profile is complete.
- Leaderboard ranks by total tracked progress.
- City and state appear on leaderboard.
- Email never appears on leaderboard.
- Backfill populated stats for existing production-like data.
