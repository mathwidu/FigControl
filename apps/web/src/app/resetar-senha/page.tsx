import { Suspense } from 'react';
import { PasswordResetPage } from '../../components/PasswordResetPage';

export default function Page() {
  return (
    <Suspense fallback={<section className="auth-panel">Carregando...</section>}>
      <PasswordResetPage />
    </Suspense>
  );
}
