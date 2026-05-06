import { mkdir, writeFile } from "node:fs/promises";

const checklistUrl =
  "https://www.diamondcardsonline.com/blog/2026-panini-fifa-world-cup-sticker-collection-checklist/";
const cocaColaUrl =
  "https://www.coca-cola.com/br/pt/offerings/copa-do-mundo-da-fifa-2026/panini/jogadores";
const cocaColaFaqUrl =
  "https://www.coca-cola.com/br/pt/offerings/copa-do-mundo-da-fifa-2026/panini/promo-local-panini/faq";

const response = await fetch(checklistUrl);
if (!response.ok) {
  throw new Error(
    `Failed to fetch checklist: ${response.status} ${response.statusText}`,
  );
}

const html = await response.text();
const text = decodeEntities(html)
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "\n")
  .replace(/&nbsp;/g, " ");

const lines = text
  .split("\n")
  .map((line) => line.replace(/\s+/g, " ").trim())
  .filter(Boolean);

const baseItems = [];
const seenBaseCodes = new Set();
for (const line of lines) {
  const match = line.match(/^(00|FWC\d+|[A-Z]{3}\d{1,2})\s+(.+)$/);
  if (!match) continue;

  const rawCode = match[1];
  const code = rawCode === "00" ? "FWC00" : rawCode;
  if (seenBaseCodes.has(code)) continue;

  const rest = match[2].trim();
  const special = /\bFOIL\b/i.test(rest);
  const cleanRest = rest.replace(/\s+FOIL\b/i, "").trim();
  const teamMatch = cleanRest.match(/^(.+?)\s+-\s+(.+)$/);
  const isTeamSticker = !code.startsWith("FWC") && teamMatch;

  baseItems.push({
    code,
    sourceCode: rawCode,
    label: isTeamSticker ? teamMatch[1].trim() : cleanRest,
    teamName: isTeamSticker ? teamMatch[2].trim() : null,
    localNumber: Number(code.replace(/^[A-Z]+/, "")),
    special,
  });
  seenBaseCodes.add(code);

  if (baseItems.length === 980) break;
}

if (baseItems.length !== 980) {
  throw new Error(`Expected 980 base stickers, parsed ${baseItems.length}`);
}

const extras = baseItems
  .filter((item) => item.code.startsWith("FWC"))
  .sort((a, b) => a.localNumber - b.localNumber)
  .map((item) => ({
    code: item.code,
    localNumber: item.localNumber,
    label: item.label,
    isBaseAlbum: true,
    special: item.special,
  }));

const teamMap = new Map();
for (const item of baseItems.filter((entry) => !entry.code.startsWith("FWC"))) {
  const key = item.teamName;
  if (!teamMap.has(key)) {
    teamMap.set(key, []);
  }
  teamMap.get(key).push({
    code: item.code,
    localNumber: item.localNumber,
    label: item.label,
    isBaseAlbum: true,
    special: item.special,
  });
}

const cocaColaPlayers = [
  "Lamine Yamal - Spain",
  "Gabriel Magalhães - Brazil",
  "Joshua Kimmich - Germany",
  "Harry Kane - England",
  "Santiago Giménez - Mexico",
  "Joško Gvardiol - Croatia",
  "Federico Valverde - Uruguay",
  "Jefferson Lerma - Colombia",
  "Enner Valencia - Ecuador",
  "Emiliano Martínez - Argentina",
  "Virgil van Dijk - Netherlands",
  "Alphonso Davies - Canada",
  "Raúl Jiménez - Mexico",
  "Lautaro Martínez - Argentina",
];

const cocaColaStickers = cocaColaPlayers.map((label, index) => ({
  code: `CC${index + 1}`,
  localNumber: index + 1,
  label,
  isBaseAlbum: false,
  special: true,
}));

const sections = [
  {
    slug: "fifa-world-cup",
    name: "FIFA World Cup",
    kind: "ALBUM_EXTRA",
    stickers: extras,
  },
  ...Array.from(teamMap.entries()).map(([teamName, stickers]) => ({
    slug: slugify(teamName),
    name: teamName,
    kind: "TEAM",
    stickers: stickers.sort((a, b) => a.localNumber - b.localNumber),
  })),
  {
    slug: "coca-cola",
    name: "Coca-Cola",
    kind: "COCA_COLA",
    stickers: cocaColaStickers,
  },
];

const seed = {
  slug: "world-cup-2026",
  name: "FIFA World Cup 2026",
  baseStickerCount: 980,
  trackedStickerCount: 994,
  sources: [
    checklistUrl,
    cocaColaUrl,
    cocaColaFaqUrl,
    "https://panini.com.br/colecionaveis/fifa-world-cup-2026",
  ],
  sections,
};

const output = `import type { CatalogSeed } from '@figcontrol/shared';

export const worldCup2026Seed = ${JSON.stringify(seed, null, 2)} satisfies CatalogSeed;
`;

await mkdir("apps/api/src/catalog", { recursive: true });
await writeFile("apps/api/src/catalog/world-cup-2026.seed.ts", output);

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&uuml;/g, "ü")
    .replace(/&ccedil;/g, "ç")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É")
    .replace(/&aacute;/g, "á")
    .replace(/&atilde;/g, "ã")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}
