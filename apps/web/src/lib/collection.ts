export type StickerFilter = "all" | "missing" | "have" | "duplicates";
export type StickerOwnershipTab = "missing" | "owned";

export interface WebSticker {
  code: string;
  localNumber: number;
  label: string;
  isBaseAlbum: boolean;
  special: boolean;
  quantity: number;
}

export interface WebSection {
  slug: string;
  name: string;
  kind: string;
  stickers: WebSticker[];
}

export interface WebCollection {
  slug: string;
  name: string;
  baseStickerCount: number;
  trackedStickerCount: number;
  summary: {
    base: ProgressBucket;
    tracked: ProgressBucket;
  };
  sections: WebSection[];
}

export interface ProgressBucket {
  total: number;
  have: number;
  missing: number;
  duplicates: number;
  percent: number;
}

export interface FilterOptions {
  filter: StickerFilter;
  query: string;
}

export function filterCollectionSections(
  sections: WebSection[],
  options: FilterOptions,
): WebSection[] {
  const query = normalize(options.query);

  return sections
    .map((section) => ({
      ...section,
      stickers: section.stickers.filter((sticker) => {
        const matchesFilter =
          options.filter === "all" ||
          (options.filter === "missing" && sticker.quantity === 0) ||
          (options.filter === "have" && sticker.quantity > 0) ||
          (options.filter === "duplicates" && sticker.quantity > 1);
        const matchesQuery =
          query.length === 0 ||
          normalize(sticker.code).includes(query) ||
          normalize(sticker.label).includes(query) ||
          normalize(section.name).includes(query);

        return matchesFilter && matchesQuery;
      }),
    }))
    .filter((section) => section.stickers.length > 0);
}

export function summarizeSectionProgress(section: WebSection): ProgressBucket {
  const total = section.stickers.length;
  const have = section.stickers.filter(
    (sticker) => sticker.quantity > 0,
  ).length;
  const missing = total - have;
  const duplicates = section.stickers.filter(
    (sticker) => sticker.quantity > 1,
  ).length;
  const percent = total === 0 ? 0 : Math.round((have / total) * 100);

  return { total, have, missing, duplicates, percent };
}

export function filterSectionStickersByOwnership(
  section: WebSection,
  tab: StickerOwnershipTab,
): WebSticker[] {
  return section.stickers.filter((sticker) =>
    tab === "missing" ? sticker.quantity === 0 : sticker.quantity > 0,
  );
}

export function getSectionDisplayCode(section: WebSection): string {
  const firstStickerCode = section.stickers[0]?.code;
  const prefix = firstStickerCode?.match(/^[A-Z]+/)?.[0];

  if (prefix) {
    return prefix;
  }

  const initials = section.name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials.slice(0, 3) || section.slug.slice(0, 3).toUpperCase();
}

export function getOfflineMutationMessage(): string {
  return "Voce esta offline. E preciso conectar novamente para alterar sua colecao sincronizada.";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
