'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { confirmPasswordReset } from '../lib/api';

export function PasswordResetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : 'Link de redefinicao invalido.');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('A confirmacao de senha precisa ser igual a senha.');
      return;
    }

    try {
      await confirmPasswordReset(token, password, confirmPassword);
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel redefinir sua senha.');
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="reset-title">
      <h1 id="reset-title">Redefinir senha</h1>
      {success ? <div className="notice">Senha redefinida. Voce ja pode entrar.</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {!success ? (
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Nova senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              required
              disabled={!token}
            />
          </label>
          <label className="field">
            <span>Confirmar senha</span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              minLength={8}
              required
              disabled={!token}
            />
          </label>
          <button className="text-button primary" type="submit" disabled={!token}>
            Salvar senha
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
