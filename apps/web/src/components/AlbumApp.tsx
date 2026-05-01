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
  Share2,
  WifiOff,
  X,
} from "lucide-react";
import {
  buildStickerListShareText,
  evaluatePasswordPolicy,
} from "@figcontrol/shared";
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
  filterSectionStickersByOwnership,
  getOfflineMutationMessage,
  getSectionDisplayCode,
  summarizeSectionProgress,
  type StickerOwnershipTab,
  type WebCollection,
  type WebSection,
  type WebSticker,
} from "../lib/collection";
import { getSectionFlag } from "../lib/flags";
import {
  clearAuth,
  loadAuth,
  loadCollection,
  saveAuth,
  saveCollection,
} from "../lib/storage";
import { PasswordField } from "./PasswordField";

type AuthMode = "login" | "register" | "forgot";
type DetailTab = StickerOwnershipTab;

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
  const [registrationEmail, setRegistrationEmail] = useState<string | null>(
    null,
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [collection, setCollection] = useState<WebCollection | null>(null);
  const [activeSectionSlug, setActiveSectionSlug] = useState<string | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState<DetailTab>("missing");
  const [transferringStickerCode, setTransferringStickerCode] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
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

  useEffect(() => {
    const handleHomeLinkClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return;
      if (!target.closest("[data-home-link]")) return;
      if (window.location.pathname !== "/") return;

      event.preventDefault();
      setActiveSectionSlug(null);
      setDetailTab("missing");
      setTransferringStickerCode(null);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    };

    document.addEventListener("click", handleHomeLinkClick);

    return () => {
      document.removeEventListener("click", handleHomeLinkClick);
    };
  }, []);

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

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setAuthSubmitting(true);
    try {
      if (authMode === "forgot") {
        await requestPasswordReset(email);
        setNotice(
          "Se o email existir, enviamos instrucoes para redefinir a senha.",
        );
        return;
      }

      if (authMode === "register") {
        if (!evaluatePasswordPolicy(password).valid) {
          setError("A senha ainda nao cumpre todos os requisitos.");
          return;
        }
        if (password !== confirmPassword) {
          setError("A confirmacao de senha precisa ser igual a senha.");
          return;
        }
        await register(email, password, confirmPassword);
        setRegistrationEmail(email);
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const tokens = await login(email, password);
      saveAuth(tokens);
      setAuth(tokens);
      setUnverifiedEmail(null);
      setPassword("");
      setConfirmPassword("");
    } catch (authError) {
      const message =
        authError instanceof Error
          ? authError.message
          : "Falha na autenticacao.";
      if (
        authMode === "login" &&
        (message.includes("Email ainda nao verificado") ||
          message.includes("Email not verified"))
      ) {
        setUnverifiedEmail(email.trim());
      }
      setError(message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function resendVerification(targetEmail = email) {
    setError(null);
    setNotice(null);
    setAuthSubmitting(true);
    try {
      await requestEmailVerification(targetEmail);
      setNotice("Se o email existir, enviamos um novo link de verificacao.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao reenviar verificacao.",
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  function switchAuthMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setRegistrationEmail(null);
    setUnverifiedEmail(null);
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

  async function changeQuantity(
    sticker: WebSticker,
    nextQuantity: number,
  ): Promise<boolean> {
    if (!auth) return false;
    if (!isOnline) {
      setNotice(getOfflineMutationMessage());
      return false;
    }

    setNotice("Salvando...");
    setError(null);

    try {
      const updated = await setStickerQuantity(
        auth.accessToken,
        sticker.code,
        Math.max(0, nextQuantity),
      );
      saveCollection(updated);
      setCollection(updated);
      setNotice("Salvo.");
      window.setTimeout(() => {
        setNotice((current) => (current === "Salvo." ? null : current));
      }, 1_600);
      return true;
    } catch (requestError) {
      setNotice(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao salvar figurinha.",
      );
      return false;
    }
  }

  function markMissingAsOwned(sticker: WebSticker) {
    setTransferringStickerCode(sticker.code);
    window.setTimeout(() => {
      void changeQuantity(sticker, 1).finally(() => {
        setTransferringStickerCode(null);
      });
    }, 300);
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
    setDetailTab(
      summarizeSectionProgress(section).missing === 0 ? "owned" : "missing",
    );
  }

  function openAdjacentSection(direction: -1 | 1) {
    if (!collection || activeSectionIndex < 0) return;
    const nextIndex =
      (activeSectionIndex + direction + collection.sections.length) %
      collection.sections.length;
    openSection(collection.sections[nextIndex]);
  }

  function copyText(text: string, message: string) {
    void navigator.clipboard.writeText(text);
    setNotice(message);
  }

  function shareText(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareCollection(mode: "missing" | "duplicates") {
    if (!collection) return;
    shareText(buildCollectionShareText(collection, mode));
  }

  if (!auth) {
    if (registrationEmail) {
      return (
        <section className="auth-panel auth-success" aria-labelledby="auth-title">
          <p className="eyebrow">Conta criada</p>
          <h1 id="auth-title">Verifique seu email</h1>
          <p>
            Enviamos um link de confirmacao para <strong>{registrationEmail}</strong>.
            Depois de confirmar, voce ja pode entrar e sincronizar seu album.
          </p>
          {notice ? <div className="notice">{notice}</div> : null}
          {error ? <div className="notice error">{error}</div> : null}
          <div className="button-row">
            <button
              className="text-button primary"
              type="button"
              onClick={() => {
                setRegistrationEmail(null);
                setAuthMode("login");
                setNotice(null);
                setError(null);
              }}
            >
              Entrar
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => void resendVerification(registrationEmail)}
              disabled={authSubmitting}
            >
              {authSubmitting ? "Enviando..." : "Reenviar email"}
            </button>
          </div>
        </section>
      );
    }

    const passwordPolicy = evaluatePasswordPolicy(password);
    const confirmPasswordError =
      authMode === "register" && confirmPassword && password !== confirmPassword
        ? "As senhas precisam ser iguais."
        : null;
    const submitDisabled =
      authSubmitting ||
      (authMode === "register" &&
        (!passwordPolicy.valid ||
          password.length === 0 ||
          confirmPassword.length === 0 ||
          password !== confirmPassword));

    return (
      <section className="auth-panel" aria-labelledby="auth-title">
        <h1 id="auth-title">FigControl Copa 2026</h1>
        <p>
          {authMode === "forgot"
            ? "Informe seu email para receber o link de redefinicao."
            : "Entre para sincronizar sua colecao."}
        </p>
        {authMode !== "forgot" ? (
          <div className="auth-mode-tabs" role="tablist" aria-label="Modo de acesso">
            <button
              className={authMode === "login" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={authMode === "login"}
              onClick={() => switchAuthMode("login")}
            >
              Entrar
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={authMode === "register"}
              onClick={() => switchAuthMode("register")}
            >
              Criar conta
            </button>
          </div>
        ) : null}
        {notice ? <div className="notice">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
        {authMode === "login" && unverifiedEmail ? (
          <div className="unverified-panel">
            <span>Email pendente de verificacao.</span>
            <button
              className="text-button"
              type="button"
              onClick={() => void resendVerification(unverifiedEmail)}
              disabled={authSubmitting}
            >
              {authSubmitting ? "Enviando..." : "Reenviar email"}
            </button>
          </div>
        ) : null}
        <form className="form-grid" onSubmit={handleAuth}>
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setUnverifiedEmail(null);
              }}
              type="email"
              required
            />
          </label>
          {authMode !== "forgot" ? (
            <PasswordField
              label="Senha"
              value={password}
              onChange={setPassword}
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              showPolicy={authMode === "register"}
              disabled={authSubmitting}
            />
          ) : null}
          {authMode === "register" ? (
            <PasswordField
              label="Confirmar senha"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={confirmPasswordError}
              disabled={authSubmitting}
            />
          ) : null}
          <div className="button-row">
            <button
              className="text-button primary"
              type="submit"
              disabled={submitDisabled}
            >
              {authSubmitting
                ? authMode === "login"
                  ? "Entrando..."
                  : authMode === "register"
                    ? "Criando..."
                    : "Enviando..."
                : authMode === "login"
                  ? "Entrar"
                  : authMode === "register"
                    ? "Criar conta"
                    : "Enviar link"}
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
            {authMode === "login" && !unverifiedEmail ? (
              <button
                className="text-button"
                type="button"
                onClick={() => void resendVerification(email)}
                disabled={authSubmitting}
              >
                Reenviar verificacao
              </button>
            ) : null}
            {authMode === "forgot" ? (
              <button
                className="text-button"
                type="button"
                onClick={() => switchAuthMode("login")}
                disabled={authSubmitting}
              >
                Voltar para entrar
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
            label="Tenho"
            value={`${collection.summary.tracked.have}/${collection.summary.tracked.total}`}
          />
          <Metric label="Faltam" value={collection.summary.tracked.missing} />
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

      <div className="app-layout">
        <section className="primary-pane" aria-label="Navegacao do album">
          <AlbumHome
            collection={collection}
            sections={collection.sections}
            activeSectionSlug={activeSectionSlug}
            onOpenSection={openSection}
            onShareMissing={() => shareCollection("missing")}
            onShareDuplicates={() => shareCollection("duplicates")}
          />
        </section>

        {activeSection ? (
          <aside
            className="detail-pane"
            aria-label={`Detalhes de ${activeSection.name}`}
          >
            <SectionDetail
              collectionName={collection.name}
              section={activeSection}
              activeTab={detailTab}
              transferringStickerCode={transferringStickerCode}
              onBack={() => setActiveSectionSlug(null)}
              onPrevious={() => openAdjacentSection(-1)}
              onNext={() => openAdjacentSection(1)}
              onTabChange={setDetailTab}
              onMarkOwned={markMissingAsOwned}
              onChangeQuantity={changeQuantity}
              onCopyDuplicates={(text) =>
                copyText(text, "Lista de repetidas copiada.")
              }
              onShareDuplicates={shareText}
            />
          </aside>
        ) : null}
      </div>
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
  activeSectionSlug,
  onOpenSection,
  onShareMissing,
  onShareDuplicates,
}: {
  collection: WebCollection;
  sections: WebSection[];
  activeSectionSlug: string | null;
  onOpenSection: (section: WebSection) => void;
  onShareMissing: () => void;
  onShareDuplicates: () => void;
}) {
  const hasStarted = collection.summary.tracked.have > 0;

  return (
    <div className="album-home">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Selecoes e secoes</p>
          <h2>{collection.name}</h2>
        </div>
        <span>{sections.length} secoes</span>
      </div>
      <div className="home-action-row" aria-label="Compartilhar colecao">
        <button
          className="text-button primary"
          type="button"
          onClick={onShareMissing}
        >
          <Share2 size={17} />
          Compartilhar faltantes
        </button>
        <button
          className="text-button"
          type="button"
          onClick={onShareDuplicates}
        >
          <Repeat2 size={17} />
          Compartilhar repetidas
        </button>
      </div>
      {!hasStarted ? (
        <section className="first-use-panel" aria-label="Primeiro uso">
          <Check size={20} />
          <div>
            <strong>Comece por uma selecao</strong>
            <p>Abra um pais ou secao e toque nas figurinhas que voce ja tem.</p>
          </div>
        </section>
      ) : null}
      <div className="section-card-grid">
        {sections.map((section) => (
          <SectionCard
            key={section.slug}
            section={section}
            active={section.slug === activeSectionSlug}
            onOpen={() => onOpenSection(section)}
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  active,
  onOpen,
}: {
  section: WebSection;
  active: boolean;
  onOpen: () => void;
}) {
  const summary = summarizeSectionProgress(section);

  return (
    <button
      className={`section-card ${active ? "active" : ""}`}
      style={sectionToneStyle(section)}
      type="button"
      onClick={onOpen}
    >
      <SectionFlagVisual section={section} />
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

function SectionFlagVisual({
  section,
  className = "",
}: {
  section: WebSection;
  className?: string;
}) {
  const flag = getSectionFlag(section);

  return (
    <div
      className={`flag-card ${className} ${flag ? "has-flag" : ""}`.trim()}
      aria-hidden="true"
    >
      {flag ? (
        <img className="flag-image" src={flag.src} alt="" loading="lazy" />
      ) : (
        <span>{getSectionDisplayCode(section)}</span>
      )}
    </div>
  );
}

function SectionDetail({
  collectionName,
  section,
  activeTab,
  transferringStickerCode,
  onBack,
  onPrevious,
  onNext,
  onTabChange,
  onMarkOwned,
  onChangeQuantity,
  onCopyDuplicates,
  onShareDuplicates,
}: {
  collectionName: string;
  section: WebSection;
  activeTab: DetailTab;
  transferringStickerCode: string | null;
  onBack: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onTabChange: (tab: DetailTab) => void;
  onMarkOwned: (sticker: WebSticker) => void;
  onChangeQuantity: (
    sticker: WebSticker,
    nextQuantity: number,
  ) => Promise<boolean>;
  onCopyDuplicates: (text: string) => void;
  onShareDuplicates: (text: string) => void;
}) {
  const [selectedStickerCode, setSelectedStickerCode] = useState<string | null>(
    null,
  );
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const summary = summarizeSectionProgress(section);
  const isComplete = summary.total > 0 && summary.missing === 0;
  const visibleStickers = filterSectionStickersByOwnership(section, activeTab);
  const duplicateStickers = section.stickers.filter(
    (sticker) => sticker.quantity > 1,
  );
  const selectedSticker = selectedStickerCode
    ? section.stickers.find((sticker) => sticker.code === selectedStickerCode)
    : null;
  const duplicateText = buildSectionDuplicateText(collectionName, section);

  useEffect(() => {
    setSelectedStickerCode(null);
    setDuplicatesOpen(false);
  }, [section.slug, activeTab]);

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

      <SectionFlagVisual section={section} className="detail-visual" />

      <div className="section-status">
        {isComplete ? (
          <>
            <Check size={18} /> Secao completa
          </>
        ) : (
          `${summary.have}/${summary.total} figurinhas`
        )}
      </div>

      <div className="detail-tabs" role="tablist" aria-label="Status da secao">
        <button
          className={`tab-button ${activeTab === "missing" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "missing"}
          onClick={() => onTabChange("missing")}
        >
          Faltam <span>{summary.missing}</span>
        </button>
        <button
          className={`tab-button ${activeTab === "owned" ? "active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "owned"}
          onClick={() => onTabChange("owned")}
        >
          Tenho <span>{summary.have}</span>
        </button>
      </div>

      {duplicateStickers.length > 0 ? (
        <div className="section-action-row">
          <button
            className="text-button repeat-button"
            type="button"
            onClick={() => setDuplicatesOpen((value) => !value)}
          >
            <Repeat2 size={16} />
            Ver repetidas
          </button>
        </div>
      ) : null}

      {duplicatesOpen ? (
        <section className="duplicates-panel" aria-label="Repetidas da secao">
          <div className="duplicates-panel-heading">
            <strong>Repetidas</strong>
            <div className="button-row compact-actions">
              <button
                className="icon-button subtle"
                type="button"
                onClick={() => onShareDuplicates(duplicateText)}
                title="Enviar repetidas no WhatsApp"
              >
                <Share2 size={17} />
              </button>
              <button
                className="icon-button subtle"
                type="button"
                onClick={() => onCopyDuplicates(duplicateText)}
                title="Copiar repetidas"
              >
                <Copy size={17} />
              </button>
            </div>
          </div>
          <div className="code-pill-grid">
            {duplicateStickers.map((sticker) => (
              <span className="code-pill static" key={sticker.code}>
                {sticker.code} x{sticker.quantity - 1}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {visibleStickers.length === 0 ? (
        <div className="section-empty-state">
          <Check size={28} />
          <p>
            {activeTab === "missing"
              ? "Nada faltando nesta secao."
              : "Nada marcado nesta secao."}
          </p>
        </div>
      ) : (
        <div className="sticker-grid compact">
          {visibleStickers.map((sticker) => (
            <StickerTile
              key={sticker.code}
              sticker={sticker}
              mode={activeTab}
              transferring={transferringStickerCode === sticker.code}
              onClick={() =>
                activeTab === "missing"
                  ? onMarkOwned(sticker)
                  : setSelectedStickerCode(sticker.code)
              }
            />
          ))}
        </div>
      )}

      {selectedSticker ? (
        <StickerActions
          sticker={selectedSticker}
          onClose={() => setSelectedStickerCode(null)}
          onAddDuplicate={async () => {
            const changed = await onChangeQuantity(
              selectedSticker,
              selectedSticker.quantity + 1,
            );
            if (changed) setSelectedStickerCode(null);
          }}
          onRemoveDuplicate={async () => {
            const changed = await onChangeQuantity(
              selectedSticker,
              Math.max(1, selectedSticker.quantity - 1),
            );
            if (changed) setSelectedStickerCode(null);
          }}
          onMarkMissing={async () => {
            const changed = await onChangeQuantity(selectedSticker, 0);
            if (changed) {
              setSelectedStickerCode(null);
              onTabChange("missing");
            }
          }}
        />
      ) : null}
    </section>
  );
}

function StickerTile({
  sticker,
  mode,
  transferring,
  onClick,
}: {
  sticker: WebSticker;
  mode: DetailTab;
  transferring: boolean;
  onClick: () => void;
}) {
  const state =
    transferring || sticker.quantity === 1
      ? "have"
      : sticker.quantity > 1
        ? "duplicate"
        : "missing";
  const actionLabel =
    mode === "missing"
      ? `Marcar ${sticker.code} como tenho`
      : `Abrir ações de ${sticker.code}`;

  return (
    <article
      className={`sticker-tile ${state} ${transferring ? "transferring" : ""}`}
    >
      <button
        className="sticker-card-button"
        type="button"
        onClick={onClick}
        aria-label={actionLabel}
      >
        <span className="sticker-code">{sticker.code}</span>
        <span className="sticker-number">{sticker.localNumber}</span>
        <span className="sticker-card-meta">
          {sticker.quantity > 1
            ? `${sticker.quantity - 1} repetida${sticker.quantity - 1 > 1 ? "s" : ""}`
            : sticker.quantity === 1 || transferring
              ? "Tenho"
              : "Falta"}
        </span>
      </button>
    </article>
  );
}

function StickerActions({
  sticker,
  onClose,
  onAddDuplicate,
  onRemoveDuplicate,
  onMarkMissing,
}: {
  sticker: WebSticker;
  onClose: () => void;
  onAddDuplicate: () => Promise<void>;
  onRemoveDuplicate: () => Promise<void>;
  onMarkMissing: () => Promise<void>;
}) {
  return (
    <div className="sticker-actions-backdrop" role="presentation">
      <section
        className="sticker-actions-panel"
        aria-labelledby="sticker-actions-title"
      >
        <div className="sticker-actions-heading">
          <div>
            <p className="eyebrow">Figurinha</p>
            <h3 id="sticker-actions-title">{sticker.code}</h3>
          </div>
          <button
            className="icon-button subtle"
            type="button"
            onClick={onClose}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="sticker-action-list">
          <button
            className="text-button primary"
            type="button"
            onClick={onAddDuplicate}
          >
            <Plus size={17} />
            Adicionar repetida
          </button>
          <button
            className="text-button"
            type="button"
            onClick={onRemoveDuplicate}
            disabled={sticker.quantity <= 1}
          >
            <Minus size={17} />
            Remover repetida
          </button>
          <button className="text-button" type="button" onClick={onMarkMissing}>
            Marcar como faltando
          </button>
        </div>
      </section>
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

function buildSectionDuplicateText(
  collectionName: string,
  section: WebSection,
): string {
  const duplicateCodes = section.stickers
    .filter((sticker) => sticker.quantity > 1)
    .map((sticker) => `${sticker.code} x${sticker.quantity - 1}`);

  return [
    `*${collectionName}*`,
    "",
    `*Repetidas - ${section.name}*`,
    ...(duplicateCodes.length > 0 ? duplicateCodes : ["Sem repetidas."]),
  ].join("\n");
}

function buildCollectionShareText(
  collection: WebCollection,
  mode: "missing" | "duplicates",
): string {
  return buildStickerListShareText({
    collectionName: collection.name,
    mode,
    sections: collection.sections.map((section) => ({
      name: section.name,
      stickers: section.stickers.map((sticker) => ({
        code: sticker.code,
        label: sticker.label,
        quantity: sticker.quantity,
      })),
    })),
  });
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
