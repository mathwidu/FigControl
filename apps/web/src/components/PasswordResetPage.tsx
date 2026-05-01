'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { evaluatePasswordPolicy } from '@figcontrol/shared';
import { FormEvent, useState } from 'react';
import { confirmPasswordReset } from '../lib/api';
import { PasswordField } from './PasswordField';

export function PasswordResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : 'Link de redefinicao invalido.');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!evaluatePasswordPolicy(password).valid) {
      setError('A senha ainda nao cumpre todos os requisitos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmacao de senha precisa ser igual a senha.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password, confirmPassword);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel redefinir sua senha.');
    } finally {
      setSubmitting(false);
    }
  }

  const passwordPolicy = evaluatePasswordPolicy(password);
  const confirmPasswordError =
    confirmPassword && password !== confirmPassword ? 'As senhas precisam ser iguais.' : null;
  const submitDisabled =
    !token || submitting || !passwordPolicy.valid || password !== confirmPassword || confirmPassword.length === 0;

  return (
    <section className="auth-panel" aria-labelledby="reset-title">
      <h1 id="reset-title">Redefinir senha</h1>
      {success ? <div className="notice">Senha redefinida. Voce ja pode entrar.</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {!success ? (
        <form className="form-grid" onSubmit={submit}>
          <PasswordField
            label="Nova senha"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showPolicy
            disabled={!token || submitting}
          />
          <PasswordField
            label="Confirmar senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            error={confirmPasswordError}
            disabled={!token || submitting}
          />
          <button className="text-button primary" type="submit" disabled={submitDisabled}>
            {submitting ? 'Salvando...' : 'Salvar senha'}
          </button>
        </form>
      ) : (
        <Link className="text-button primary" href="/">
          Entrar
        </Link>
      )}
    </section>
  );
}
