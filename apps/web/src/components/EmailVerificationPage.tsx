'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { confirmEmailVerification } from '../lib/api';

export function EmailVerificationPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Confirmando seu email...' : 'Link de verificacao invalido.');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    confirmEmailVerification(token)
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        setMessage('Email confirmado. Agora voce ja pode entrar.');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Nao foi possivel confirmar seu email.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="auth-panel" aria-labelledby="verify-title">
      <h1 id="verify-title">Verificar email</h1>
      <div className={`notice ${status === 'error' ? 'error' : ''}`}>{message}</div>
      {status === 'success' ? (
        <Link className="text-button primary" href="/">
          Entrar
        </Link>
      ) : null}
    </section>
  );
}
