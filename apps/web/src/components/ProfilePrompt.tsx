"use client";

import type {
  NicknameAvailabilityDto,
  UserProfileDto,
} from "@figcontrol/shared";
import { CheckCircle2, MapPin, Trophy, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  checkNicknameAvailability,
  trackAnalyticsEvent,
  updateProfile,
} from "../lib/api";
import { BRAZILIAN_STATES } from "../lib/profile";

interface ProfilePromptProps {
  accessToken: string;
  onSaved: (profile: UserProfileDto) => void;
  onSkip: () => void;
}

export function ProfilePrompt({
  accessToken,
  onSaved,
  onSkip,
}: ProfilePromptProps) {
  const [nickname, setNickname] = useState("");
  const [cityName, setCityName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [exchangeOptIn, setExchangeOptIn] = useState(false);
  const [availability, setAvailability] =
    useState<NicknameAvailabilityDto | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length < 3) {
      setAvailability(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    const timeout = window.setTimeout(() => {
      void checkNicknameAvailability(accessToken, trimmedNickname)
        .then(setAvailability)
        .catch(() =>
          setAvailability({
            nickname: trimmedNickname,
            available: false,
            reason: "Não foi possível validar agora.",
          }),
        )
        .finally(() => setChecking(false));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [accessToken, nickname]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const profile = await updateProfile(accessToken, {
        nickname,
        cityName,
        stateCode,
        exchangeOptIn,
      });
      onSaved(profile);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    void trackAnalyticsEvent(accessToken, "profile_prompt_skipped").catch(
      () => undefined,
    );
    onSkip();
  }

  if (typeof document === "undefined") return null;

  const nicknameAvailable =
    nickname.trim().length >= 3 && availability?.available === true;
  const canSave =
    nicknameAvailable &&
    cityName.trim().length >= 2 &&
    stateCode.length === 2 &&
    !submitting;

  return createPortal(
    <div className="profile-prompt-backdrop" role="presentation">
      <section
        className="profile-prompt-panel"
        aria-labelledby="profile-prompt-title"
      >
        <div className="profile-prompt-heading">
          <Trophy size={24} />
          <button
            className="icon-button subtle"
            type="button"
            onClick={handleSkip}
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <p className="eyebrow">Nova fase</p>
        <h2 id="profile-prompt-title">Entre na corrida do álbum</h2>
        <p>
          Escolha um apelido e informe sua cidade para aparecer no ranking. Você
          pode completar isso agora ou depois em Perfil.
        </p>
        {message ? <div className="notice error">{message}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Apelido</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={24}
              autoComplete="nickname"
              placeholder="Ex.: MatheusFig"
            />
            <AvailabilityText
              checking={checking}
              availability={availability}
              nickname={nickname}
            />
          </label>
          <label className="field">
            <span>Cidade</span>
            <input
              value={cityName}
              onChange={(event) => setCityName(event.target.value)}
              maxLength={80}
              autoComplete="address-level2"
              placeholder="Ex.: Porto Alegre"
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
              {BRAZILIAN_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
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
          <div className="button-row">
            <button className="text-button primary" type="submit" disabled={!canSave}>
              <CheckCircle2 size={17} />
              {submitting ? "Salvando..." : "Salvar perfil"}
            </button>
            <button className="text-button" type="button" onClick={handleSkip}>
              Depois
            </button>
          </div>
        </form>
        <div className="profile-prompt-footnote">
          <MapPin size={16} />
          A cidade aparece no ranking junto com seu apelido.
        </div>
      </section>
    </div>,
    document.body,
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
        : availability.reason ?? "Apelido indisponível."}
    </small>
  );
}
