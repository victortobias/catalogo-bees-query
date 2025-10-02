import crypto from 'crypto';
import { findByItemPlatformId } from './catalog.js';
import { formatPackDescription, formatVariantFromSize } from './utils.js';

const CART_ID_PREFIX = 'CART-';
const CART_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const carts = new Map(); // cartId -> Map(item_platform_id -> qty)
const cartMeta = new Map(); // cartId -> last access timestamp

// Gera identificadores consistentes para novos carrinhos.
function generateCartId() {
  if (typeof crypto.randomUUID === 'function') {
    return `${CART_ID_PREFIX}${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${CART_ID_PREFIX}${random}`;
}

// Recupera a estrutura de itens existente ou cria uma nova.
function ensureCart(cartId) {
  let cart = carts.get(cartId);
  if (!cart) {
    cart = new Map();
    carts.set(cartId, cart);
  }
  return cart;
}

// Atualiza o timestamp de acesso para controles de TTL.
function markAccess(cartId, timestamp = Date.now()) {
  cartMeta.set(cartId, timestamp);
}

// Limpa carrinhos expirados da memória.
function purgeExpiredCarts(now = Date.now()) {
  for (const [cartId, lastAccess] of cartMeta.entries()) {
    if (lastAccess + CART_TTL_MS <= now) {
      cartMeta.delete(cartId);
      carts.delete(cartId);
    }
  }
}

// Normaliza valores monetários para duas casas decimais.
function toMoney(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Number(numeric.toFixed(2));
}

// Adiciona ou sobrescreve itens em um carrinho em memória.
export function upsertItems(cartIdOrNull, items) {
  purgeExpiredCarts();
  const providedId = typeof cartIdOrNull === 'string' && cartIdOrNull.trim() ? cartIdOrNull.trim() : null;
  const cartId = providedId || generateCartId();
  const cart = ensureCart(cartId);
  const now = Date.now();

  const updatedItems = items.map(({ item_platform_id, qty }) => {
    if (qty === 0) {
      cart.delete(item_platform_id);
      markAccess(cartId, now);
      return { item_platform_id, qty, removed: true };
    }

    cart.set(item_platform_id, qty);
    markAccess(cartId, now);
    return { item_platform_id, qty };
  });

  if (cart.size === 0) {
    // Remove completamente carrinhos vazios para evitar acumular estado
    carts.delete(cartId);
    cartMeta.delete(cartId);
  }

  return { cartId, items: updatedItems };
}

// Retorna as linhas do carrinho enriquecidas com dados do catálogo.
export function getCartLines(cartId) {
  purgeExpiredCarts();
  const cart = carts.get(cartId);
  if (!cart) return null;

  const now = Date.now();
  markAccess(cartId, now);

  const lines = [];
  for (const [itemId, qty] of cart.entries()) {
    const catalogItem = findByItemPlatformId(itemId);
    if (!catalogItem) {
      continue;
    }

    const price = Number.isFinite(catalogItem.price) ? catalogItem.price : 0;
    const lineTotal = toMoney(price * qty);
    const line = {
      item_platform_id: itemId,
      name: catalogItem.name,
      variant: catalogItem.variant || formatVariantFromSize(catalogItem.size_ml),
      pack: catalogItem.pack || formatPackDescription(catalogItem.pack_name, catalogItem.name),
      price,
      qty,
      line_total: lineTotal
    };

    if (catalogItem.price_missing) {
      line.price_missing = true;
    }

    lines.push(line);
  }

  return lines;
}

// Calcula o subtotal atual do carrinho.
export function getSubtotal(cartId) {
  purgeExpiredCarts();
  const cart = carts.get(cartId);
  if (!cart) return null;

  const now = Date.now();
  markAccess(cartId, now);

  let subtotal = 0;
  for (const [itemId, qty] of cart.entries()) {
    const catalogItem = findByItemPlatformId(itemId);
    if (!catalogItem) {
      continue;
    }
    const price = Number.isFinite(catalogItem.price) ? catalogItem.price : 0;
    subtotal += price * qty;
  }

  return toMoney(subtotal);
}
