# Catálogo Bees Query API

API em Node.js (ESM) que expõe uma busca fuzzy sobre um catálogo de produtos carregado a partir de um arquivo JSON. O objetivo é permitir consultas por proximidade, levando em consideração tokens do nome, tamanhos e informações de embalagem. O projeto também inclui um módulo de carrinho em memória para simular operações básicas de checkout.

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
    ├── cart.js
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

### `POST /cart/items`

Adiciona ou atualiza itens em um carrinho mantido em memória. Quantidades são sobrescritas; enviar `qty = 0` remove o item do carrinho.

**Body (JSON):**

```json
{
  "cart_id": "opcional",
  "items": [
    { "item_platform_id": "V1RVeFpUUTVOV1psT0d0bGNUTmpPQT09OzAwMTkwMjM=", "qty": 3 },
    { "item_platform_id": "Y3hLeTI3QW9TOW1kaXFqUG9BWUNuZz09OzAwMjY3NTg=", "qty": 0 }
  ]
}
```

**Resposta (200):**

```json
{
  "cart_id": "CART-1234",
  "status": "ok",
  "items": [
    { "item_platform_id": "V1RVeFpUUTVOV1psT0d0bGNUTmpPQT09OzAwMTkwMjM=", "qty": 3 },
    { "item_platform_id": "Y3hLeTI3QW9TOW1kaXFqUG9BWUNuZz09OzAwMjY3NTg=", "qty": 0, "removed": true }
  ]
}
```

Validações aplicadas:

- `items` deve ser um array;
- cada `qty` precisa ser inteiro maior ou igual a zero;
- `item_platform_id` deve existir no catálogo carregado.

Itens inválidos retornam erro 400 seguindo o formato:

```json
{
  "status": "error",
  "invalid": [
    { "item_platform_id": "XYZ", "reason": "not_found_in_catalog" },
    { "item_platform_id": "ABC", "reason": "qty_must_be_integer_gte_0" }
  ]
}
```

### `GET /cart/:cartId/subtotal`

Retorna as linhas do carrinho enriquecidas com dados do catálogo e o subtotal calculado.

**Resposta (200):**

```json
{
  "cart_id": "CART-1234",
  "currency": "BRL",
  "lines": [
    {
      "item_platform_id": "V1RVeFpUUTVOV1psT0d0bGNUTmpPQT09OzAwMTkwMjM=",
      "name": "Cerveja Spaten Munich Helles Lata 350ml Pack UN",
      "variant": "350ml",
      "pack": "Unidade",
      "price": 4.79,
      "qty": 3,
      "line_total": 14.37
    }
  ],
  "subtotal": 14.37
}
```

Carrinhos inexistentes retornam `404` com `{ "status": "not_found", "message": "Cart not found" }`.

Os carrinhos são temporários e possuem TTL de 24h desde o último acesso ou alteração.

## Formato do catálogo

O arquivo `catalogo.json` deve conter um array de objetos com os campos:

- `name`
- `pack_name`
- `container_item_size`
- `container_unit_of_measurement`
- `source_vendor_item_id`
- `product_sku`
- `item_platform_id`
- `price`

Exemplo de item:

```json
{
  "name": "Cerveja Spaten Munich Helles Lata 350ml Pack UN",
  "pack_name": "UN",
  "container_item_size": "350.00000",
  "container_unit_of_measurement": "ml",
  "source_vendor_item_id": "0019023",
  "product_sku": "0019023",
  "item_platform_id": "V1RVeFpUUTVOV1psT0d0bGNUTmpPQT09OzAwMTkwMjM=",
  "price": 4.79
}
```

Durante o carregamento, o tamanho é convertido para número e derivadas úteis são preparadas para busca (tokens, normalização, etc.). Também são calculados os campos `variant`, `pack`, `price` (como número) e `price_missing` para uso no carrinho.

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
- O carrinho é mantido somente em memória; reiniciar o processo limpa todos os carrinhos.
