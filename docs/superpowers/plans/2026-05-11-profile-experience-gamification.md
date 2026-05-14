# Profile Experience and Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/perfil` into a private, useful album hub with contact readiness, progress intelligence, achievements, and clearer mobile navigation.

**Architecture:** Keep phone private in `user_profiles` and do not expose it through leaderboard, admin user lists, or public UI. Use the existing authenticated collection endpoint as the source for personal insights; compute profile stats, section priorities, and achievements in focused web helpers so the API only needs the profile contact contract change. Improve the album section screen with URL-aware section deep links and a visible mobile back affordance.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js App Router, TypeScript, Vitest, npm workspaces.

---

## Scope Decisions

- Phone is optional and private in this release.
- Phone does not affect leaderboard eligibility.
- Phone is saved only to prepare future exchange flows.
- The ranking continues to show only nickname, city, state, and album progress.
- Achievements are calculated from current collection state and are not persisted yet.
- Profile insights are calculated from `GET /me/collection/world-cup-2026`, avoiding a new stats endpoint for this release.
- The profile page must remain useful even before the user joins the ranking.
- The album home can deep-link to a section with `/?section=<sectionSlug>`.

## Execution Status

- [x] Private phone contract added to shared DTOs and API persistence.
- [x] Nullable phone migration created for existing production users.
- [x] Profile insights and achievements derived from the authenticated collection.
- [x] Profile page updated with stats, achievements, section priorities, and private phone UI.
- [x] Album section screen supports `/?section=<sectionSlug>` deep links and a visible back button.
- [x] Privacy, terms, and about copy updated for the private phone and gamification evolution.
- [x] Focused tests, full workspace tests, lint, Prisma validation, API build, and web build passed.
- [x] Desktop and mobile profile render smoke checked with mocked API responses.

## File Map

- Modify `packages/shared/src/index.ts`: add private phone to profile DTOs.
- Modify `packages/shared/test/profile-leaderboard.test.ts`: assert phone remains profile-only.
- Modify `apps/api/prisma/schema.prisma`: add `phone_number` to `user_profiles`.
- Create `apps/api/prisma/migrations/20260511120000_private_profile_phone/migration.sql`: add nullable phone column.
- Modify `apps/api/src/profiles/profile-validation.ts`: add phone normalization and validation.
- Modify `apps/api/src/profiles/profiles.service.ts`: read/write private phone.
- Modify `apps/api/test/profile-validation.test.ts`: phone normalization cases.
- Modify `apps/api/test/profiles-service.test.ts`: profile update with phone and leaderboard privacy.
- Modify `apps/web/src/lib/api.ts`: no new endpoint, but shared type now includes phone.
- Modify `apps/web/src/lib/profile.ts`: add phone formatting helpers and profile readiness copy.
- Create `apps/web/src/lib/profile-insights.ts`: derive stats, priorities, and achievements from `WebCollection`.
- Create `apps/web/src/lib/profile-insights.test.ts`: focused calculation tests.
- Modify `apps/web/src/components/ProfilePage.tsx`: fetch collection, save phone, render insights.
- Create `apps/web/src/components/ProfileStatsPanel.tsx`: overview metrics and progress visual.
- Create `apps/web/src/components/ProfileAchievementsPanel.tsx`: achievements grid.
- Create `apps/web/src/components/ProfileSectionInsights.tsx`: nearly complete, biggest gaps, and duplicate-heavy sections.
- Modify `apps/web/src/components/AlbumApp.tsx`: section deep-link support and clearer mobile back behavior.
- Modify `apps/web/src/app/page.tsx`: wrap album app in `Suspense` for search-param usage.
- Modify `apps/web/src/app/globals.css`: profile hub, achievements, section insights, and mobile back styles.
- Modify `apps/web/src/app/privacidade/page.tsx`: explain private phone storage.
- Modify `apps/web/src/app/termos/page.tsx`: explain future exchange usage.
- Modify `apps/web/src/app/sobre/page.tsx`: describe the profile/gamification evolution.

## Task 1: Shared Profile Contract for Private Phone

**Files:**

- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/test/profile-leaderboard.test.ts`

- [ ] **Step 1: Add phone to shared profile types**

Add `phoneNumber` to `UserProfileDto` and `UpdateProfileDto`:

```ts
export interface UserProfileDto {
  nickname: string | null;
  cityName: string | null;
  stateCode: string | null;
  phoneNumber: string | null;
  exchangeOptIn: boolean;
  leaderboardJoinedAt: string | null;
  profileCompletedAt: string | null;
  leaderboardEligible: boolean;
  leaderboardEligibilityReasons: LeaderboardEligibilityReason[];
}

export interface UpdateProfileDto {
  nickname?: string;
  cityName?: string;
  stateCode?: string;
  phoneNumber?: string | null;
  exchangeOptIn?: boolean;
}
```

- [ ] **Step 2: Add contract test**

Update `packages/shared/test/profile-leaderboard.test.ts` with a profile fixture that includes phone:

```ts
const profile: UserProfileDto = {
  nickname: "mathwidu",
  cityName: "Igrejinha",
  stateCode: "RS",
  phoneNumber: "+5551999999999",
  exchangeOptIn: true,
  leaderboardJoinedAt: null,
  profileCompletedAt: "2026-05-11T12:00:00.000Z",
  leaderboardEligible: true,
  leaderboardEligibilityReasons: [],
};

expect(profile.phoneNumber).toBe("+5551999999999");
```

- [ ] **Step 3: Run shared tests**

Run:

```bash
npm run test --workspace packages/shared -- profile-leaderboard.test.ts
```

Expected: shared profile/leaderboard tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/test/profile-leaderboard.test.ts
git commit -m "feat(shared): add private profile phone contract"
```

## Task 2: Database Migration for Private Phone

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260511120000_private_profile_phone/migration.sql`

- [ ] **Step 1: Update Prisma model**

Add this field to `UserProfile`:

```prisma
phoneNumber String? @map("phone_number")
```

- [ ] **Step 2: Create migration**

Create `apps/api/prisma/migrations/20260511120000_private_profile_phone/migration.sql`:

```sql
ALTER TABLE "user_profiles" ADD COLUMN "phone_number" TEXT;
```

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run prisma:generate --workspace apps/api
```

Expected: Prisma Client generation succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260511120000_private_profile_phone/migration.sql
git commit -m "feat(api): add private phone to user profiles"
```

## Task 3: API Phone Validation and Profile Persistence

**Files:**

- Modify: `apps/api/src/profiles/profile-validation.ts`
- Modify: `apps/api/src/profiles/profiles.service.ts`
- Modify: `apps/api/test/profile-validation.test.ts`
- Modify: `apps/api/test/profiles-service.test.ts`

- [ ] **Step 1: Write phone validation tests**

Add cases to `apps/api/test/profile-validation.test.ts`:

```ts
expect(validateProfileInput({ phoneNumber: "(51) 99999-9999" })).toMatchObject({
  valid: true,
  normalizedPhoneNumber: "+5551999999999",
});

expect(
  validateProfileInput({ phoneNumber: "+55 51 99999-9999" }),
).toMatchObject({
  valid: true,
  normalizedPhoneNumber: "+5551999999999",
});

expect(validateProfileInput({ phoneNumber: "123" })).toMatchObject({
  valid: false,
});

expect(validateProfileInput({ phoneNumber: "" })).toMatchObject({
  valid: true,
  normalizedPhoneNumber: null,
});
```

- [ ] **Step 2: Run validation test to verify failure**

Run:

```bash
npm run test --workspace apps/api -- profile-validation.test.ts
```

Expected: tests fail because phone validation does not exist yet.

- [ ] **Step 3: Implement validation**

In `profile-validation.ts`, add `phoneNumber?: string | null` to the validation input and return `normalizedPhoneNumber: string | null`.

Rules:

- Empty phone becomes `null`.
- Remove spaces, parentheses, hyphens, and dots.
- Accept `+55` prefix or plain Brazilian DDD + number.
- Accept 10 or 11 Brazilian digits after country code normalization.
- Store as `+55` plus digits.
- Reject values that are not Brazilian phone numbers.

Implementation outline:

```ts
export function normalizeBrazilianPhone(
  value: string | null | undefined,
): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  const withoutCountry = digits.startsWith("55") ? digits.slice(2) : digits;

  if (hasPlus && !digits.startsWith("55")) return null;
  if (![10, 11].includes(withoutCountry.length)) return null;
  if (withoutCountry.length === 11 && withoutCountry[2] !== "9") return null;

  return `+55${withoutCountry}`;
}
```

- [ ] **Step 4: Update profile service**

In `ProfilesService`:

- select `phoneNumber` in `findUserWithProfile`;
- compute `nextPhoneNumber` from input or existing profile;
- write `phoneNumber` in `userProfile.upsert`;
- return `phoneNumber` in `toProfileDto`.

Phone must not be required in `getEligibilityReasons`.

- [ ] **Step 5: Add service tests**

Add expectations in `apps/api/test/profiles-service.test.ts`:

```ts
expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
  expect.objectContaining({
    create: expect.objectContaining({
      phoneNumber: "+5551999999999",
    }),
  }),
);
expect(profile.phoneNumber).toBe("+5551999999999");
expect(profile.leaderboardEligible).toBe(true);
```

- [ ] **Step 6: Run API focused tests**

Run:

```bash
npm run test --workspace apps/api -- profile-validation.test.ts profiles-service.test.ts
```

Expected: focused tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/profiles/profile-validation.ts apps/api/src/profiles/profiles.service.ts apps/api/test/profile-validation.test.ts apps/api/test/profiles-service.test.ts
git commit -m "feat(api): validate private profile phone"
```

## Task 4: Web Phone Helpers and Profile Form

**Files:**

- Modify: `apps/web/src/lib/profile.ts`
- Modify: `apps/web/src/components/ProfilePage.tsx`
- Test: `apps/web/src/lib/profile.test.ts`

- [ ] **Step 1: Add frontend phone helper tests**

In `apps/web/src/lib/profile.test.ts`:

```ts
expect(formatProfilePhone("+5551999999999")).toBe("(51) 99999-9999");
expect(formatProfilePhone("+555133334444")).toBe("(51) 3333-4444");
expect(toProfilePhoneInput("+5551999999999")).toBe("51999999999");
```

- [ ] **Step 2: Run helper test to verify failure**

Run:

```bash
npm run test --workspace apps/web -- profile.test.ts
```

Expected: tests fail because phone helpers do not exist yet.

- [ ] **Step 3: Implement helpers**

Add to `apps/web/src/lib/profile.ts`:

```ts
export function toProfilePhoneInput(phoneNumber: string | null): string {
  return phoneNumber?.replace(/^\+55/, "") ?? "";
}

export function formatProfilePhone(phoneNumber: string | null): string {
  const digits = toProfilePhoneInput(phoneNumber);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phoneNumber ?? "";
}
```

- [ ] **Step 4: Update profile form state**

In `ProfilePage.tsx`:

- add `phoneNumber` state;
- hydrate with `toProfilePhoneInput(nextProfile.phoneNumber)`;
- send `phoneNumber` in `updateProfile`;
- add a form field labeled `Celular privado`;
- add helper text `Usaremos isso apenas em futuras trocas. Não aparece no ranking.`

- [ ] **Step 5: Run web focused tests**

Run:

```bash
npm run test --workspace apps/web -- profile.test.ts
npm run lint --workspace apps/web
```

Expected: helper tests and web TypeScript pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/profile.ts apps/web/src/lib/profile.test.ts apps/web/src/components/ProfilePage.tsx
git commit -m "feat(web): add private phone to profile"
```

## Task 5: Profile Insights Helper

**Files:**

- Create: `apps/web/src/lib/profile-insights.ts`
- Create: `apps/web/src/lib/profile-insights.test.ts`

- [ ] **Step 1: Write insight calculation tests**

Create test fixtures with three sections: one complete, one almost complete, and one with duplicates.

Expected behavior:

- completed sections count only sections with `missing === 0`;
- nearly complete sections are missing between 1 and 3 stickers;
- biggest gaps are incomplete sections sorted by missing count descending;
- duplicate sections are sorted by duplicate count descending;
- achievements expose locked and unlocked states.

Example assertion:

```ts
const insights = buildProfileInsights(collection);

expect(insights.overview.completedSections).toBe(1);
expect(insights.nearlyComplete[0]).toMatchObject({
  slug: "brazil",
  missing: 1,
});
expect(insights.biggestGaps[0]).toMatchObject({
  slug: "argentina",
  missing: 20,
});
expect(
  insights.achievements.find((item) => item.id === "first-section-complete"),
).toMatchObject({
  unlocked: true,
});
```

- [ ] **Step 2: Run insight tests to verify failure**

Run:

```bash
npm run test --workspace apps/web -- profile-insights.test.ts
```

Expected: test fails because `profile-insights.ts` does not exist yet.

- [ ] **Step 3: Implement insight types**

Create `apps/web/src/lib/profile-insights.ts` with:

```ts
export interface ProfileSectionInsight {
  slug: string;
  name: string;
  kind: string;
  total: number;
  have: number;
  missing: number;
  duplicates: number;
  percent: number;
}

export interface ProfileAchievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface ProfileInsights {
  overview: {
    total: number;
    have: number;
    missing: number;
    duplicates: number;
    percent: number;
    completedSections: number;
    totalSections: number;
  };
  completedSections: ProfileSectionInsight[];
  nearlyComplete: ProfileSectionInsight[];
  biggestGaps: ProfileSectionInsight[];
  duplicateSections: ProfileSectionInsight[];
  achievements: ProfileAchievement[];
}
```

- [ ] **Step 4: Implement calculations**

Use `summarizeSectionProgress` from `apps/web/src/lib/collection.ts`.

Achievement rules:

- `first-sticker`: have at least 1 sticker.
- `hundred-stickers`: have at least 100 stickers.
- `quarter-album`: progress at least 25%.
- `half-album`: progress at least 50%.
- `three-quarter-album`: progress at least 75%.
- `complete-album`: progress is 100%.
- `first-section-complete`: at least 1 completed section.
- `five-sections-complete`: at least 5 completed sections.
- `ten-sections-complete`: at least 10 completed sections.
- `brazil-complete`: section with slug `brazil` is complete.
- `duplicate-trader`: duplicate count at least 10.

- [ ] **Step 5: Run insight tests**

Run:

```bash
npm run test --workspace apps/web -- profile-insights.test.ts
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/profile-insights.ts apps/web/src/lib/profile-insights.test.ts
git commit -m "feat(web): add profile album insights"
```

## Task 6: Profile Page Data Loading

**Files:**

- Modify: `apps/web/src/components/ProfilePage.tsx`

- [ ] **Step 1: Add collection loading state**

Add `collection` state:

```ts
const [collection, setCollection] = useState<WebCollection | null>(null);
```

- [ ] **Step 2: Fetch profile and collection together**

In the authenticated load path, fetch both:

```ts
const [loadedProfile, loadedCollection] = await Promise.all([
  getProfile(tokens.accessToken),
  getCollection(tokens.accessToken),
]);
applyProfile(loadedProfile);
setCollection(loadedCollection);
```

Repeat the same pattern after token refresh.

- [ ] **Step 3: Build insights in render**

Use:

```ts
const insights = collection ? buildProfileInsights(collection) : null;
```

- [ ] **Step 4: Keep profile usable if collection fails**

If profile loads but collection fails, show the form and a compact notice:

```tsx
{
  !insights ? (
    <div className="notice">
      Não foi possível carregar as estatísticas do álbum agora.
    </div>
  ) : null;
}
```

- [ ] **Step 5: Run web lint**

Run:

```bash
npm run lint --workspace apps/web
```

Expected: TypeScript passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ProfilePage.tsx
git commit -m "feat(web): load collection insights on profile"
```

## Task 7: Profile Stats and Achievements UI

**Files:**

- Create: `apps/web/src/components/ProfileStatsPanel.tsx`
- Create: `apps/web/src/components/ProfileAchievementsPanel.tsx`
- Modify: `apps/web/src/components/ProfilePage.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Create stats panel**

`ProfileStatsPanel` receives `insights: ProfileInsights` and renders:

- `Tenho`;
- `Faltam`;
- `Repetidas`;
- `Seções completas`;
- progress bar using `insights.overview.percent`;
- short helper copy: `Seu álbum está X% completo.`

- [ ] **Step 2: Create achievements panel**

`ProfileAchievementsPanel` receives `achievements: ProfileAchievement[]` and renders a grid:

- unlocked achievements use green/yellow highlight;
- locked achievements use muted border;
- each item shows title, description, and progress like `8/10`.

- [ ] **Step 3: Add profile page composition**

In `ProfilePage.tsx`, render stats and achievements above or beside the form:

```tsx
{
  insights ? (
    <>
      <ProfileStatsPanel insights={insights} />
      <ProfileAchievementsPanel achievements={insights.achievements} />
    </>
  ) : null;
}
```

- [ ] **Step 4: Add CSS classes**

Add classes:

- `.profile-dashboard-grid`;
- `.profile-stat-grid`;
- `.profile-stat-card`;
- `.profile-progress-card`;
- `.achievement-grid`;
- `.achievement-card`;
- `.achievement-card.unlocked`;
- `.achievement-card.locked`.

Mobile rule: grids become one column under `760px`.

- [ ] **Step 5: Run web lint**

Run:

```bash
npm run lint --workspace apps/web
```

Expected: TypeScript passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ProfileStatsPanel.tsx apps/web/src/components/ProfileAchievementsPanel.tsx apps/web/src/components/ProfilePage.tsx apps/web/src/app/globals.css
git commit -m "feat(web): enrich profile with stats and achievements"
```

## Task 8: Actionable Section Insights UI

**Files:**

- Create: `apps/web/src/components/ProfileSectionInsights.tsx`
- Modify: `apps/web/src/components/ProfilePage.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Create section insights component**

Render three useful lists:

- `Quase completas`: top 5 from `insights.nearlyComplete`;
- `Onde falta mais`: top 5 from `insights.biggestGaps`;
- `Repetidas para troca`: top 5 from `insights.duplicateSections`.

Each row shows:

- section name;
- `have/total`;
- missing or duplicate count;
- progress bar;
- link to `/?section=<slug>`.

- [ ] **Step 2: Empty states**

Show useful empty messages:

- nearly complete empty: `Nenhuma seleção está perto de completar ainda.`
- biggest gaps empty: `Todas as seções acompanhadas estão completas.`
- duplicate sections empty: `Nenhuma seção tem repetidas ainda.`

- [ ] **Step 3: Add to profile page**

Render below achievements:

```tsx
{
  insights ? <ProfileSectionInsights insights={insights} /> : null;
}
```

- [ ] **Step 4: Add CSS**

Add classes:

- `.profile-section-insights`;
- `.profile-insight-column`;
- `.profile-insight-row`;
- `.profile-insight-progress`;
- `.profile-insight-action`.

- [ ] **Step 5: Run web lint**

Run:

```bash
npm run lint --workspace apps/web
```

Expected: TypeScript passes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ProfileSectionInsights.tsx apps/web/src/components/ProfilePage.tsx apps/web/src/app/globals.css
git commit -m "feat(web): add actionable profile section insights"
```

## Task 9: Album Section Deep Links and Mobile Back Button

**Files:**

- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/AlbumApp.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Support search params in album route**

If `AlbumApp` uses `useSearchParams`, wrap it in Suspense in `apps/web/src/app/page.tsx`:

```tsx
import { Suspense } from "react";
import { AlbumApp } from "../components/AlbumApp";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="notice">Carregando álbum...</div>}>
      <AlbumApp />
    </Suspense>
  );
}
```

- [ ] **Step 2: Read `section` query in AlbumApp**

In `AlbumApp.tsx`, use `useSearchParams`, `useRouter`, and `usePathname`.

When collection is loaded:

```ts
const requestedSectionSlug = searchParams.get("section");
if (
  requestedSectionSlug &&
  collection.sections.some((section) => section.slug === requestedSectionSlug)
) {
  setActiveSectionSlug(requestedSectionSlug);
}
```

- [ ] **Step 3: Update URL when opening and closing sections**

When opening a section:

```ts
router.replace(`${pathname}?section=${section.slug}`, { scroll: false });
```

When going back:

```ts
router.replace(pathname, { scroll: false });
setActiveSectionSlug(null);
```

- [ ] **Step 4: Add explicit mobile back label**

In `SectionDetail`, change the first toolbar button from icon-only to a visible mobile back control:

```tsx
<button className="detail-back-button" type="button" onClick={onBack}>
  <ArrowLeft size={20} />
  <span>Voltar</span>
</button>
```

On desktop, this can still look compact; on mobile, the label must be visible.

- [ ] **Step 5: CSS for mobile back**

Add:

```css
.detail-back-button {
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  background: #eef7f0;
  color: var(--green-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 950;
}
```

In mobile, make toolbar columns fit:

```css
.detail-toolbar {
  grid-template-columns: auto minmax(0, 1fr);
}
```

- [ ] **Step 6: Run web lint**

Run:

```bash
npm run lint --workspace apps/web
```

Expected: TypeScript passes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/components/AlbumApp.tsx apps/web/src/app/globals.css
git commit -m "feat(web): improve section navigation on mobile"
```

## Task 10: Legal Copy and Privacy Alignment

**Files:**

- Modify: `apps/web/src/app/privacidade/page.tsx`
- Modify: `apps/web/src/app/termos/page.tsx`
- Modify: `apps/web/src/app/sobre/page.tsx`

- [ ] **Step 1: Privacy page**

Add copy explaining:

- phone is private;
- phone is not shown in ranking;
- phone is stored only to prepare future exchange features;
- users can remove phone from profile by clearing the field.

- [ ] **Step 2: Terms page**

Add copy explaining:

- exchange features are not available yet;
- exchange opt-in and phone do not guarantee matches;
- users remain responsible for deciding whether to contact other collectors in future flows.

- [ ] **Step 3: About page**

Add copy explaining:

- profile evolved into a personal album dashboard;
- achievements are a lightweight gamification layer;
- future exchange matching is planned, but not active.

- [ ] **Step 4: Run web lint**

Run:

```bash
npm run lint --workspace apps/web
```

Expected: TypeScript passes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/privacidade/page.tsx apps/web/src/app/termos/page.tsx apps/web/src/app/sobre/page.tsx
git commit -m "docs(web): explain private phone and profile insights"
```

## Task 11: Final Verification

**Files:**

- Review all files changed by previous tasks.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm run test
```

Expected:

- API tests pass.
- Web tests pass.
- Shared tests pass.

- [ ] **Step 2: Run full build**

Run:

```bash
npm run build
```

Expected:

- shared build passes;
- Prisma generate passes;
- API build passes;
- Next build passes.

- [ ] **Step 3: Restore generated Next env noise if needed**

If `apps/web/next-env.d.ts` changes from `./.next/dev/types/routes.d.ts` to `./.next/types/routes.d.ts`, restore the tracked version before commit.

- [ ] **Step 4: Manual QA**

Run local app and verify:

- user can save phone on `/perfil`;
- phone appears formatted only on private profile page;
- ranking does not show phone;
- profile shows stats and achievements;
- profile section links open the correct album section;
- mobile section screen has a visible `Voltar` button;
- clearing phone removes it from the saved profile.

- [ ] **Step 5: Final commit if needed**

If final verification required small fixes:

```bash
git add <changed-files>
git commit -m "fix(web): polish profile experience"
```

- [ ] **Step 6: Push to dev**

```bash
git push origin dev
```

Expected: GitHub Actions starts the dev deploy workflow.
