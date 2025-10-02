import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { searchCatalog } from './search.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(morgan('dev'));

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
