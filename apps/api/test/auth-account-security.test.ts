import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { buildEmailVerificationMessage, buildPasswordResetMessage } from '../src/auth/email-messages';
import { assertPasswordsMatch } from '../src/auth/passwords';

describe('password confirmation', () => {
  it('rejects account flows when password confirmation differs', () => {
    expect(() => assertPasswordsMatch('senha-forte-123', 'senha-diferente-123')).toThrow(BadRequestException);
  });

  it('accepts matching password confirmation', () => {
    expect(() => assertPasswordsMatch('senha-forte-123', 'senha-forte-123')).not.toThrow();
  });
});

describe('auth email messages', () => {
  it('builds an email verification message with a web confirmation link', () => {
    const message = buildEmailVerificationMessage({
      appUrl: 'https://figcontrol.matheusduarte.dev.br',
      token: 'verify-token'
    });

    expect(message.subject).toBe('Confirme seu email no FigControl');
    expect(message.text).toContain('https://figcontrol.matheusduarte.dev.br/verificar-email?token=verify-token');
    expect(message.html).toContain('verificar-email?token=verify-token');
  });

  it('builds a password reset message with a web reset link', () => {
    const message = buildPasswordResetMessage({
      appUrl: 'https://figcontrol.matheusduarte.dev.br',
      token: 'reset-token'
    });

    expect(message.subject).toBe('Redefina sua senha do FigControl');
    expect(message.text).toContain('https://figcontrol.matheusduarte.dev.br/resetar-senha?token=reset-token');
    expect(message.html).toContain('resetar-senha?token=reset-token');
  });
});
