import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'FigControl Copa 2026',
  description: 'Controle sincronizado do album Panini FIFA World Cup 2026.',
  applicationName: 'FigControl',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'FigControl Copa 2026',
    description: 'Controle suas figurinhas da Copa 2026 por selecao, faltantes e repetidas.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  themeColor: '#164f63',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link
                href="/"
                className="brand"
                aria-label="FigControl inicio"
                data-home-link
              >
                <div className="brand-mark">FC</div>
                <div>
                  <div className="brand-title">FigControl Copa 2026</div>
                  <div className="brand-subtitle">Album, faltantes e repetidas</div>
                </div>
              </Link>
            </div>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <div className="footer-inner">
              <span>FigControl 2026. Projeto de fã.</span>
              <nav aria-label="Links legais">
                <Link href="/privacidade">Privacidade</Link>
                <Link href="/termos">Termos</Link>
                <Link href="/sobre">Sobre</Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
