import {
  loadJsonFile,
  normalizeText,
  tokenize,
  uniqueTokens,
  convertToMilliliters,
  toNumber,
  formatPackDescription,
  formatVariantFromSize
} from './utils.js';
import { canonicalPackFromCode } from './synonyms.js';

const CATALOG_PATH = './catalogo.json';

const rawItems = loadJsonFile(CATALOG_PATH);

const catalog = rawItems.map((item) => {
  const containerSize = toNumber(item.container_item_size);
  const sizeMl = convertToMilliliters(containerSize, item.container_unit_of_measurement);
  const normalizedName = normalizeText(item.name);
  const tokens = uniqueTokens(tokenize(item.name));
  const packCanonical = canonicalPackFromCode(item.pack_name);
  const priceRaw = toNumber(item.price);
  const priceMissing = !Number.isFinite(priceRaw);
  const price = priceMissing ? 0 : Number(priceRaw.toFixed(2));

  return {
    ...item,
    container_item_size: containerSize,
    size_ml: sizeMl,
    normalized_name: normalizedName,
    tokens,
    pack_canonical: packCanonical,
    variant: formatVariantFromSize(sizeMl),
    pack: formatPackDescription(item.pack_name, item.name),
    price,
    price_missing: priceMissing
  };
});

const catalogById = new Map();

for (const item of catalog) {
  if (item.item_platform_id) {
    catalogById.set(item.item_platform_id, item);
  }
}

export function getCatalog() {
  return catalog;
}

export function getSearchIndex() {
  return catalog;
}

export function findByItemPlatformId(id) {
  if (!id) return null;
  return catalogById.get(id) || null;
}
