const reservedNicknames = new Set([
  "admin",
  "figcontrol",
  "suporte",
  "moderador",
  "ranking",
]);

const brazilianStateCodes = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

export interface ProfileValidationInput {
  nickname?: string | null;
  cityName?: string | null;
  stateCode?: string | null;
}

export interface ProfileValidationResult {
  valid: boolean;
  normalizedNickname: string | null;
  normalizedStateCode: string | null;
  errors: string[];
}

export function normalizeNickname(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ._-]/g, "");
}

export function isBrazilianStateCode(value: string | null | undefined) {
  if (!value) return false;
  return brazilianStateCodes.has(value.trim().toUpperCase());
}

export function getBrazilianStateCodes(): string[] {
  return [...brazilianStateCodes];
}

export function validateProfileInput(
  input: ProfileValidationInput,
): ProfileValidationResult {
  const errors: string[] = [];
  const nickname = input.nickname?.trim() ?? "";
  const normalizedNickname = nickname ? normalizeNickname(nickname) : null;
  const normalizedStateCode = input.stateCode?.trim().toUpperCase() || null;

  if (nickname) {
    if (nickname.length < 3 || nickname.length > 24) {
      errors.push("O apelido deve ter entre 3 e 24 caracteres.");
    }

    if (!/^[\p{L}\p{N} ._-]+$/u.test(nickname)) {
      errors.push(
        "Use apenas letras, numeros, espacos, ponto, hifen ou underline no apelido.",
      );
    }

    if (normalizedNickname && reservedNicknames.has(normalizedNickname)) {
      errors.push("Este apelido nao esta disponivel.");
    }
  }

  if (input.cityName !== undefined) {
    const cityName = input.cityName?.trim() ?? "";
    if (cityName && (cityName.length < 2 || cityName.length > 80)) {
      errors.push("A cidade deve ter entre 2 e 80 caracteres.");
    }
  }

  if (normalizedStateCode && !isBrazilianStateCode(normalizedStateCode)) {
    errors.push("Escolha um estado brasileiro valido.");
  }

  return {
    valid: errors.length === 0,
    normalizedNickname,
    normalizedStateCode,
    errors,
  };
}
