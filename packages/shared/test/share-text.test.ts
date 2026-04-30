import { describe, expect, it } from 'vitest';
import { buildWhatsAppShareText } from '../src/index';

describe('buildWhatsAppShareText', () => {
  it('groups missing and duplicate stickers by section', () => {
    const text = buildWhatsAppShareText({
      collectionName: 'Copa 2026',
      sections: [
        {
          name: 'Brasil',
          stickers: [
            { code: 'BRA1', label: 'Escudo', quantity: 1 },
            { code: 'BRA2', label: 'Alisson', quantity: 0 },
            { code: 'BRA3', label: 'Bento', quantity: 3 }
          ]
        },
        {
          name: 'Coca-Cola',
          stickers: [{ code: 'CC1', label: 'Lionel Messi', quantity: 0 }]
        }
      ]
    });

    expect(text).toContain('Faltam');
    expect(text).toContain('Brasil: BRA2');
    expect(text).toContain('Coca-Cola: CC1');
    expect(text).toContain('Repetidas');
    expect(text).toContain('Brasil: BRA3 x2');
  });
});
