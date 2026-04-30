'use client';

import { buildWhatsAppShareText } from '@figcontrol/shared';
import {
  Check,
  Copy,
  Download,
  LogOut,
  Minus,
  Plus,
  Repeat2,
  Search,
  Share2,
  WifiOff
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getCollection,
  login,
  refresh,
  register,
  requestEmailVerification,
  requestPasswordReset,
  setStickerQuantity,
  type AuthTokens
} from '../lib/api';
import {
  filterCollectionSections,
  getOfflineMutationMessage,
  type StickerFilter,
  type WebCollection,
  type WebSticker
} from '../lib/collection';
import { clearAuth, loadAuth, loadCollection, saveAuth, saveCollection } from '../lib/storage';

type AuthMode = 'login' | 'register' | 'forgot';

export function AlbumApp() {
  const [auth, setAuth] = useState<AuthTokens | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [collection, setCollection] = useState<WebCollection | null>(null);
  const [filter, setFilter] = useState<StickerFilter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  useEffect(() => {
    setAuth(loadAuth());
    setCollection(loadCollection());
    setIsOnline(navigator.onLine);

    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    const beforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('beforeinstallprompt', beforeInstallPrompt);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
    }

    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('beforeinstallprompt', beforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!auth || !isOnline) return;
    void loadRemoteCollection(auth);
  }, [auth, isOnline]);

  const filteredSections = useMemo(
    () => (collection ? filterCollectionSections(collection.sections, { filter, query }) : []),
    [collection, filter, query]
  );

  const shareText = useMemo(() => {
    if (!collection) return '';
    return buildWhatsAppShareText({
      collectionName: collection.name,
      sections: collection.sections.map((section) => ({
        name: section.name,
        stickers: section.stickers.map((sticker) => ({
          code: sticker.code,
          label: sticker.label,
          quantity: sticker.quantity
        }))
      }))
    });
  }, [collection]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      if (authMode === 'forgot') {
        await requestPasswordReset(email);
        setNotice('Se o email existir, enviamos instrucoes para redefinir a senha.');
        return;
      }

      if (authMode === 'register') {
        if (password !== confirmPassword) {
          setError('A confirmacao de senha precisa ser igual a senha.');
          return;
        }
        await register(email, password, confirmPassword);
        setNotice('Conta criada. Verifique seu email antes de entrar.');
        setAuthMode('login');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      const tokens = await login(email, password);
      saveAuth(tokens);
      setAuth(tokens);
      setPassword('');
      setConfirmPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Falha na autenticacao.');
    }
  }

  async function resendVerification() {
    setError(null);
    setNotice(null);
    try {
      await requestEmailVerification(email);
      setNotice('Se o email existir, enviamos um novo link de verificacao.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao reenviar verificacao.');
    }
  }

  function switchAuthMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmPassword('');
  }

  async function loadRemoteCollection(tokens: AuthTokens) {
    setError(null);
    try {
      const remote = await getCollection(tokens.accessToken);
      saveCollection(remote);
      setCollection(remote);
    } catch (requestError) {
      try {
        const refreshed = await refresh(tokens.refreshToken);
        saveAuth(refreshed);
        setAuth(refreshed);
        const remote = await getCollection(refreshed.accessToken);
        saveCollection(remote);
        setCollection(remote);
      } catch {
        setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar colecao.');
      }
    }
  }

  async function changeQuantity(sticker: WebSticker, nextQuantity: number) {
    if (!auth) return;
    if (!isOnline) {
      setNotice(getOfflineMutationMessage());
      return;
    }

    setNotice(null);
    setError(null);

    try {
      const updated = await setStickerQuantity(auth.accessToken, sticker.code, Math.max(0, nextQuantity));
      saveCollection(updated);
      setCollection(updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao salvar figurinha.');
    }
  }

  function logout() {
    clearAuth();
    setAuth(null);
    setCollection(null);
  }

  async function install() {
    const promptEvent = installEvent as Event & { prompt?: () => Promise<void> };
    await promptEvent.prompt?.();
    setInstallEvent(null);
  }

  if (!auth) {
    return (
      <section className="auth-panel" aria-labelledby="auth-title">
        <h1 id="auth-title">FigControl Copa 2026</h1>
        <p>
          {authMode === 'forgot'
            ? 'Informe seu email para receber o link de redefinicao.'
            : 'Entre para sincronizar sua colecao.'}
        </p>
        {notice ? <div className="notice">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
        <form className="form-grid" onSubmit={handleAuth}>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          {authMode !== 'forgot' ? (
            <label className="field">
              <span>Senha</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                required
              />
            </label>
          ) : null}
          {authMode === 'register' ? (
            <label className="field">
              <span>Confirmar senha</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                minLength={8}
                required
              />
            </label>
          ) : null}
          <div className="button-row">
            <button className="text-button primary" type="submit">
              {authMode === 'login' ? 'Entrar' : authMode === 'register' ? 'Criar conta' : 'Enviar link'}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Criar conta' : 'Ja tenho conta'}
            </button>
            {authMode === 'login' ? (
              <button className="text-button" type="button" onClick={() => switchAuthMode('forgot')}>
                Esqueci minha senha
              </button>
            ) : null}
            {authMode === 'login' ? (
              <button className="text-button" type="button" onClick={resendVerification}>
                Reenviar verificacao
              </button>
            ) : null}
          </div>
        </form>
      </section>
    );
  }

  return (
    <>
      {!isOnline ? (
        <div className="notice">
          <WifiOff size={18} /> Offline: leitura cacheada.
        </div>
      ) : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {collection ? (
        <>
          <section className="summary-band" aria-label="Resumo">
            <div className="summary-grid">
              <Metric label="Base" value={`${collection.summary.base.have}/${collection.summary.base.total}`} />
              <Metric label="Faltam" value={collection.summary.base.missing} />
              <Metric label="Repetidas" value={collection.summary.tracked.duplicates} />
              <Metric label="Total" value={`${collection.summary.tracked.have}/${collection.summary.tracked.total}`} />
            </div>
            <div className="progress-track" aria-label={`${collection.summary.base.percent}% completo`}>
              <div className="progress-fill" style={{ width: `${collection.summary.base.percent}%` }} />
            </div>
          </section>

          <section className="toolbar" aria-label="Controles">
            <label className="field">
              <span>Buscar</span>
              <div style={{ position: 'relative' }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  className="search"
                  style={{ paddingLeft: 38 }}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="BRA20, Brasil, Estévao"
                />
              </div>
            </label>
            <div className="filter-row">
              <FilterButton filter="all" current={filter} onClick={setFilter} label="Todas" />
              <FilterButton filter="missing" current={filter} onClick={setFilter} label="Faltam" />
              <FilterButton filter="have" current={filter} onClick={setFilter} label="Tenho" />
              <FilterButton filter="duplicates" current={filter} onClick={setFilter} label="Repetidas" />
              <button className="icon-button" type="button" onClick={() => setShareOpen((value) => !value)} title="Compartilhar">
                <Share2 size={18} />
              </button>
              {installEvent ? (
                <button className="icon-button" type="button" onClick={install} title="Instalar">
                  <Download size={18} />
                </button>
              ) : null}
              <button className="icon-button danger" type="button" onClick={logout} title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          </section>

          {shareOpen ? (
            <section className="summary-band" aria-label="Compartilhar">
              <textarea className="share-box" readOnly value={shareText} />
              <div className="button-row">
                <button
                  className="text-button primary"
                  type="button"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}
                >
                  <Share2 size={18} /> WhatsApp
                </button>
                <button className="text-button" type="button" onClick={() => navigator.clipboard.writeText(shareText)}>
                  <Copy size={18} /> Copiar
                </button>
              </div>
            </section>
          ) : null}

          <nav className="section-nav" aria-label="Secoes">
            {collection.sections.map((section) => (
              <a className="section-link" key={section.slug} href={`#${section.slug}`}>
                {section.name}
              </a>
            ))}
          </nav>

          <div className="album-list">
            {filteredSections.map((section) => (
              <section className="album-section" id={section.slug} key={section.slug}>
                <div className="section-heading">
                  <div>
                    <h2>{section.name}</h2>
                    <div className="section-kind">{section.kind === 'COCA_COLA' ? 'Coca-Cola' : section.kind}</div>
                  </div>
                  <div className="section-kind">{section.stickers.length} itens</div>
                </div>
                <div className="sticker-grid">
                  {section.stickers.map((sticker) => (
                    <article className={`sticker-tile ${sticker.quantity > 0 ? 'have' : ''}`} key={sticker.code}>
                      <div className="sticker-code">
                        {sticker.code}
                        {sticker.special ? ' especial' : ''}
                      </div>
                      <div className="sticker-label">{sticker.label}</div>
                      <div className="quantity-row">
                        <button
                          className="quantity-button"
                          type="button"
                          onClick={() => changeQuantity(sticker, sticker.quantity - 1)}
                          title="Diminuir"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="quantity-value">
                          {sticker.quantity > 1 ? <Repeat2 size={14} /> : sticker.quantity === 1 ? <Check size={14} /> : null}
                          {sticker.quantity}
                        </div>
                        <button
                          className="quantity-button primary"
                          type="button"
                          onClick={() => changeQuantity(sticker, sticker.quantity + 1)}
                          title="Aumentar"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="notice">Carregando colecao...</div>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function FilterButton({
  filter,
  current,
  label,
  onClick
}: {
  filter: StickerFilter;
  current: StickerFilter;
  label: string;
  onClick: (filter: StickerFilter) => void;
}) {
  return (
    <button
      className={`mode-button ${current === filter ? 'active' : ''}`}
      type="button"
      onClick={() => onClick(filter)}
    >
      {label}
    </button>
  );
}
