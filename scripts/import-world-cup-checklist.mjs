import { mkdir, writeFile } from 'node:fs/promises';

const checklistUrl =
  'https://www.diamondcardsonline.com/blog/2026-panini-fifa-world-cup-sticker-collection-checklist/';
const cocaColaUrl =
  'https://www.coca-cola.com/us/en/offerings/fifa-world-cup-26/panini/players';

const response = await fetch(checklistUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch checklist: ${response.status} ${response.statusText}`);
}

const html = await response.text();
const text = decodeEntities(html)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ');

const lines = text
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean);

const baseItems = [];
const seenBaseCodes = new Set();
for (const line of lines) {
  const match = line.match(/^(00|FWC\d+|[A-Z]{3}\d{1,2})\s+(.+)$/);
  if (!match) continue;

  const rawCode = match[1];
  const code = rawCode === '00' ? 'FWC0' : rawCode;
  if (seenBaseCodes.has(code)) continue;

  const rest = match[2].trim();
  const special = /\bFOIL\b/i.test(rest);
  const cleanRest = rest.replace(/\s+FOIL\b/i, '').trim();
  const teamMatch = cleanRest.match(/^(.+?)\s+-\s+(.+)$/);
  const isTeamSticker = !code.startsWith('FWC') && teamMatch;

  baseItems.push({
    code,
    sourceCode: rawCode,
    label: isTeamSticker ? teamMatch[1].trim() : cleanRest,
    teamName: isTeamSticker ? teamMatch[2].trim() : null,
    localNumber: Number(code.replace(/^[A-Z]+/, '')),
    special
  });
  seenBaseCodes.add(code);

  if (baseItems.length === 980) break;
}

if (baseItems.length !== 980) {
  throw new Error(`Expected 980 base stickers, parsed ${baseItems.length}`);
}

const extras = baseItems
  .filter((item) => item.code.startsWith('FWC'))
  .sort((a, b) => a.localNumber - b.localNumber)
  .map((item, index) => ({
    code: item.code,
    localNumber: index + 1,
    label: item.label,
    isBaseAlbum: true,
    special: item.special
  }));

const teamMap = new Map();
for (const item of baseItems.filter((entry) => !entry.code.startsWith('FWC'))) {
  const key = item.teamName;
  if (!teamMap.has(key)) {
    teamMap.set(key, []);
  }
  teamMap.get(key).push({
    code: item.code,
    localNumber: item.localNumber,
    label: item.label,
    isBaseAlbum: true,
    special: item.special
  });
}

const cocaColaStart = lines.findIndex((line) => line === 'Coca-Cola USA Set Checklist');
if (cocaColaStart === -1) {
  throw new Error('Could not find Coca-Cola checklist section.');
}

const cocaColaStickers = [];
for (const line of lines.slice(cocaColaStart + 1)) {
  const match = line.match(/^(\d{1,2})\s+(.+?)\s+-\s+(.+)$/);
  if (!match) {
    if (cocaColaStickers.length > 0) break;
    continue;
  }
  const localNumber = Number(match[1]);
  cocaColaStickers.push({
    code: `CC${localNumber}`,
    localNumber,
    label: `${match[2].trim()} - ${match[3].trim()}`,
    isBaseAlbum: false,
    special: true
  });
  if (cocaColaStickers.length === 12) break;
}

if (cocaColaStickers.length !== 12) {
  throw new Error(`Expected 12 Coca-Cola stickers, parsed ${cocaColaStickers.length}`);
}

const sections = [
  {
    slug: 'fifa-world-cup',
    name: 'FIFA World Cup',
    kind: 'ALBUM_EXTRA',
    stickers: extras
  },
  ...Array.from(teamMap.entries()).map(([teamName, stickers]) => ({
    slug: slugify(teamName),
    name: teamName,
    kind: 'TEAM',
    stickers: stickers.sort((a, b) => a.localNumber - b.localNumber)
  })),
  {
    slug: 'coca-cola',
    name: 'Coca-Cola',
    kind: 'COCA_COLA',
    stickers: cocaColaStickers
  }
];

const seed = {
  slug: 'world-cup-2026',
  name: 'FIFA World Cup 2026',
  baseStickerCount: 980,
  trackedStickerCount: 992,
  sources: [
    checklistUrl,
    cocaColaUrl,
    'https://panini.com.br/colecionaveis/fifa-world-cup-2026'
  ],
  sections
};

const output = `import type { CatalogSeed } from '@figcontrol/shared';

export const worldCup2026Seed = ${JSON.stringify(seed, null, 2)} satisfies CatalogSeed;
`;

await mkdir('apps/api/src/catalog', { recursive: true });
await writeFile('apps/api/src/catalog/world-cup-2026.seed.ts', output);

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&uuml;/g, 'ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&aacute;/g, 'á')
    .replace(/&atilde;/g, 'ã')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}
