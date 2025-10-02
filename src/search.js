import { getSearchIndex } from './catalog.js';
import {
  normalizeText,
  tokenize,
  uniqueTokens,
  parseSizeFromQuery,
  clamp,
  detectPackKeyword,
  formatPackDescription,
  formatVariantFromSize
} from './utils.js';
import { ALIASES, BRANDS, PACK_SYNONYMS } from './synonyms.js';

function jaccardSimilarity(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function detectAliasSize(normalizedQuery) {
  for (const alias of ALIASES) {
    for (const pattern of alias.patterns) {
      const normalizedPattern = normalizeText(pattern);
      if (normalizedPattern && normalizedQuery.includes(normalizedPattern)) {
        return alias.sizeMl;
      }
    }
  }
  return null;
}

function determineQuerySize(query) {
  const parsed = parseSizeFromQuery(query);
  const normalizedQuery = normalizeText(query);
  const aliasSize = detectAliasSize(normalizedQuery);

  if (aliasSize && !parsed.sizeMl) {
    return { sizeMl: aliasSize, explicit: false, inferred: true };
  }

  if (parsed.sizeMl) {
    return { sizeMl: parsed.sizeMl, explicit: parsed.explicit, inferred: false };
  }

  return { sizeMl: aliasSize || null, explicit: false, inferred: Boolean(aliasSize) };
}

function computeSizeScore(itemSizeMl, querySize) {
  if (!querySize.sizeMl) {
    return 0.7; // neutro quando não há tamanho
  }
  if (!itemSizeMl) {
    return 0.5;
  }
  const delta = Math.abs(querySize.sizeMl - itemSizeMl);
  const score = 1 / (1 + delta / 100);
  return clamp(score, 0, 1);
}

function computePackBonus(itemPackCanonical, queryTokens) {
  const queryPack = detectPackKeyword(queryTokens, PACK_SYNONYMS);
  if (!queryPack) {
    return 0.5; // neutro quando pack não é especificado
  }
  return itemPackCanonical === queryPack ? 1 : 0;
}

function computeTokenScore(queryTokens, itemTokens) {
  const overlap = jaccardSimilarity(queryTokens, itemTokens);
  const brandTokens = queryTokens.filter((token) => BRANDS.includes(token));
  let brandMatches = 0;
  for (const brand of brandTokens) {
    if (itemTokens.includes(brand)) {
      brandMatches += 1;
    }
  }
  const brandBonus = Math.min(0.2, brandMatches * 0.1);
  return clamp(overlap + brandBonus, 0, 1);
}

export function searchCatalog(query, limit = 5) {
  const normalizedQuery = normalizeText(query || '');
  const queryTokens = uniqueTokens(tokenize(query || ''));
  const querySize = determineQuerySize(query || '');

  const matches = getSearchIndex()
    .map((item) => {
      const tokenScore = computeTokenScore(queryTokens, item.tokens);
      const sizeScore = computeSizeScore(item.size_ml, querySize);
      const packBonus = computePackBonus(item.pack_canonical, queryTokens);

      const score = clamp(0.6 * tokenScore + 0.25 * sizeScore + 0.15 * packBonus);

      return {
        item,
        tokenScore,
        sizeScore,
        packBonus,
        score
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) => ({
      product_id: item.product_sku || item.source_vendor_item_id,
      name: item.name,
      variant: item.variant || formatVariantFromSize(item.size_ml),
      pack: item.pack || formatPackDescription(item.pack_name, item.name),
      score: Number(score.toFixed(4))
    }));

  return {
    query: normalizedQuery,
    matches
  };
}
