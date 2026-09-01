"use client";

import type {
  NicknameAvailabilityDto,
  UserProfileDto,
} from "@figcontrol/shared";
import {
  CheckCircle2,
  Lock,
  MapPin,
  RefreshCcw,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  checkNicknameAvailability,
  getCollection,
  getProfile,
  joinLeaderboard,
  refresh,
  runWithFreshAccessToken,
  updateProfile,
  type AuthTokens,
} from "../lib/api";
import type { WebCollection } from "../lib/collection";
import { deriveProfileInsights } from "../lib/profile-insights";
import {
  BRAZILIAN_STATES,
  formatProfilePhone,
  getProfileEligibilityMessage,
  getStateName,
  isProfileReadyForLeaderboard,
  toProfilePhoneInput,
} from "../lib/profile";
import { loadAuth, saveAuth } from "../lib/storage";
import { ProfileAchievementsPanel } from "./ProfileAchievementsPanel";
import { ProfileSectionInsights } from "./ProfileSectionInsights";
import { ProfileStatsPanel } from "./ProfileStatsPanel";

type LoadState = "loading" | "ready" | "blocked" | "error";

export function ProfilePage() {
  const [auth, setAuth] = useState<AuthTokens | null>(null);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [collection, setCollection] = useState<WebCollection | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [nickname, setNickname] = useState("");
  const [cityName, setCityName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [exchangeOptIn, setExchangeOptIn] = useState(false);
  const [availability, setAvailability] =
    useState<NicknameAvailabilityDto | null>(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    if (!auth) return;
    const trimmedNickname = nickname.trim();
    const currentNickname = profile?.nickname?.trim() ?? "";

    if (trimmedNickname.length < 3 || trimmedNickname === currentNickname) {
      setAvailability(
        trimmedNickname.length >= 3 && trimmedNickname === currentNickname
          ? { nickname: trimmedNickname, available: true, reason: null }
          : null,
      );
      setCheckingNickname(false);
      return;
    }

    setCheckingNickname(true);
    const timeout = window.setTimeout(() => {
      void runWithFreshAccessToken(
        auth,
        (accessToken) =>
          checkNicknameAvailability(accessToken, trimmedNickname),
        handleTokenRefresh,
      )
        .then(setAvailability)
        .catch(() =>
          setAvailability({
            nickname: trimmedNickname,
            available: false,
            reason: "Não foi possível validar agora.",
          }),
        )
        .finally(() => setCheckingNickname(false));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [auth, nickname, profile?.nickname]);

  async function loadProfile() {
    setMessage(null);
    setCollectionMessage(null);
    setState("loading");
    const storedAuth = loadAuth();
    setAuth(storedAuth);

    if (!storedAuth) {
      setState("blocked");
      return;
    }

    const loaded = await fetchProfileWithRefresh(storedAuth);
    if (!loaded) {
      setState("error");
    }
  }

  async function fetchProfileWithRefresh(tokens: AuthTokens): Promise<boolean> {
    try {
      const loadedProfile = await getProfile(tokens.accessToken);
      applyProfile(loadedProfile);
      await loadProfileCollection(tokens.accessToken);
      setState("ready");
      return true;
    } catch (error) {
      try {
        const refreshed = await refresh(tokens.refreshToken);
        saveAuth(refreshed);
        setAuth(refreshed);
        const loadedProfile = await getProfile(refreshed.accessToken);
        applyProfile(loadedProfile);
        await loadProfileCollection(refreshed.accessToken);
        setState("ready");
        return true;
      } catch {
        setMessage(
          error instanceof Error ? error.message : "Falha ao carregar perfil.",
        );
        return false;
      }
    }
  }

  async function loadProfileCollection(accessToken: string) {
    try {
      const loadedCollection = await getCollection(accessToken);
      setCollection(loadedCollection);
      setCollectionMessage(null);
    } catch {
      setCollection(null);
      setCollectionMessage(
        "Não foi possível carregar as estatísticas do álbum agora.",
      );
    }
  }

  function applyProfile(nextProfile: UserProfileDto) {
    setProfile(nextProfile);
    setNickname(nextProfile.nickname ?? "");
    setCityName(nextProfile.cityName ?? "");
    setStateCode(nextProfile.stateCode ?? "");
    setPhoneNumber(toProfilePhoneInput(nextProfile.phoneNumber));
    setExchangeOptIn(nextProfile.exchangeOptIn);
  }

  function handleTokenRefresh(refreshed: AuthTokens) {
    saveAuth(refreshed);
    setAuth(refreshed);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const nextProfile = await runWithFreshAccessToken(
        auth,
        (accessToken) =>
          updateProfile(accessToken, {
            nickname,
            cityName,
            stateCode,
            phoneNumber: phoneNumber.trim() ? phoneNumber : null,
            exchangeOptIn,
          }),
        handleTokenRefresh,
      );
      applyProfile(nextProfile);
      setMessage("Perfil salvo.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinLeaderboard() {
    if (!auth) return;

    setJoining(true);
    setMessage(null);

    try {
      const nextProfile = await runWithFreshAccessToken(
        auth,
        joinLeaderboard,
        handleTokenRefresh,
      );
      applyProfile(nextProfile);
      setMessage("Você entrou no ranking.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar no ranking.",
      );
    } finally {
      setJoining(false);
    }
  }

  if (state === "loading") {
    return <div className="notice">Carregando perfil...</div>;
  }

  if (state === "blocked") {
    return (
      <section className="admin-empty" aria-labelledby="profile-blocked-title">
        <Lock size={34} />
        <p className="eyebrow">Perfil</p>
        <h1 id="profile-blocked-title">Entre para editar seu perfil</h1>
        <p>O ranking usa seu apelido, cidade e progresso sincronizado.</p>
        <Link className="text-button primary" href="/">
          Entrar
        </Link>
      </section>
    );
  }

  if (state === "error" || !profile) {
    return (
      <section className="admin-empty" aria-labelledby="profile-error-title">
        <RefreshCcw size={34} />
        <p className="eyebrow">Perfil</p>
        <h1 id="profile-error-title">Não foi possível carregar</h1>
        <p>{message ?? "Tente atualizar novamente."}</p>
        <button
          className="text-button primary"
          type="button"
          onClick={loadProfile}
        >
          <RefreshCcw size={17} />
          Atualizar
        </button>
      </section>
    );
  }

  const nicknameReady =
    nickname.trim().length >= 3 && availability?.available === true;
  const canSave =
    nicknameReady &&
    cityName.trim().length >= 2 &&
    stateCode.length === 2 &&
    !submitting;
  const canJoin =
    isProfileReadyForLeaderboard(profile) && !profile.leaderboardJoinedAt;
  const insights = collection ? deriveProfileInsights(collection) : null;

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <div className="profile-hero">
        <div>
          <p className="eyebrow">Perfil</p>
          <h1 id="profile-title">Seu nome na corrida</h1>
          <p>
            Acompanhe seu progresso, veja onde agir agora e prepare seu perfil
            para futuras trocas com outros colecionadores.
          </p>
        </div>
        <UserRound size={42} />
      </div>

      {insights ? <ProfileStatsPanel insights={insights} /> : null}
      {collectionMessage ? (
        <div className="notice">{collectionMessage}</div>
      ) : null}

      <div className="profile-layout">
        <form className="profile-card form-grid" onSubmit={saveProfile}>
          <div className="profile-card-heading">
            <UserRound size={20} />
            <h2>Dados do perfil</h2>
          </div>
          {message ? (
            <div className={`notice ${message.includes("Não") ? "error" : ""}`}>
              {message}
            </div>
          ) : null}
          <label className="field">
            <span>Apelido</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
              autoComplete="nickname"
              placeholder="Ex.: FigHunter"
            />
            <AvailabilityText
              checking={checkingNickname}
              availability={availability}
              nickname={nickname}
            />
          </label>
          <div className="profile-field-row">
            <label className="field">
              <span>Cidade</span>
              <input
                value={cityName}
                onChange={(event) => setCityName(event.target.value)}
                maxLength={80}
                autoComplete="address-level2"
                placeholder="Ex.: Curitiba"
              />
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                value={stateCode}
                onChange={(event) => setStateCode(event.target.value)}
                required
              >
                <option value="">Selecione</option>
                {BRAZILIAN_STATES.map((stateOption) => (
                  <option key={stateOption.code} value={stateOption.code}>
                    {stateOption.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Celular privado</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              maxLength={32}
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="Ex.: 51999999999"
            />
            <small className="field-hint">
              Usaremos isso apenas em futuras trocas. Não aparece no ranking.
              {profile.phoneNumber ? (
                <> Salvo como {formatProfilePhone(profile.phoneNumber)}.</>
              ) : null}
            </small>
          </label>
          <label className="profile-checkbox">
            <input
              checked={exchangeOptIn}
              onChange={(event) => setExchangeOptIn(event.target.checked)}
              type="checkbox"
            />
            <span>
              Quero aparecer futuramente para possíveis trocas de figurinhas.
            </span>
          </label>
          <button
            className="text-button primary"
            type="submit"
            disabled={!canSave}
          >
            <CheckCircle2 size={17} />
            {submitting ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>

        <aside className="profile-card leaderboard-entry">
          <Trophy size={26} />
          <h2>Ranking</h2>
          {profile.leaderboardJoinedAt ? (
            <>
              <p>
                Você está participando como <strong>{profile.nickname}</strong>{" "}
                em {profile.cityName}, {profile.stateCode}.
              </p>
              <Link className="text-button primary" href="/ranking">
                Ver ranking
              </Link>
            </>
          ) : (
            <>
              <p>{getProfileEligibilityMessage(profile)}</p>
              {cityName && stateCode ? (
                <span className="profile-location-preview">
                  <MapPin size={16} />
                  {cityName}, {getStateName(stateCode)}
                </span>
              ) : null}
              <button
                className="text-button primary"
                type="button"
                disabled={!canJoin || joining}
                onClick={handleJoinLeaderboard}
              >
                <Trophy size={17} />
                {joining ? "Entrando..." : "Entrar no ranking"}
              </button>
            </>
          )}
          <small>
            Depois de entrar, a opção de sair não fica disponível no app para
            manter o ranking consistente.
          </small>
        </aside>
      </div>
      {insights ? (
        <>
          <ProfileAchievementsPanel achievements={insights.achievements} />
          <ProfileSectionInsights insights={insights} />
        </>
      ) : null}
    </section>
  );
}

function AvailabilityText({
  checking,
  availability,
  nickname,
}: {
  checking: boolean;
  availability: NicknameAvailabilityDto | null;
  nickname: string;
}) {
  if (nickname.trim().length > 0 && nickname.trim().length < 3) {
    return <small className="field-hint">Use pelo menos 3 caracteres.</small>;
  }

  if (checking) {
    return <small className="field-hint">Verificando disponibilidade...</small>;
  }

  if (!availability) return null;

  return (
    <small className={`field-hint ${availability.available ? "ok" : "error"}`}>
      {availability.available
        ? "Apelido disponível."
        : (availability.reason ?? "Apelido indisponível.")}
    </small>
  );
}
