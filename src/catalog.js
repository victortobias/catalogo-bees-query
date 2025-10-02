import { loadJsonFile, normalizeText, tokenize, uniqueTokens, convertToMilliliters, toNumber } from './utils.js';
import { canonicalPackFromCode } from './synonyms.js';

const CATALOG_PATH = './catalogo.json';

const rawItems = loadJsonFile(CATALOG_PATH);

const catalog = rawItems.map((item) => {
  const containerSize = toNumber(item.container_item_size);
  const sizeMl = convertToMilliliters(containerSize, item.container_unit_of_measurement);
  const normalizedName = normalizeText(item.name);
  const tokens = uniqueTokens(tokenize(item.name));
  const packCanonical = canonicalPackFromCode(item.pack_name);

  return {
    ...item,
    container_item_size: containerSize,
    size_ml: sizeMl,
    normalized_name: normalizedName,
    tokens,
    pack_canonical: packCanonical
  };
});

export function getCatalog() {
  return catalog;
}

export function getSearchIndex() {
  return catalog;
}
