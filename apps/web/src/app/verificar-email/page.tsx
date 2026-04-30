import { Suspense } from 'react';
import { EmailVerificationPage } from '../../components/EmailVerificationPage';

export default function Page() {
  return (
    <Suspense fallback={<section className="auth-panel">Carregando...</section>}>
      <EmailVerificationPage />
    </Suspense>
  );
}
