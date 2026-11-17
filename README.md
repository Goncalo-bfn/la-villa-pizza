# La Villa Pizza

Cardápio digital e painel do lojista da La Villa Pizza, recriado como uma aplicação
React + Vite + TypeScript + Tailwind CSS.

O cliente monta a pizza, escolhe tamanho, borda e quantidade, finaliza a entrega e envia
o pedido formatado direto pelo WhatsApp. O lojista gerencia produtos, categorias,
pedidos e configurações em `/admin`.

## Requisitos

- Node.js 18+
- npm

## Como rodar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure o Supabase (veja [Supabase](#supabase)):

   ```bash
   cp .env.example .env
   # edite .env com a URL e a chave do seu projeto
   ```

3. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

- Cardápio: `http://localhost:5173/`
- Painel: `http://localhost:5173/admin`
- PIN inicial do painel: `1234` (pode ser alterado em **Configurações**)

> Sem o `.env` configurado, o app exibe o cardápio inicial local e o painel mostra um
> aviso de sincronização. Nenhuma alteração é salva até o Supabase estar disponível.

## Supabase

O cardápio (categorias, produtos e configurações da loja) é persistido no Supabase.
O carrinho, os pedidos e os dados do cliente continuam no `localStorage` do navegador.

### 1. Variáveis de ambiente

Crie o `.env` na raiz do projeto:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
```

Use a chave **anon/public** (ou publishable) do projeto. Nunca use a `service_role`
no front-end.

### 2. Crie as tabelas

Abra o **SQL Editor** do painel do Supabase e execute o conteúdo de
[`supabase/schema.sql`](supabase/schema.sql). O script cria:

- `categories` — categorias do cardápio, com `sort_order`;
- `products` — produtos, preços por tamanho (`size_prices` em JSONB) e vínculo com a categoria;
- `store_settings` — uma única linha (`id = 'default'`) com dados da loja, tamanhos e bordas;
- índices, trigger de `updated_at` e políticas de RLS.

Depois de executar o SQL, recarregue o app. Na primeira execução, se as tabelas estiverem
vazias, o cardápio inicial de `src/data/seed.ts` é gravado automaticamente.

### 3. Recomeçar do zero

No painel, use **Configurações → Restaurar cardápio original** para apagar categorias e
produtos do banco e regravar o seed. Também é possível limpar as tabelas manualmente no
Supabase.

### Segurança

O painel usa um PIN validado no navegador (client-side) e as políticas de RLS do
`schema.sql` liberam leitura e escrita para a chave anônima. Isso é adequado apenas para
uso pessoal/interno: **qualquer pessoa com acesso ao site pode ler o PIN e alterar o
cardápio**. Para produção, migre o painel para Supabase Auth e restrinja as operações de
escrita a usuários autenticados (e remova `admin_pin` do acesso público).

Para endurecer depois, troque as políticas `for all to anon` por:

- `select` público em `categories`, `products` e `store_settings`;
- `insert/update/delete` somente para `authenticated` (ou para um papel de admin).

## Scripts

| Script              | Descrição                                  |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento com HMR        |
| `npm run build`     | Checagem de tipos + build de produção      |
| `npm run preview`   | Pré-visualiza o build de produção          |
| `npm run typecheck` | Apenas a checagem de tipos                 |

## Funcionalidades

### Cardápio (`/`)

- Header fixo com status da loja e carrinho.
- Hero com imagem do forno, logo e atalhos.
- Filtros por categoria com rolagem horizontal no celular.
- Grid responsivo de produtos (4 colunas no desktop).
- Modal de produto com tamanhos (P/M/G), bordas recheadas, quantidade e observação.
- Carrinho lateral com edição de quantidade e resumo de valores.
- Barra flutuante do carrinho no rodapé da tela, com quantidade, total e atalho para finalizar.
- Checkout com entrega/retirada, dados do cliente, endereço, pagamento e troco.
- Validação dos campos obrigatórios antes de enviar.
- Pedido formatado e enviado para o WhatsApp configurado, somente no checkout.
- Contato de WhatsApp discreto no rodapé, como informação institucional.

### Painel (`/admin`)

- Acesso protegido por PIN (sessão via `sessionStorage`).
- Atalho secreto: 5 cliques rápidos no logo da La Villa Pizza abrem `/admin`.
- Indicadores do dia: pedidos, vendas, itens ativos e loja aberta/fechada.
- **Pedidos**: histórico local, status, contato com o cliente e exclusão.
- **Produtos**: criar, editar, excluir, ativar/desativar, destaque e preços por tamanho.
- **Categorias**: criar, editar, reordenar e excluir (com os produtos da categoria).
- **Configurações**: nome, slogan, WhatsApp, taxa de entrega, PIN, horário, tamanhos,
  bordas e restauração do cardápio original.

## Dados

Cardápio no Supabase; dados do cliente no navegador:

| Onde                | Conteúdo                                                   |
| ------------------- | ---------------------------------------------------------- |
| Supabase            | `categories`, `products` e `store_settings`                |
| `lavilla:cart:v1`   | Carrinho                                                   |
| `lavilla:orders:v1` | Pedidos                                                    |
| `lavilla:customer:v1` | Dados do cliente (exceto obs./troco)                     |
| `lavilla:admin-session` | Sessão do painel (`sessionStorage`)                    |

Ao falhar a conexão, o cardápio em memória continua utilizável e o painel exibe um
banner com a mensagem do Supabase e o botão **Tentar novamente**.

## Estrutura

```
public/
  images/          # Imagens otimizadas do cardápio
src/
  components/
    admin/         # Painel do lojista
    cart/          # Carrinho e checkout
    home/          # Hero, filtros, cards e modal
    layout/        # Header, footer e suporte
    ui/            # Componentes base (Button, Input, Sheet, Switch...)
  context/         # Menu, carrinho, pedidos e avisos
  data/            # Seed do cardápio
  hooks/           # Hooks compartilhados
  lib/
    menuRepository.ts  # Mapeamento e CRUD no Supabase
    supabase.ts        # Cliente Supabase e verificação de configuração
    ...                # Utilitários, WhatsApp, assets e status
  pages/           # HomePage e AdminPage
  types/           # Tipos do domínio
supabase/
  schema.sql       # Tabelas, índices, trigger e políticas de RLS
```

## Deploy

O projeto é uma SPA. O arquivo `vercel.json` na raiz já configura o redirecionamento de
rotas desconhecidas para `index.html` na Vercel, incluindo `/admin`.

Na Vercel, configure também as variáveis de ambiente do projeto:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Elas precisam existir no momento do build. Para outros servidores estáticos, use o
equivalente: `try_files $uri /index.html` (Nginx) ou uma regra de rewrite para
`/index.html` (Netlify, Cloudflare Pages etc.).

## Contato e personalização

O número que recebe os pedidos, a taxa de entrega e o PIN são editáveis no painel. O
valor inicial é `(98) 98702-0320`, taxa de `R$ 5,00` e PIN `1234`.
