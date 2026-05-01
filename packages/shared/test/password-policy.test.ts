import { describe, expect, it } from 'vitest';
import { evaluatePasswordPolicy, PASSWORD_REQUIREMENTS } from '../src';

describe('evaluatePasswordPolicy', () => {
  it('accepts a password with length, uppercase, lowercase, number and symbol', () => {
    const result = evaluatePasswordPolicy('Senha-forte-123!');

    expect(result.valid).toBe(true);
    expect(result.requirements.every((requirement) => requirement.met)).toBe(true);
  });

  it('reports each missing password requirement', () => {
    const result = evaluatePasswordPolicy('senhaforte');

    expect(result.valid).toBe(false);
    expect(result.requirements).toEqual([
      { id: 'minLength', label: 'Pelo menos 8 caracteres', met: true },
      { id: 'uppercase', label: 'Uma letra maiuscula', met: false },
      { id: 'lowercase', label: 'Uma letra minuscula', met: true },
      { id: 'number', label: 'Um numero', met: false },
      { id: 'symbol', label: 'Um simbolo especial', met: false }
    ]);
  });

  it('keeps the public requirement list stable for web and API copy', () => {
    expect(PASSWORD_REQUIREMENTS.map((requirement) => requirement.id)).toEqual([
      'minLength',
      'uppercase',
      'lowercase',
      'number',
      'symbol'
    ]);
  });
});
