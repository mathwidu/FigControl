import { describe, expect, it } from 'vitest';
import { filterCollectionSections, getOfflineMutationMessage } from './collection';

const sections = [
  {
    slug: 'brazil',
    name: 'Brasil',
    kind: 'TEAM',
    stickers: [
      { code: 'BRA1', localNumber: 1, label: 'Escudo', isBaseAlbum: true, special: true, quantity: 1 },
      { code: 'BRA2', localNumber: 2, label: 'Alisson', isBaseAlbum: true, special: false, quantity: 0 },
      { code: 'BRA3', localNumber: 3, label: 'Bento', isBaseAlbum: true, special: false, quantity: 3 }
    ]
  }
];

describe('filterCollectionSections', () => {
  it('filters missing stickers and searches by code or label', () => {
    const filtered = filterCollectionSections(sections, { filter: 'missing', query: 'alis' });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].stickers.map((sticker) => sticker.code)).toEqual(['BRA2']);
  });

  it('filters duplicate stickers', () => {
    const filtered = filterCollectionSections(sections, { filter: 'duplicates', query: '' });

    expect(filtered[0].stickers.map((sticker) => sticker.code)).toEqual(['BRA3']);
  });
});

describe('getOfflineMutationMessage', () => {
  it('explains that offline mode is read-only', () => {
    expect(getOfflineMutationMessage()).toContain('conectar');
  });
});
