import { describe, expect, it } from 'vitest';
import { validateCatalogSeed } from '../src/index';

describe('validateCatalogSeed', () => {
  it('accepts a base album with 48 complete team sections and Coca-Cola extras', () => {
    const sections = Array.from({ length: 48 }, (_, sectionIndex) => ({
      slug: `team-${sectionIndex + 1}`,
      name: `Team ${sectionIndex + 1}`,
      kind: 'TEAM' as const,
      stickers: Array.from({ length: 20 }, (_, stickerIndex) => ({
        code: `T${sectionIndex + 1}-${stickerIndex + 1}`,
        localNumber: stickerIndex + 1,
        label: stickerIndex === 0 ? 'Team Logo' : `Player ${stickerIndex + 1}`,
        isBaseAlbum: true
      }))
    }));

    sections.push({
      slug: 'extras',
      name: 'Extras',
      kind: 'ALBUM_EXTRA',
      stickers: Array.from({ length: 20 }, (_, stickerIndex) => ({
        code: `EX${stickerIndex + 1}`,
        localNumber: stickerIndex + 1,
        label: `Extra ${stickerIndex + 1}`,
        isBaseAlbum: true
      }))
    });

    const result = validateCatalogSeed({
      slug: 'world-cup-2026',
      name: 'FIFA World Cup 2026',
      baseStickerCount: 980,
      trackedStickerCount: 992,
      sections: [
        ...sections,
        {
          slug: 'coca-cola',
          name: 'Coca-Cola',
          kind: 'COCA_COLA',
          stickers: Array.from({ length: 12 }, (_, stickerIndex) => ({
            code: `CC${stickerIndex + 1}`,
            localNumber: stickerIndex + 1,
            label: `Coca-Cola ${stickerIndex + 1}`,
            isBaseAlbum: false
          }))
        }
      ]
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects duplicate sticker codes', () => {
    const result = validateCatalogSeed({
      slug: 'world-cup-2026',
      name: 'FIFA World Cup 2026',
      baseStickerCount: 2,
      trackedStickerCount: 2,
      sections: [
        {
          slug: 'sample',
          name: 'Sample',
          kind: 'ALBUM_EXTRA',
          stickers: [
            { code: 'DUP1', localNumber: 1, label: 'One', isBaseAlbum: true },
            { code: 'DUP1', localNumber: 2, label: 'Two', isBaseAlbum: true }
          ]
        }
      ]
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Sticker code DUP1 is duplicated.');
  });
});
