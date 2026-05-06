import { Injectable } from "@nestjs/common";
import type {
  AdminDashboard,
  AdminDailyMetric,
  AdminTopSectionMetric,
  AdminUserMetric,
} from "@figcontrol/shared";
import { PrismaService } from "../prisma/prisma.service";

interface OverviewRow {
  total_users: bigint;
  verified_users: bigint;
  users_with_stickers: bigint;
  active_today: bigint;
  active_7_days: bigint;
  active_30_days: bigint;
  total_marked_stickers: bigint;
  total_sticker_quantity: bigint;
  duplicate_stickers: bigint;
  share_clicks: bigint;
  profile_completed_users: bigint;
  leaderboard_participants: bigint;
  exchange_opt_ins: bigint;
  registered: bigint;
  verified: bigint;
  marked_first_sticker: bigint;
  profile_completed: bigint;
  leaderboard_joined: bigint;
}

interface DailyRow {
  day: Date;
  signups: bigint;
  verified: bigint;
  active_users: bigint;
  sticker_updates: bigint;
  events: bigint;
}

interface TopSectionRow {
  slug: string | null;
  name: string | null;
  value: bigint;
}

interface UserRow {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: Date;
  last_seen_at: Date | null;
  last_sticker_update_at: Date | null;
  marked_stickers: bigint;
  duplicate_stickers: bigint;
  total_quantity: bigint;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AdminDashboard> {
    const [overviewRows, dailyRows, openedRows, markedRows, userRows] =
      await Promise.all([
        this.getOverviewRows(),
        this.getDailyRows(),
        this.getTopOpenedSections(),
        this.getTopMarkedSections(),
        this.getUserRows(),
      ]);
    const overview = overviewRows[0] ?? emptyOverviewRow();

    return {
      generatedAt: new Date().toISOString(),
      overview: {
        totalUsers: toNumber(overview.total_users),
        verifiedUsers: toNumber(overview.verified_users),
        usersWithStickers: toNumber(overview.users_with_stickers),
        activeToday: toNumber(overview.active_today),
        active7Days: toNumber(overview.active_7_days),
        active30Days: toNumber(overview.active_30_days),
        totalMarkedStickers: toNumber(overview.total_marked_stickers),
        totalStickerQuantity: toNumber(overview.total_sticker_quantity),
        duplicateStickers: toNumber(overview.duplicate_stickers),
        shareClicks: toNumber(overview.share_clicks),
        profileCompletedUsers: toNumber(overview.profile_completed_users),
        leaderboardParticipants: toNumber(overview.leaderboard_participants),
        exchangeOptIns: toNumber(overview.exchange_opt_ins),
      },
      funnel: {
        registered: toNumber(overview.registered),
        verified: toNumber(overview.verified),
        markedFirstSticker: toNumber(overview.marked_first_sticker),
        profileCompleted: toNumber(overview.profile_completed),
        leaderboardJoined: toNumber(overview.leaderboard_joined),
      },
      daily: dailyRows.map(toDailyMetric),
      topOpenedSections: openedRows.map(toTopSectionMetric),
      topMarkedSections: markedRows.map(toTopSectionMetric),
      users: userRows.map(toUserMetric),
    };
  }

  private getOverviewRows() {
    return this.prisma.$queryRaw<OverviewRow[]>`
      WITH quantity_by_user AS (
        SELECT
          user_id,
          MAX(updated_at) AS last_sticker_update,
          COUNT(*) FILTER (WHERE quantity > 0) AS marked_stickers,
          COALESCE(SUM(quantity), 0) AS total_quantity,
          COUNT(*) FILTER (WHERE quantity > 1) AS duplicate_stickers
        FROM user_sticker_quantities
        GROUP BY user_id
      ), token_by_user AS (
        SELECT
          user_id,
          MAX(created_at) AS last_token_created
        FROM refresh_tokens
        GROUP BY user_id
      ), event_by_user AS (
        SELECT
          user_id,
          MAX(created_at) AS last_event_created
        FROM analytics_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ), per_user AS (
        SELECT
          u.id,
          u.email_verified_at,
          GREATEST(q.last_sticker_update, t.last_token_created, e.last_event_created) AS last_seen_at,
          COALESCE(q.marked_stickers, 0) AS marked_stickers,
          COALESCE(q.total_quantity, 0) AS total_quantity,
          COALESCE(q.duplicate_stickers, 0) AS duplicate_stickers,
          p.profile_completed_at,
          p.leaderboard_joined_at,
          COALESCE(p.exchange_opt_in, false) AS exchange_opt_in
        FROM users u
        LEFT JOIN quantity_by_user q ON q.user_id = u.id
        LEFT JOIN token_by_user t ON t.user_id = u.id
        LEFT JOIN event_by_user e ON e.user_id = u.id
        LEFT JOIN user_profiles p ON p.user_id = u.id
      ), share_events AS (
        SELECT COUNT(*) AS share_clicks
        FROM analytics_events
        WHERE event_type IN ('share_missing_clicked', 'share_duplicates_clicked')
      )
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS verified_users,
        COUNT(*) FILTER (WHERE marked_stickers > 0) AS users_with_stickers,
        COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '1 day') AS active_today,
        COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '7 days') AS active_7_days,
        COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '30 days') AS active_30_days,
        COALESCE(SUM(marked_stickers), 0) AS total_marked_stickers,
        COALESCE(SUM(total_quantity), 0) AS total_sticker_quantity,
        COALESCE(SUM(duplicate_stickers), 0) AS duplicate_stickers,
        (SELECT share_clicks FROM share_events) AS share_clicks,
        COUNT(*) FILTER (WHERE profile_completed_at IS NOT NULL) AS profile_completed_users,
        COUNT(*) FILTER (WHERE leaderboard_joined_at IS NOT NULL) AS leaderboard_participants,
        COUNT(*) FILTER (WHERE exchange_opt_in = true) AS exchange_opt_ins,
        COUNT(*) AS registered,
        COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS verified,
        COUNT(*) FILTER (WHERE marked_stickers > 0) AS marked_first_sticker,
        COUNT(*) FILTER (WHERE profile_completed_at IS NOT NULL) AS profile_completed,
        COUNT(*) FILTER (WHERE leaderboard_joined_at IS NOT NULL) AS leaderboard_joined
      FROM per_user
    `;
  }

  private getDailyRows() {
    const startDate = daysAgo(29);

    return this.prisma.$queryRaw<DailyRow[]>`
      WITH days AS (
        SELECT generate_series(${startDate}::date, current_date, interval '1 day')::date AS day
      ), user_signups AS (
        SELECT created_at::date AS day, COUNT(*) AS signups
        FROM users
        WHERE created_at >= ${startDate}
        GROUP BY created_at::date
      ), email_verifications AS (
        SELECT email_verified_at::date AS day, COUNT(*) AS verified
        FROM users
        WHERE email_verified_at IS NOT NULL AND email_verified_at >= ${startDate}
        GROUP BY email_verified_at::date
      ), active_events AS (
        SELECT created_at::date AS day, COUNT(DISTINCT user_id) AS active_users, COUNT(*) AS events
        FROM analytics_events
        WHERE created_at >= ${startDate} AND user_id IS NOT NULL
        GROUP BY created_at::date
      ), sticker_events AS (
        SELECT created_at::date AS day, COUNT(*) AS sticker_updates
        FROM analytics_events
        WHERE created_at >= ${startDate}
          AND event_type IN ('sticker_marked_owned', 'sticker_marked_missing', 'duplicate_added', 'duplicate_removed')
        GROUP BY created_at::date
      )
      SELECT
        days.day,
        COALESCE(user_signups.signups, 0) AS signups,
        COALESCE(email_verifications.verified, 0) AS verified,
        COALESCE(active_events.active_users, 0) AS active_users,
        COALESCE(sticker_events.sticker_updates, 0) AS sticker_updates,
        COALESCE(active_events.events, 0) AS events
      FROM days
      LEFT JOIN user_signups ON user_signups.day = days.day
      LEFT JOIN email_verifications ON email_verifications.day = days.day
      LEFT JOIN active_events ON active_events.day = days.day
      LEFT JOIN sticker_events ON sticker_events.day = days.day
      ORDER BY days.day ASC
    `;
  }

  private getTopOpenedSections() {
    return this.prisma.$queryRaw<TopSectionRow[]>`
      SELECT
        metadata ->> 'sectionSlug' AS slug,
        metadata ->> 'sectionName' AS name,
        COUNT(*) AS value
      FROM analytics_events
      WHERE event_type = 'section_opened'
        AND metadata ? 'sectionSlug'
      GROUP BY metadata ->> 'sectionSlug', metadata ->> 'sectionName'
      ORDER BY value DESC, name ASC
      LIMIT 10
    `;
  }

  private getTopMarkedSections() {
    return this.prisma.$queryRaw<TopSectionRow[]>`
      SELECT
        sections.slug,
        sections.name,
        COUNT(*) FILTER (WHERE quantities.quantity > 0) AS value
      FROM user_sticker_quantities quantities
      INNER JOIN stickers ON stickers.id = quantities.sticker_id
      INNER JOIN sticker_sections sections ON sections.id = stickers.section_id
      GROUP BY sections.slug, sections.name
      HAVING COUNT(*) FILTER (WHERE quantities.quantity > 0) > 0
      ORDER BY value DESC, sections.name ASC
      LIMIT 10
    `;
  }

  private getUserRows() {
    return this.prisma.$queryRaw<UserRow[]>`
      WITH quantity_by_user AS (
        SELECT
          user_id,
          MAX(updated_at) AS last_sticker_update_at,
          COUNT(*) FILTER (WHERE quantity > 0) AS marked_stickers,
          COALESCE(SUM(quantity), 0) AS total_quantity,
          COUNT(*) FILTER (WHERE quantity > 1) AS duplicate_stickers
        FROM user_sticker_quantities
        GROUP BY user_id
      ), token_by_user AS (
        SELECT user_id, MAX(created_at) AS last_token_created
        FROM refresh_tokens
        GROUP BY user_id
      ), event_by_user AS (
        SELECT user_id, MAX(created_at) AS last_event_created
        FROM analytics_events
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT
        users.id,
        users.email,
        users.email_verified_at IS NOT NULL AS email_verified,
        users.created_at,
        GREATEST(quantity_by_user.last_sticker_update_at, token_by_user.last_token_created, event_by_user.last_event_created) AS last_seen_at,
        quantity_by_user.last_sticker_update_at,
        COALESCE(quantity_by_user.marked_stickers, 0) AS marked_stickers,
        COALESCE(quantity_by_user.duplicate_stickers, 0) AS duplicate_stickers,
        COALESCE(quantity_by_user.total_quantity, 0) AS total_quantity
      FROM users
      LEFT JOIN quantity_by_user ON quantity_by_user.user_id = users.id
      LEFT JOIN token_by_user ON token_by_user.user_id = users.id
      LEFT JOIN event_by_user ON event_by_user.user_id = users.id
      ORDER BY users.created_at DESC
      LIMIT 100
    `;
  }
}

function toDailyMetric(row: DailyRow): AdminDailyMetric {
  return {
    date: row.day.toISOString().slice(0, 10),
    signups: toNumber(row.signups),
    verified: toNumber(row.verified),
    activeUsers: toNumber(row.active_users),
    stickerUpdates: toNumber(row.sticker_updates),
    events: toNumber(row.events),
  };
}

function toTopSectionMetric(row: TopSectionRow): AdminTopSectionMetric {
  return {
    slug: row.slug ?? "unknown",
    name: row.name ?? row.slug ?? "Sem secao",
    value: toNumber(row.value),
  };
}

function toUserMetric(row: UserRow): AdminUserMetric {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified,
    createdAt: row.created_at.toISOString(),
    lastSeenAt: row.last_seen_at?.toISOString() ?? null,
    lastStickerUpdateAt: row.last_sticker_update_at?.toISOString() ?? null,
    markedStickers: toNumber(row.marked_stickers),
    duplicateStickers: toNumber(row.duplicate_stickers),
    totalQuantity: toNumber(row.total_quantity),
  };
}

function toNumber(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function emptyOverviewRow(): OverviewRow {
  return {
    total_users: 0n,
    verified_users: 0n,
    users_with_stickers: 0n,
    active_today: 0n,
    active_7_days: 0n,
    active_30_days: 0n,
    total_marked_stickers: 0n,
    total_sticker_quantity: 0n,
    duplicate_stickers: 0n,
    share_clicks: 0n,
    profile_completed_users: 0n,
    leaderboard_participants: 0n,
    exchange_opt_ins: 0n,
    registered: 0n,
    verified: 0n,
    marked_first_sticker: 0n,
    profile_completed: 0n,
    leaderboard_joined: 0n,
  };
}
