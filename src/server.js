import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { searchCatalog } from './search.js';
import { upsertItems, getCartLines, getSubtotal } from './cart.js';
import { findByItemPlatformId } from './catalog.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/catalog/search', (req, res) => {
  const { q } = req.query;
  const queryText = typeof q === 'string' ? q.trim() : '';

  if (!queryText) {
    return res.status(400).json({ error: 'Parâmetro q é obrigatório.' });
  }

  try {
    const result = searchCatalog(queryText);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar catálogo:', error);
    res.status(500).json({ error: 'Erro interno ao processar a busca.' });
  }
});

app.post('/cart/items', (req, res) => {
  const { cart_id: rawCartId, items } = req.body || {};

  if (!Array.isArray(items)) {
    return res.status(400).json({
      status: 'error',
      invalid: [{ reason: 'items_must_be_array' }]
    });
  }

  const invalid = [];
  const validItems = [];

  for (const payload of items) {
    const itemId = typeof payload?.item_platform_id === 'string' ? payload.item_platform_id.trim() : '';
    const qty = payload?.qty;

    if (!itemId) {
      invalid.push({ reason: 'item_platform_id_required' });
      continue;
    }

    if (!Number.isInteger(qty) || qty < 0) {
      invalid.push({ item_platform_id: itemId, reason: 'qty_must_be_integer_gte_0' });
      continue;
    }

    const catalogItem = findByItemPlatformId(itemId);
    if (!catalogItem) {
      invalid.push({ item_platform_id: itemId, reason: 'not_found_in_catalog' });
      continue;
    }

    validItems.push({ item_platform_id: itemId, qty });
  }

  if (invalid.length > 0) {
    return res.status(400).json({
      status: 'error',
      invalid
    });
  }

  const cartId = typeof rawCartId === 'string' && rawCartId.trim() ? rawCartId.trim() : null;
  const { cartId: finalCartId, items: updatedItems } = upsertItems(cartId, validItems);

  return res.json({
    cart_id: finalCartId,
    status: 'ok',
    items: updatedItems
  });
});

app.get('/cart/:cartId/subtotal', (req, res) => {
  const { cartId } = req.params;
  const lines = getCartLines(cartId);

  if (lines === null) {
    return res.status(404).json({ status: 'not_found', message: 'Cart not found' });
  }

  const subtotal = getSubtotal(cartId);

  return res.json({
    cart_id: cartId,
    currency: 'BRL',
    lines,
    subtotal
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
