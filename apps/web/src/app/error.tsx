"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="legal-page error-page" aria-labelledby="error-title">
      <p className="eyebrow">Algo saiu do lugar</p>
      <h1 id="error-title">Nao conseguimos carregar esta tela</h1>
      <p>
        Tente novamente. Se continuar acontecendo, volte para o inicio e abra o
        album de novo.
      </p>
      <div className="button-row">
        <button className="text-button primary" type="button" onClick={reset}>
          Tentar novamente
        </button>
        <Link className="text-button" href="/">
          Voltar ao inicio
        </Link>
      </div>
    </section>
  );
}
