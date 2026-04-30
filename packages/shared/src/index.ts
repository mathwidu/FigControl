export type SectionKind = 'TEAM' | 'ALBUM_EXTRA' | 'COCA_COLA';

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

export function summarizeProgress(items: ProgressInput[]): ProgressSummary {
  const baseItems = items.filter((item) => item.isBaseAlbum);

  return {
    base: summarizeBucket(baseItems),
    tracked: summarizeBucket(items)
  };
}

export function buildWhatsAppShareText(input: ShareInput): string {
  const missingLines = input.sections
    .map((section) => {
      const codes = section.stickers
        .filter((sticker) => sticker.quantity === 0)
        .map((sticker) => sticker.code);
      return codes.length > 0 ? `${section.name}: ${codes.join(', ')}` : null;
    })
    .filter((line): line is string => line !== null);

  const duplicateLines = input.sections
    .map((section) => {
      const codes = section.stickers
        .filter((sticker) => sticker.quantity > 1)
        .map((sticker) => `${sticker.code} x${sticker.quantity - 1}`);
      return codes.length > 0 ? `${section.name}: ${codes.join(', ')}` : null;
    })
    .filter((line): line is string => line !== null);

  const lines = [`*${input.collectionName}*`, ''];

  lines.push('*Faltam*');
  lines.push(...(missingLines.length > 0 ? missingLines : ['Nada faltando.']));
  lines.push('');
  lines.push('*Repetidas*');
  lines.push(...(duplicateLines.length > 0 ? duplicateLines : ['Sem repetidas.']));

  return lines.join('\n');
}

export function validateCatalogSeed(seed: CatalogSeed): CatalogValidationResult {
  const errors: string[] = [];
  const teamSections = seed.sections.filter((section) => section.kind === 'TEAM');
  const baseStickers = seed.sections.flatMap((section) =>
    section.stickers.filter((sticker) => sticker.isBaseAlbum)
  );
  const trackedStickers = seed.sections.flatMap((section) => section.stickers);
  const seenCodes = new Set<string>();

  if (baseStickers.length !== seed.baseStickerCount) {
    errors.push(
      `Base sticker count mismatch: expected ${seed.baseStickerCount}, found ${baseStickers.length}.`
    );
  }

  if (trackedStickers.length !== seed.trackedStickerCount) {
    errors.push(
      `Tracked sticker count mismatch: expected ${seed.trackedStickerCount}, found ${trackedStickers.length}.`
    );
  }

  if (seed.baseStickerCount === 980 && teamSections.length !== 48) {
    errors.push(`Expected 48 team sections, found ${teamSections.length}.`);
  }

  for (const section of seed.sections) {
    if (section.kind === 'TEAM') {
      const localNumbers = section.stickers.map((sticker) => sticker.localNumber).sort((a, b) => a - b);
      const expected = Array.from({ length: 20 }, (_, index) => index + 1);
      if (localNumbers.join(',') !== expected.join(',')) {
        errors.push(`Team section ${section.slug} must contain local numbers 1..20.`);
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
    errors
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
