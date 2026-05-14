import type {
  LeaderboardEligibilityReason,
  UserProfileDto,
} from "@figcontrol/shared";

export interface BrazilianState {
  code: string;
  name: string;
}

export const BRAZILIAN_STATES: BrazilianState[] = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

export function getStateName(code: string | null | undefined): string {
  if (!code) return "";
  const normalizedCode = code.trim().toUpperCase();
  return (
    BRAZILIAN_STATES.find((state) => state.code === normalizedCode)?.name ??
    normalizedCode
  );
}

export function toProfilePhoneInput(phoneNumber: string | null): string {
  return phoneNumber?.replace(/^\+55/, "") ?? "";
}

export function formatProfilePhone(phoneNumber: string | null): string {
  const digits = toProfilePhoneInput(phoneNumber);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phoneNumber ?? "";
}

export function isProfileReadyForLeaderboard(profile: UserProfileDto): boolean {
  return (
    profile.leaderboardEligible &&
    Boolean(profile.nickname?.trim()) &&
    Boolean(profile.cityName?.trim()) &&
    Boolean(profile.stateCode?.trim()) &&
    Boolean(profile.profileCompletedAt)
  );
}

export function getProfileEligibilityMessage(profile: UserProfileDto): string {
  if (profile.leaderboardEligible) {
    return "Seu perfil ja pode entrar no ranking.";
  }

  const labels = profile.leaderboardEligibilityReasons
    .map(toEligibilityLabel)
    .filter(Boolean);

  if (labels.length === 0) {
    return "Complete seu perfil para entrar no ranking.";
  }

  return `${joinHumanList(labels)} para entrar no ranking.`;
}

function toEligibilityLabel(reason: LeaderboardEligibilityReason): string {
  switch (reason) {
    case "EMAIL_NOT_VERIFIED":
      return "verifique seu email";
    case "PROFILE_INCOMPLETE":
      return "complete seu perfil";
    case "NICKNAME_REQUIRED":
      return "escolha um apelido";
    case "CITY_REQUIRED":
      return "informe sua cidade";
    case "STATE_REQUIRED":
      return "informe seu estado";
  }
}

function joinHumanList(values: string[]): string {
  if (values.length === 1) return capitalize(values[0]);
  const last = values[values.length - 1];
  return `${capitalize(values.slice(0, -1).join(", "))} e ${last}`;
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
