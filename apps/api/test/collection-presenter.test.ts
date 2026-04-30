import { describe, expect, it } from 'vitest';
import { buildCollectionView } from '../src/collections/collection.presenter';

describe('buildCollectionView', () => {
  it('merges catalog stickers with user quantities and summary', () => {
    const view = buildCollectionView(
      {
        slug: 'world-cup-2026',
        name: 'Copa 2026',
        baseStickerCount: 2,
        trackedStickerCount: 3,
        sections: [
          {
            slug: 'brazil',
            name: 'Brasil',
            kind: 'TEAM',
            stickers: [
              { code: 'BRA1', localNumber: 1, label: 'Escudo', isBaseAlbum: true },
              { code: 'BRA2', localNumber: 2, label: 'Alisson', isBaseAlbum: true }
            ]
          },
          {
            slug: 'coca-cola',
            name: 'Coca-Cola',
            kind: 'COCA_COLA',
            stickers: [{ code: 'CC1', localNumber: 1, label: 'Lamine Yamal', isBaseAlbum: false }]
          }
        ]
      },
      new Map([
        ['BRA1', 1],
        ['CC1', 2]
      ])
    );

    expect(view.summary.base).toMatchObject({ total: 2, have: 1, missing: 1 });
    expect(view.summary.tracked).toMatchObject({ total: 3, have: 2, duplicates: 1 });
    expect(view.sections[1].stickers[0].quantity).toBe(2);
  });
});
