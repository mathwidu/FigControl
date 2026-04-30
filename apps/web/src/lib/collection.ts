export type StickerFilter = 'all' | 'missing' | 'have' | 'duplicates';

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

export function filterCollectionSections(sections: WebSection[], options: FilterOptions): WebSection[] {
  const query = normalize(options.query);

  return sections
    .map((section) => ({
      ...section,
      stickers: section.stickers.filter((sticker) => {
        const matchesFilter =
          options.filter === 'all' ||
          (options.filter === 'missing' && sticker.quantity === 0) ||
          (options.filter === 'have' && sticker.quantity > 0) ||
          (options.filter === 'duplicates' && sticker.quantity > 1);
        const matchesQuery =
          query.length === 0 ||
          normalize(sticker.code).includes(query) ||
          normalize(sticker.label).includes(query) ||
          normalize(section.name).includes(query);

        return matchesFilter && matchesQuery;
      })
    }))
    .filter((section) => section.stickers.length > 0);
}

export function getOfflineMutationMessage(): string {
  return 'Voce esta offline. E preciso conectar novamente para alterar sua colecao sincronizada.';
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
