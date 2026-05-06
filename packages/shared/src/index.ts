export type SectionKind = "TEAM" | "ALBUM_EXTRA" | "COCA_COLA";

export interface ProgressInput {
  stickerId: string;
  quantity: number;
  isBaseAlbum: boolean;
}

export interface ProgressBucket {
  total: number;
  have: number;
  missing: number;
  duplicates: number;
  percent: number;
}

export interface ProgressSummary {
  base: ProgressBucket;
  tracked: ProgressBucket;
}

export interface ShareSticker {
  code: string;
  label: string;
  quantity: number;
}

export interface ShareSection {
  name: string;
  stickers: ShareSticker[];
}

export interface ShareInput {
  collectionName: string;
  sections: ShareSection[];
}

export type StickerShareMode = "missing" | "duplicates";

export const ANALYTICS_EVENT_TYPES = [
  "user_registered",
  "email_verified",
  "user_logged_in",
  "app_opened",
  "section_opened",
  "sticker_marked_owned",
  "sticker_marked_missing",
  "duplicate_added",
  "duplicate_removed",
  "share_missing_clicked",
  "share_duplicates_clicked",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export interface AdminMetricCard {
  label: string;
  value: number;
  hint?: string;
}

export interface AdminDailyMetric {
  date: string;
  signups: number;
  verified: number;
  activeUsers: number;
  stickerUpdates: number;
  events: number;
}

export interface AdminFunnelMetric {
  registered: number;
  verified: number;
  markedFirstSticker: number;
}

export interface AdminTopSectionMetric {
  slug: string;
  name: string;
  value: number;
}

export interface AdminUserMetric {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  lastStickerUpdateAt: string | null;
  markedStickers: number;
  duplicateStickers: number;
  totalQuantity: number;
}

export interface AdminDashboard {
  generatedAt: string;
  overview: {
    totalUsers: number;
    verifiedUsers: number;
    usersWithStickers: number;
    activeToday: number;
    active7Days: number;
    active30Days: number;
    totalMarkedStickers: number;
    totalStickerQuantity: number;
    duplicateStickers: number;
    shareClicks: number;
  };
  funnel: AdminFunnelMetric;
  daily: AdminDailyMetric[];
  topOpenedSections: AdminTopSectionMetric[];
  topMarkedSections: AdminTopSectionMetric[];
  users: AdminUserMetric[];
}

export interface StickerListShareInput extends ShareInput {
  mode: StickerShareMode;
}

export interface CatalogStickerSeed {
  code: string;
  localNumber: number;
  label: string;
  isBaseAlbum: boolean;
  special?: boolean;
}

export interface CatalogSectionSeed {
  slug: string;
  name: string;
  kind: SectionKind;
  stickers: CatalogStickerSeed[];
}

export interface CatalogSeed {
  slug: string;
  name: string;
  baseStickerCount: number;
  trackedStickerCount: number;
  sources?: string[];
  sections: CatalogSectionSeed[];
}

export interface CatalogValidationResult {
  valid: boolean;
  errors: string[];
}

export type PasswordRequirementId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "symbol";

export interface PasswordRequirement {
  id: PasswordRequirementId;
  label: string;
  test: (password: string) => boolean;
}

export interface PasswordRequirementResult {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
}

export interface PasswordPolicyResult {
  valid: boolean;
  requirements: PasswordRequirementResult[];
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "minLength",
    label: "Pelo menos 8 caracteres",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Uma letra maiuscula",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Uma letra minuscula",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Um numero",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "symbol",
    label: "Um simbolo especial",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    met: requirement.test(password),
  }));

  return {
    valid: requirements.every((requirement) => requirement.met),
    requirements,
  };
}

export function summarizeProgress(items: ProgressInput[]): ProgressSummary {
  const baseItems = items.filter((item) => item.isBaseAlbum);

  return {
    base: summarizeBucket(baseItems),
    tracked: summarizeBucket(items),
  };
}

export function buildWhatsAppShareText(input: ShareInput): string {
  const missingLines = buildCompactStickerLines(input.sections, "missing");
  const duplicateLines = buildCompactStickerLines(input.sections, "duplicates");

  const lines = ["Faltam", ""];
  lines.push(...(missingLines.length > 0 ? missingLines : ["Nada faltando."]));
  lines.push("");
  lines.push("Repetidas");
  lines.push("");
  lines.push(
    ...(duplicateLines.length > 0 ? duplicateLines : ["Sem repetidas."]),
  );

  return lines.join("\n");
}

export function buildStickerListShareText(
  input: StickerListShareInput,
): string {
  const sectionLines = buildCompactStickerLines(input.sections, input.mode);

  const title = input.mode === "missing" ? "Faltantes" : "Repetidas";
  const emptyText =
    input.mode === "missing" ? "Nada faltando." : "Sem repetidas.";

  return [
    title,
    "",
    ...(sectionLines.length > 0 ? sectionLines : [emptyText]),
  ].join("\n");
}

export function validateCatalogSeed(
  seed: CatalogSeed,
): CatalogValidationResult {
  const errors: string[] = [];
  const teamSections = seed.sections.filter(
    (section) => section.kind === "TEAM",
  );
  const baseStickers = seed.sections.flatMap((section) =>
    section.stickers.filter((sticker) => sticker.isBaseAlbum),
  );
  const trackedStickers = seed.sections.flatMap((section) => section.stickers);
  const seenCodes = new Set<string>();

  if (baseStickers.length !== seed.baseStickerCount) {
    errors.push(
      `Base sticker count mismatch: expected ${seed.baseStickerCount}, found ${baseStickers.length}.`,
    );
  }

  if (trackedStickers.length !== seed.trackedStickerCount) {
    errors.push(
      `Tracked sticker count mismatch: expected ${seed.trackedStickerCount}, found ${trackedStickers.length}.`,
    );
  }

  if (seed.baseStickerCount === 980 && teamSections.length !== 48) {
    errors.push(`Expected 48 team sections, found ${teamSections.length}.`);
  }

  for (const section of seed.sections) {
    if (section.kind === "TEAM") {
      const localNumbers = section.stickers
        .map((sticker) => sticker.localNumber)
        .sort((a, b) => a - b);
      const expected = Array.from({ length: 20 }, (_, index) => index + 1);
      if (localNumbers.join(",") !== expected.join(",")) {
        errors.push(
          `Team section ${section.slug} must contain local numbers 1..20.`,
        );
      }
    }

    for (const sticker of section.stickers) {
      if (seenCodes.has(sticker.code)) {
        errors.push(`Sticker code ${sticker.code} is duplicated.`);
      }
      seenCodes.add(sticker.code);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function summarizeBucket(items: ProgressInput[]): ProgressBucket {
  const total = items.length;
  const have = items.filter((item) => item.quantity > 0).length;
  const missing = total - have;
  const duplicates = items.filter((item) => item.quantity > 1).length;
  const percent = total === 0 ? 0 : Math.round((have / total) * 100);

  return { total, have, missing, duplicates, percent };
}

function formatStickerForMode(
  sticker: ShareSticker,
  mode: StickerShareMode,
): string | null {
  if (mode === "missing") {
    return sticker.quantity === 0 ? formatStickerNumber(sticker.code) : null;
  }

  return sticker.quantity > 1
    ? formatStickerNumber(sticker.code, sticker.quantity - 1)
    : null;
}

function buildCompactStickerLines(
  sections: ShareSection[],
  mode: StickerShareMode,
): string[] {
  return sections
    .map((section) => {
      const grouped = new Map<string, string[]>();

      for (const sticker of section.stickers) {
        const formatted = formatStickerForMode(sticker, mode);
        if (!formatted) continue;

        const prefix = getStickerCodeParts(sticker.code).prefix;
        grouped.set(prefix, [...(grouped.get(prefix) ?? []), formatted]);
      }

      return [...grouped.entries()].map(
        ([prefix, numbers]) => `${prefix}- ${numbers.join("-")}`,
      );
    })
    .flat();
}

function formatStickerNumber(code: string, duplicateCount?: number): string {
  const { number } = getStickerCodeParts(code);
  return duplicateCount && duplicateCount > 1
    ? `${number} (${duplicateCount})`
    : number;
}

function getStickerCodeParts(code: string): { prefix: string; number: string } {
  const match = code.match(/^([A-Za-z]+)(\d+)$/);

  if (!match) {
    return { prefix: code, number: code };
  }

  const [, prefix, rawNumber] = match;
  const normalizedNumber = /^0+$/.test(rawNumber)
    ? rawNumber
    : rawNumber.replace(/^0+/, "");

  return {
    prefix: prefix.toUpperCase(),
    number: normalizedNumber || "0",
  };
}
