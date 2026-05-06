"use client";

import type { LeaderboardDto } from "@figcontrol/shared";
import { Lock, MapPin, RefreshCcw, Repeat2, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getLeaderboard,
  refresh,
  type AuthTokens,
} from "../lib/api";
import {
  formatLeaderboardLocation,
  formatLeaderboardProgress,
  getLeaderboardMedalLabel,
} from "../lib/leaderboard";
import { loadAuth, saveAuth } from "../lib/storage";

type LoadState = "loading" | "ready" | "blocked" | "error";

export function LeaderboardPage() {
  const [auth, setAuth] = useState<AuthTokens | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardDto | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setState("loading");
    setMessage(null);
    const storedAuth = loadAuth();
    setAuth(storedAuth);

    if (!storedAuth) {
      setState("blocked");
      return;
    }

    const loaded = await fetchLeaderboardWithRefresh(storedAuth);
    if (!loaded) setState("error");
  }

  async function fetchLeaderboardWithRefresh(
    tokens: AuthTokens,
  ): Promise<boolean> {
    try {
      const nextLeaderboard = await getLeaderboard(tokens.accessToken);
      setLeaderboard(nextLeaderboard);
      setState("ready");
      return true;
    } catch (error) {
      try {
        const refreshed = await refresh(tokens.refreshToken);
        saveAuth(refreshed);
        setAuth(refreshed);
        const nextLeaderboard = await getLeaderboard(refreshed.accessToken);
        setLeaderboard(nextLeaderboard);
        setState("ready");
        return true;
      } catch {
        setMessage(
          error instanceof Error ? error.message : "Falha ao carregar ranking.",
        );
        return false;
      }
    }
  }

  if (state === "loading") {
    return <div className="notice">Carregando ranking...</div>;
  }

  if (state === "blocked") {
    return (
      <section className="admin-empty" aria-labelledby="ranking-blocked-title">
        <Lock size={34} />
        <p className="eyebrow">Ranking</p>
        <h1 id="ranking-blocked-title">Entre para ver o ranking</h1>
        <p>O placar usa apenas apelido, cidade, estado e progresso do álbum.</p>
        <Link className="text-button primary" href="/">
          Entrar
        </Link>
      </section>
    );
  }

  if (state === "error" || !leaderboard) {
    return (
      <section className="admin-empty" aria-labelledby="ranking-error-title">
        <RefreshCcw size={34} />
        <p className="eyebrow">Ranking</p>
        <h1 id="ranking-error-title">Não foi possível carregar</h1>
        <p>{message ?? "Tente atualizar novamente."}</p>
        <button
          className="text-button primary"
          type="button"
          onClick={loadLeaderboard}
        >
          <RefreshCcw size={17} />
          Atualizar
        </button>
      </section>
    );
  }

  return (
    <section className="leaderboard-page" aria-labelledby="leaderboard-title">
      <div className="leaderboard-hero">
        <div>
          <p className="eyebrow">Ranking</p>
          <h1 id="leaderboard-title">Corrida para completar o álbum</h1>
          <p>
            Posição por total de figurinhas marcadas como tenho. Empates
            favorecem quem chegou antes.
          </p>
        </div>
        <Trophy size={44} />
      </div>

      <LeaderboardMeCard leaderboard={leaderboard} authEmail={auth?.user.email} />

      <div className="leaderboard-list" aria-label="Classificação">
        {leaderboard.items.length === 0 ? (
          <section className="profile-card leaderboard-empty">
            <Trophy size={28} />
            <h2>O ranking ainda está vazio</h2>
            <p>Complete seu perfil e seja uma das primeiras pessoas no placar.</p>
            <Link className="text-button primary" href="/perfil">
              Completar perfil
            </Link>
          </section>
        ) : (
          leaderboard.items.map((item) => (
            <article
              className={`leaderboard-row rank-${Math.min(item.rank, 3)}`}
              key={`${item.rank}-${item.nickname}`}
            >
              <div className="leaderboard-rank">
                {getLeaderboardMedalLabel(item.rank)}
              </div>
              <div className="leaderboard-user">
                <strong>{item.nickname}</strong>
                <span>
                  <MapPin size={14} />
                  {formatLeaderboardLocation(item)}
                </span>
              </div>
              <div className="leaderboard-score">
                <strong>{formatLeaderboardProgress(item, leaderboard.total)}</strong>
                <span>{item.trackedMissing} faltam</span>
              </div>
              <div className="leaderboard-duplicates">
                <Repeat2 size={15} />
                {item.duplicateCount}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function LeaderboardMeCard({
  leaderboard,
  authEmail,
}: {
  leaderboard: LeaderboardDto;
  authEmail?: string;
}) {
  const statusText = useMemo(() => {
    if (!leaderboard.me) {
      return "Entre para acompanhar sua posição.";
    }

    if (leaderboard.me.joined) {
      return leaderboard.me.rank
        ? `Sua posição atual é ${getLeaderboardMedalLabel(leaderboard.me.rank)}.`
        : "Você está participando; atualize seu álbum para aparecer no placar.";
    }

    if (!leaderboard.me.eligible) {
      return "Complete seu perfil para entrar no ranking.";
    }

    return "Seu perfil já pode entrar no ranking.";
  }, [leaderboard.me]);

  return (
    <section className="profile-card leaderboard-me">
      <div>
        <p className="eyebrow">Minha posição</p>
        <h2>{statusText}</h2>
        {authEmail ? <span>{authEmail}</span> : null}
      </div>
      {leaderboard.me ? (
        <div className="leaderboard-me-stats">
          <Metric label="Tenho" value={leaderboard.me.trackedHave} />
          <Metric label="Faltam" value={leaderboard.me.trackedMissing} />
          <Metric label="Repetidas" value={leaderboard.me.duplicateCount} />
        </div>
      ) : null}
      {!leaderboard.me?.joined ? (
        <Link className="text-button primary" href="/perfil">
          Ir para perfil
        </Link>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="leaderboard-mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
