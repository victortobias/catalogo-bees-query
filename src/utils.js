import fs from 'fs';
import path from 'path';

export const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'por', 'com', 'sem', 'e', 'a', 'o']);

export function removeDiacritics(text = '') {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function normalizeText(text = '') {
  return removeDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text = '') {
  if (!text) return [];
  return normalizeText(text)
    .split(' ')
    .filter((token) => token && !STOPWORDS.has(token));
}

export function uniqueTokens(tokens = []) {
  return Array.from(new Set(tokens));
}

export function loadJsonFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(content);
}

export function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function convertToMilliliters(value, unit) {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return null;
  const normalizedUnit = (unit || 'ml').toLowerCase();
  if (normalizedUnit === 'l' || normalizedUnit === 'lt' || normalizedUnit === 'litro' || normalizedUnit === 'litros') {
    return amount * 1000;
  }
  return amount;
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

const PACK_KEYWORDS = new Set([
  'cx',
  'cxa',
  'caixa',
  'dz',
  'duzia',
  'un',
  'unid',
  'unidade',
  'fd',
  'fardo',
  'pack',
  'c',
  'com'
]);

export function parseSizeFromQuery(query) {
  const normalized = normalizeText(query);

  const sizeWithUnit = normalized.match(/(\d+[\.,]?\d*)\s*(ml|l|litro|litros)/);
  if (sizeWithUnit) {
    const [, rawValue, unit] = sizeWithUnit;
    const size = parseFloat(rawValue.replace(',', '.'));
    if (Number.isFinite(size)) {
      return {
        sizeMl: convertToMilliliters(size, unit),
        explicit: true
      };
    }
  }

  const tokens = normalized.split(' ');
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    const numeric = token.replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(numeric)) continue;

    const nextToken = tokens[index + 1];
    const prevToken = tokens[index - 1];
    if ((nextToken && PACK_KEYWORDS.has(nextToken)) || (prevToken && PACK_KEYWORDS.has(prevToken))) {
      continue; // provavelmente quantidade de pack
    }

    const size = parseFloat(numeric);
    if (Number.isFinite(size)) {
      return {
        sizeMl: size,
        explicit: false
      };
    }
  }

  return { sizeMl: null, explicit: false };
}

export function extractPackQuantity(name) {
  const match = name.match(/c\s*[\/\\]?\s*(\d+)/i) || name.match(/\b(\d+)\s*un/i);
  if (match) {
    const quantity = parseInt(match[1], 10);
    if (Number.isFinite(quantity)) {
      return quantity;
    }
  }
  return null;
}

export function formatPackDescription(packName, originalName) {
  if (!packName) return null;
  const upper = packName.toUpperCase();
  if (upper === 'CX') {
    const quantity = extractPackQuantity(originalName);
    return quantity ? `Caixa c/ ${quantity}` : 'Caixa';
  }
  if (upper === 'UN') {
    return 'Unidade';
  }
  if (upper === 'FD') {
    const quantity = extractPackQuantity(originalName);
    return quantity ? `Fardo c/ ${quantity}` : 'Fardo';
  }
  return packName;
}

export function detectPackKeyword(queryTokens, packSynonyms) {
  for (const token of queryTokens) {
    if (packSynonyms[token]) {
      return packSynonyms[token];
    }
    if (token in packSynonyms) {
      return packSynonyms[token];
    }
  }
  return null;
}

export function hasToken(tokens, token) {
  return tokens.includes(token);
}
