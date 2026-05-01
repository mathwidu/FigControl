"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  LogOut,
  Minus,
  Plus,
  Repeat2,
  Search,
  Share2,
  WifiOff,
} from "lucide-react";
import {
  type CSSProperties,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCollection,
  login,
  refresh,
  register,
  requestEmailVerification,
  requestPasswordReset,
  setStickerQuantity,
  type AuthTokens,
} from "../lib/api";
import {
  filterCollectionSections,
  getOfflineMutationMessage,
  getSectionDisplayCode,
  summarizeSectionProgress,
  type WebCollection,
  type WebSection,
  type WebSticker,
} from "../lib/collection";
import {
  clearAuth,
  loadAuth,
  loadCollection,
  saveAuth,
  saveCollection,
} from "../lib/storage";

type AuthMode = "login" | "register" | "forgot";
type AppView = "album" | "missing" | "duplicates" | "search";
type ListMode = "missing" | "duplicates";

const sectionTones = [
  ["#049a49", "#f6d80e", "#08396d"],
  ["#0a6ebd", "#ffffff", "#d43c32"],
  ["#0b1117", "#f5d84c", "#dc1f26"],
  ["#8b1538", "#ffffff", "#0b6f47"],
  ["#0e8f62", "#ffffff", "#111827"],
  ["#d62828", "#ffffff", "#003049"],
  ["#102a43", "#f0f4f8", "#00a676"],
];

export function AlbumApp() {
  const [auth, setAuth] = useState<AuthTokens | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [collection, setCollection] = useState<WebCollection | null>(null);
  const [view, setView] = useState<AppView>("album");
  const [query, setQuery] = useState("");
  const [activeSectionSlug, setActiveSectionSlug] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
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

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!auth || !isOnline) return;
    void loadRemoteCollection(auth);
  }, [auth, isOnline]);

  useEffect(() => {
    if (!collection || !activeSectionSlug) return;
    if (
      !collection.sections.some((section) => section.slug === activeSectionSlug)
    ) {
      setActiveSectionSlug(null);
    }
  }, [activeSectionSlug, collection]);

  const activeSectionIndex = useMemo(() => {
    if (!collection || !activeSectionSlug) return -1;
    return collection.sections.findIndex(
      (section) => section.slug === activeSectionSlug,
    );
  }, [activeSectionSlug, collection]);

  const activeSection =
    activeSectionIndex >= 0 && collection
      ? collection.sections[activeSectionIndex]
      : null;

  const missingSections = useMemo(
    () =>
      collection
        ? filterCollectionSections(collection.sections, {
            filter: "missing",
            query: "",
          })
        : [],
    [collection],
  );

  const duplicateSections = useMemo(
    () =>
      collection
        ? filterCollectionSections(collection.sections, {
            filter: "duplicates",
            query: "",
          })
        : [],
    [collection],
  );

  const searchedSections = useMemo(
    () =>
      collection
        ? filterCollectionSections(collection.sections, {
            filter: "all",
            query,
          })
        : [],
    [collection, query],
  );

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      if (authMode === "forgot") {
        await requestPasswordReset(email);
        setNotice(
          "Se o email existir, enviamos instrucoes para redefinir a senha.",
        );
        return;
      }

      if (authMode === "register") {
        if (password !== confirmPassword) {
          setError("A confirmacao de senha precisa ser igual a senha.");
          return;
        }
        await register(email, password, confirmPassword);
        setNotice("Conta criada. Verifique seu email antes de entrar.");
        setAuthMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const tokens = await login(email, password);
      saveAuth(tokens);
      setAuth(tokens);
      setPassword("");
      setConfirmPassword("");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Falha na autenticacao.",
      );
    }
  }

  async function resendVerification() {
    setError(null);
    setNotice(null);
    try {
      await requestEmailVerification(email);
      setNotice("Se o email existir, enviamos um novo link de verificacao.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao reenviar verificacao.",
      );
    }
  }

  function switchAuthMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
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
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Falha ao carregar colecao.",
        );
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
      const updated = await setStickerQuantity(
        auth.accessToken,
        sticker.code,
        Math.max(0, nextQuantity),
      );
      saveCollection(updated);
      setCollection(updated);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao salvar figurinha.",
      );
    }
  }

  function cycleQuantity(sticker: WebSticker) {
    const nextQuantity =
      sticker.quantity === 0 ? 1 : sticker.quantity === 1 ? 2 : 0;
    void changeQuantity(sticker, nextQuantity);
  }

  function logout() {
    clearAuth();
    setAuth(null);
    setCollection(null);
    setActiveSectionSlug(null);
  }

  async function install() {
    const promptEvent = installEvent as Event & {
      prompt?: () => Promise<void>;
    };
    await promptEvent.prompt?.();
    setInstallEvent(null);
  }

  function openSection(section: WebSection) {
    setActiveSectionSlug(section.slug);
  }

  function openAdjacentSection(direction: -1 | 1) {
    if (!collection || activeSectionIndex < 0) return;
    const nextIndex =
      (activeSectionIndex + direction + collection.sections.length) %
      collection.sections.length;
    setActiveSectionSlug(collection.sections[nextIndex].slug);
  }

  function copyList(mode: ListMode) {
    if (!collection) return;
    void navigator.clipboard.writeText(buildListShareText(collection, mode));
    setNotice(
      mode === "missing"
        ? "Lista de faltantes copiada."
        : "Lista de repetidas copiada.",
    );
  }

  function shareList(mode: ListMode) {
    if (!collection) return;
    const text = buildListShareText(collection, mode);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!auth) {
    return (
      <section className="auth-panel" aria-labelledby="auth-title">
        <h1 id="auth-title">FigControl Copa 2026</h1>
        <p>
          {authMode === "forgot"
            ? "Informe seu email para receber o link de redefinicao."
            : "Entre para sincronizar sua colecao."}
        </p>
        {notice ? <div className="notice">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
        <form className="form-grid" onSubmit={handleAuth}>
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>
          {authMode !== "forgot" ? (
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
          {authMode === "register" ? (
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
              {authMode === "login"
                ? "Entrar"
                : authMode === "register"
                  ? "Criar conta"
                  : "Enviar link"}
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() =>
                switchAuthMode(authMode === "login" ? "register" : "login")
              }
            >
              {authMode === "login" ? "Criar conta" : "Ja tenho conta"}
            </button>
            {authMode === "login" ? (
              <button
                className="text-button"
                type="button"
                onClick={() => switchAuthMode("forgot")}
              >
                Esqueci minha senha
              </button>
            ) : null}
            {authMode === "login" ? (
              <button
                className="text-button"
                type="button"
                onClick={resendVerification}
              >
                Reenviar verificacao
              </button>
            ) : null}
          </div>
        </form>
      </section>
    );
  }

  if (!collection) {
    return <div className="notice">Carregando colecao...</div>;
  }

  return (
    <div className={`album-app ${activeSection ? "has-active-section" : ""}`}>
      <StatusMessages isOnline={isOnline} notice={notice} error={error} />

      <section className="album-hero" aria-label="Resumo do album">
        <div>
          <p className="eyebrow">Album de figurinhas 2026</p>
          <h1>Controle de Figurinhas 2026</h1>
        </div>
        <div className="hero-actions">
          {installEvent ? (
            <button
              className="icon-button translucent"
              type="button"
              onClick={install}
              title="Instalar"
            >
              <Download size={18} />
            </button>
          ) : null}
          <button
            className="icon-button translucent"
            type="button"
            onClick={logout}
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
        <div className="summary-grid app-summary">
          <Metric
            label="Total"
            value={`${collection.summary.tracked.have}/${collection.summary.tracked.total}`}
          />
          <Metric label="Faltando" value={collection.summary.tracked.missing} />
          <Metric
            label="Repetidas"
            value={collection.summary.tracked.duplicates}
          />
        </div>
        <div
          className="progress-track dark"
          aria-label={`${collection.summary.base.percent}% completo`}
        >
          <div
            className="progress-fill"
            style={{ width: `${collection.summary.base.percent}%` }}
          />
        </div>
      </section>

      <div className="app-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setView("search");
          }}
          placeholder="Buscar selecao, jogador ou codigo"
          aria-label="Buscar figurinhas"
        />
      </div>

      <div className="app-layout">
        <section className="primary-pane" aria-label="Navegacao do album">
          {view === "album" ? (
            <AlbumHome
              collection={collection}
              sections={collection.sections}
              onOpenSection={openSection}
            />
          ) : null}
          {view === "missing" ? (
            <GroupedStickerView
              collection={collection}
              mode="missing"
              sections={missingSections}
              onCopy={() => copyList("missing")}
              onShare={() => shareList("missing")}
              onOpenSection={openSection}
            />
          ) : null}
          {view === "duplicates" ? (
            <GroupedStickerView
              collection={collection}
              mode="duplicates"
              sections={duplicateSections}
              onCopy={() => copyList("duplicates")}
              onShare={() => shareList("duplicates")}
              onOpenSection={openSection}
            />
          ) : null}
          {view === "search" ? (
            <SearchPanel
              query={query}
              setQuery={setQuery}
              sections={searchedSections}
              onOpenSection={openSection}
            />
          ) : null}
        </section>

        {activeSection ? (
          <aside
            className="detail-pane"
            aria-label={`Detalhes de ${activeSection.name}`}
          >
            <SectionDetail
              section={activeSection}
              onBack={() => setActiveSectionSlug(null)}
              onPrevious={() => openAdjacentSection(-1)}
              onNext={() => openAdjacentSection(1)}
              onCycleSticker={cycleQuantity}
              onChangeQuantity={changeQuantity}
            />
          </aside>
        ) : null}
      </div>

      <nav className="bottom-nav" aria-label="Navegacao principal">
        <NavButton
          label="Album"
          active={view === "album"}
          onClick={() => setView("album")}
        />
        <NavButton
          label="Faltando"
          active={view === "missing"}
          onClick={() => setView("missing")}
        />
        <NavButton
          label="Repetidas"
          active={view === "duplicates"}
          onClick={() => setView("duplicates")}
        />
        <NavButton
          label="Busca"
          active={view === "search"}
          onClick={() => setView("search")}
        />
      </nav>
    </div>
  );
}

function StatusMessages({
  isOnline,
  notice,
  error,
}: {
  isOnline: boolean;
  notice: string | null;
  error: string | null;
}) {
  return (
    <>
      {!isOnline ? (
        <div className="notice">
          <WifiOff size={18} /> Offline: leitura cacheada.
        </div>
      ) : null}
      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
    </>
  );
}

function AlbumHome({
  collection,
  sections,
  onOpenSection,
}: {
  collection: WebCollection;
  sections: WebSection[];
  onOpenSection: (section: WebSection) => void;
}) {
  return (
    <div className="album-home">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Selecoes e secoes</p>
          <h2>{collection.name}</h2>
        </div>
        <span>{sections.length} secoes</span>
      </div>
      <div className="section-card-grid">
        {sections.map((section) => (
          <SectionCard
            key={section.slug}
            section={section}
            onOpen={() => onOpenSection(section)}
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  onOpen,
}: {
  section: WebSection;
  onOpen: () => void;
}) {
  const summary = summarizeSectionProgress(section);

  return (
    <button
      className="section-card"
      style={sectionToneStyle(section)}
      type="button"
      onClick={onOpen}
    >
      <div className="flag-card" aria-hidden="true">
        <span>{getSectionDisplayCode(section)}</span>
      </div>
      <div className="section-card-name">{section.name}</div>
      <div className="section-progress">
        <span>
          {summary.have}/{summary.total}
        </span>
        {summary.missing === 0 ? (
          <span>Completo</span>
        ) : (
          <span>{summary.missing} faltam</span>
        )}
      </div>
    </button>
  );
}

function SectionDetail({
  section,
  onBack,
  onPrevious,
  onNext,
  onCycleSticker,
  onChangeQuantity,
}: {
  section: WebSection;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onCycleSticker: (sticker: WebSticker) => void;
  onChangeQuantity: (sticker: WebSticker, nextQuantity: number) => void;
}) {
  const summary = summarizeSectionProgress(section);
  const isComplete = summary.total > 0 && summary.missing === 0;

  return (
    <section
      className={`section-detail ${isComplete ? "complete" : ""}`}
      style={sectionToneStyle(section)}
    >
      <div className="detail-toolbar">
        <button
          className="icon-button translucent"
          type="button"
          onClick={onBack}
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="detail-title">
          <button
            className="icon-button subtle"
            type="button"
            onClick={onPrevious}
            title="Secao anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <h2>{section.name}</h2>
          <button
            className="icon-button subtle"
            type="button"
            onClick={onNext}
            title="Proxima secao"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="detail-visual flag-card" aria-hidden="true">
        <span>{getSectionDisplayCode(section)}</span>
      </div>

      <div className="section-status">
        {isComplete ? (
          <>
            <Check size={18} /> Secao completa
          </>
        ) : (
          `${summary.have}/${summary.total} figurinhas`
        )}
      </div>

      <div className="sticker-grid compact">
        {section.stickers.map((sticker) => (
          <StickerTile
            key={sticker.code}
            sticker={sticker}
            onCycle={() => onCycleSticker(sticker)}
            onDecrease={() => onChangeQuantity(sticker, sticker.quantity - 1)}
            onIncrease={() => onChangeQuantity(sticker, sticker.quantity + 1)}
          />
        ))}
      </div>
    </section>
  );
}

function StickerTile({
  sticker,
  onCycle,
  onDecrease,
  onIncrease,
}: {
  sticker: WebSticker;
  onCycle: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const state =
    sticker.quantity === 0
      ? "missing"
      : sticker.quantity > 1
        ? "duplicate"
        : "have";

  return (
    <article className={`sticker-tile ${state}`}>
      <button
        className="sticker-card-button"
        type="button"
        onClick={onCycle}
        aria-label={`${sticker.code} quantidade ${sticker.quantity}`}
      >
        <span className="sticker-code">{sticker.code}</span>
        <span className="sticker-number">{sticker.localNumber}</span>
        {sticker.quantity > 1 ? (
          <span className="duplicate-badge">x{sticker.quantity - 1}</span>
        ) : null}
      </button>
      <div className="quantity-row">
        <button
          className="quantity-button"
          type="button"
          onClick={onDecrease}
          title={`Diminuir ${sticker.code}`}
        >
          <Minus size={15} />
        </button>
        <div className="quantity-value">
          {sticker.quantity > 1 ? (
            <Repeat2 size={14} />
          ) : sticker.quantity === 1 ? (
            <Check size={14} />
          ) : null}
          {sticker.quantity}
        </div>
        <button
          className="quantity-button primary"
          type="button"
          onClick={onIncrease}
          title={`Aumentar ${sticker.code}`}
        >
          <Plus size={15} />
        </button>
      </div>
    </article>
  );
}

function GroupedStickerView({
  collection,
  mode,
  sections,
  onCopy,
  onShare,
  onOpenSection,
}: {
  collection: WebCollection;
  mode: ListMode;
  sections: WebSection[];
  onCopy: () => void;
  onShare: () => void;
  onOpenSection: (section: WebSection) => void;
}) {
  const title = mode === "missing" ? "Faltando" : "Repetidas";
  const emptyText =
    mode === "missing" ? "Nada faltando." : "Sem repetidas por aqui.";

  return (
    <div className={`grouped-view ${mode}`}>
      <div className="view-heading contrast">
        <div>
          <p className="eyebrow">{collection.name}</p>
          <h2>{title}</h2>
        </div>
        <div className="button-row compact-actions">
          <button
            className="icon-button translucent"
            type="button"
            onClick={onShare}
            title="Enviar no WhatsApp"
          >
            <Share2 size={18} />
          </button>
          <button
            className="text-button translucent"
            type="button"
            onClick={onCopy}
          >
            <Copy size={17} /> Copiar
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="empty-state">
          <Check size={32} />
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="group-list">
          {sections.map((section) => (
            <section className="sticker-group" key={section.slug}>
              <button
                className="group-heading"
                type="button"
                onClick={() => onOpenSection(section)}
              >
                <span>{section.name}</span>
                <span>{section.stickers.length}</span>
              </button>
              <div className="code-pill-grid">
                {section.stickers.map((sticker) => (
                  <button
                    className="code-pill"
                    type="button"
                    key={sticker.code}
                    onClick={() => onOpenSection(section)}
                  >
                    {mode === "duplicates"
                      ? `${sticker.code} x${sticker.quantity - 1}`
                      : sticker.code}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchPanel({
  query,
  setQuery,
  sections,
  onOpenSection,
}: {
  query: string;
  setQuery: (query: string) => void;
  sections: WebSection[];
  onOpenSection: (section: WebSection) => void;
}) {
  return (
    <div className="search-panel">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Busca</p>
          <h2>Encontre figurinhas</h2>
        </div>
        <span>
          {sections.reduce(
            (total, section) => total + section.stickers.length,
            0,
          )}{" "}
          resultados
        </span>
      </div>

      <label className="field mobile-search-field">
        <span>Buscar</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="BRA20, Brazil, jogador"
        />
      </label>

      <div className="search-results">
        {sections.map((section) => (
          <section className="sticker-group light" key={section.slug}>
            <button
              className="group-heading"
              type="button"
              onClick={() => onOpenSection(section)}
            >
              <span>{section.name}</span>
              <span>{section.stickers.length}</span>
            </button>
            <div className="code-pill-grid">
              {section.stickers.map((sticker) => (
                <button
                  className="code-pill soft"
                  type="button"
                  key={sticker.code}
                  onClick={() => onOpenSection(section)}
                >
                  {sticker.code}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
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

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function buildListShareText(collection: WebCollection, mode: ListMode): string {
  const sections = filterCollectionSections(collection.sections, {
    filter: mode,
    query: "",
  });
  const title = mode === "missing" ? "Faltando" : "Repetidas";
  const emptyText = mode === "missing" ? "Nada faltando." : "Sem repetidas.";
  const lines = sections.map((section) => {
    const codes = section.stickers.map((sticker) =>
      mode === "duplicates"
        ? `${sticker.code} x${sticker.quantity - 1}`
        : sticker.code,
    );
    return `${section.name}: ${codes.join(", ")}`;
  });

  return [
    `*${collection.name}*`,
    "",
    `*${title}*`,
    ...(lines.length > 0 ? lines : [emptyText]),
  ].join("\n");
}

function sectionToneStyle(section: WebSection): CSSProperties {
  const tone = sectionTones[hashString(section.slug) % sectionTones.length];

  return {
    "--section-a": tone[0],
    "--section-b": tone[1],
    "--section-c": tone[2],
  } as CSSProperties;
}

function hashString(value: string): number {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}
