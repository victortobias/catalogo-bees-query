# Catálogo Bees Query API

API em Node.js (ESM) que expõe uma busca fuzzy sobre um catálogo de produtos carregado a partir de um arquivo JSON. O objetivo é permitir consultas por proximidade, levando em consideração tokens do nome, tamanhos e informações de embalagem.

## Tecnologias

- Node.js + Express
- CORS, Morgan e Dotenv
- Catálogo carregado de `catalogo.json` em memória

## Estrutura do projeto

```
├── catalogo.json
├── package.json
├── .env.example
├── README.md
└── src
    ├── catalog.js
    ├── search.js
    ├── server.js
    ├── synonyms.js
    └── utils.js
```

## Preparação do ambiente

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo `.env.example` para `.env` e ajuste as variáveis, se necessário:

```bash
cp .env.example .env
```

3. Inicie o servidor em modo desenvolvimento:

```bash
npm run dev
```

Ou execute em modo produção simples:

```bash
npm start
```

O servidor ficará disponível em `http://localhost:3001` por padrão.

## Endpoints

### `GET /health`

Retorna o status da API.

### `GET /catalog/search?q=<texto>`

Executa uma busca fuzzy considerando:

- Sobreposição de tokens (Jaccard)
- Aproximação do tamanho (ml ou litros)
- Compatibilidade de embalagem (caixa, fardo, unidade)
- Bônus para marcas conhecidas

Resposta de exemplo:

```json
{
  "query": "brahma chopp latao",
  "matches": [
    {
      "product_id": "0102045",
      "name": "Cerveja Brahma Duplo Malte Latao 473ml Fardo c/ 12",
      "variant": "473ml",
      "pack": "Fardo c/ 12",
      "score": 0.8725
    }
  ]
}
```

Máximo de 5 itens são retornados, ordenados pelo score em ordem decrescente.

## Formato do catálogo

O arquivo `catalogo.json` deve conter um array de objetos com os campos:

- `name`
- `pack_name`
- `container_item_size`
- `container_unit_of_measurement`
- `source_vendor_item_id`
- `product_sku`
- `item_platform_id`

Exemplo de item:

```json
{
  "name": "Cerveja Brahma Chopp Descartável 350ml Caixa c/ 12 un",
  "pack_name": "CX",
  "container_item_size": "350.00000",
  "container_unit_of_measurement": "ml",
  "source_vendor_item_id": "0013079",
  "product_sku": "0013079",
  "item_platform_id": "Y3hLeTI3QW9TOW1kaXFqUG9BWUNuZz09OzAwMTMwNzk="
}
```

Durante o carregamento, o tamanho é convertido para número e derivadas úteis são preparadas para busca (tokens, normalização, etc.).

## Exemplos de consulta

```bash
curl "http://localhost:3001/catalog/search?q=brahma%20chopp%20latao"
curl "http://localhost:3001/catalog/search?q=spaten%20long%20neck"
curl "http://localhost:3001/catalog/search?q=duplo%20malte%20550ml%20caixa"
```

## Notas de implementação

- O catálogo é carregado uma única vez na inicialização e mantido em memória.
- A pontuação final varia entre 0 e 1, combinando tokens (60%), tamanho (25%) e embalagem (15%).
- Quando o tamanho não é informado, um valor neutro de 0.7 é aplicado para evitar penalidades.
- A detecção de aliases como “latão” e “long neck” atribui tamanhos padrão (473 ml e 355 ml, respectivamente).
