import { describe, expect, it } from 'vitest';
import { summarizeProgress } from '../src/index';

describe('summarizeProgress', () => {
  it('keeps base album progress separate from total tracked collection', () => {
    const summary = summarizeProgress([
      { stickerId: 'base-1', quantity: 1, isBaseAlbum: true },
      { stickerId: 'base-2', quantity: 0, isBaseAlbum: true },
      { stickerId: 'coke-1', quantity: 2, isBaseAlbum: false }
    ]);

    expect(summary.base.total).toBe(2);
    expect(summary.base.have).toBe(1);
    expect(summary.base.missing).toBe(1);
    expect(summary.base.percent).toBe(50);
    expect(summary.tracked.total).toBe(3);
    expect(summary.tracked.have).toBe(2);
    expect(summary.tracked.duplicates).toBe(1);
  });
});
