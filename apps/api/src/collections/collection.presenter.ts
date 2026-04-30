import { summarizeProgress, type CatalogSeed, type ProgressSummary } from '@figcontrol/shared';

export interface CollectionStickerView {
  code: string;
  localNumber: number;
  label: string;
  isBaseAlbum: boolean;
  special: boolean;
  quantity: number;
}

export interface CollectionSectionView {
  slug: string;
  name: string;
  kind: string;
  stickers: CollectionStickerView[];
}

export interface CollectionView {
  slug: string;
  name: string;
  baseStickerCount: number;
  trackedStickerCount: number;
  summary: ProgressSummary;
  sections: CollectionSectionView[];
}

export function buildCollectionView(seed: CatalogSeed, quantitiesByCode: Map<string, number>): CollectionView {
  const sections = seed.sections.map((section) => ({
    slug: section.slug,
    name: section.name,
    kind: section.kind,
    stickers: section.stickers.map((sticker) => ({
      code: sticker.code,
      localNumber: sticker.localNumber,
      label: sticker.label,
      isBaseAlbum: sticker.isBaseAlbum,
      special: sticker.special ?? false,
      quantity: Math.max(0, quantitiesByCode.get(sticker.code) ?? 0)
    }))
  }));

  const summary = summarizeProgress(
    sections.flatMap((section) =>
      section.stickers.map((sticker) => ({
        stickerId: sticker.code,
        quantity: sticker.quantity,
        isBaseAlbum: sticker.isBaseAlbum
      }))
    )
  );

  return {
    slug: seed.slug,
    name: seed.name,
    baseStickerCount: seed.baseStickerCount,
    trackedStickerCount: seed.trackedStickerCount,
    summary,
    sections
  };
}
