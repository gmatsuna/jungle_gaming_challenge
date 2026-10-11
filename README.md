# JungleGaming — Sistema de Carteira e Processamento de Apostas

Sistema de alta confiabilidade financeira desenvolvido em **NestJS**, **Bun** e **PostgreSQL (MikroORM)**, projetado com arquitetura orientada ao eventos, garantia de atomicidade, processamento idempotente e mensageria distribuída via **AWS SQS / LocalStack**.

Em razão de ter o conhecimento técnico ou pratico das Tecnologias aplicadas ao teste houve necessidade da utilização de inteligência artificial para chegar a solução da problemática proposta.

---

## 🚀 Requisitos e Tecnologias

- **Runtime**: [Bun](https://bun.sh/) (>= 1.0)
- **Framework**: NestJS
- **Banco de Dados**: PostgreSQL (com MikroORM)
- **Mensageria**: AWS SQS FIFO (simulado via LocalStack)
- **Containerização**: Docker & Docker Compose

---

## ⚙️ Setup e Execução do Ambiente

### 1. Variáveis de Ambiente
Certifique-se de configurar o arquivo `.env` na raiz do projeto:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=
```

### 2. Subindo a Infraestrutura (PostgreSQL e LocalStack)
Para iniciar os containers de banco de dados e filas SQS:
```bash
docker compose up -d
```

### 3. Instalando Dependências
```bash
bun install
```

### 4. Executando as Migrations do Banco de Dados
```bash
bun run migration:up
```

### 5. Iniciando a Aplicação
- **Modo de desenvolvimento (watch):**
  ```bash
  bun run start:dev
  ```
- **Modo de produção:**
  ```bash
  bun run build
  bun run start:prod
  ```

---

## 🧪 Execução de Testes

O projeto conta com uma suíte de testes robusta cobrindo unidades, integração com containers reais e cenários extremos de concorrência.

- **Testes Unitários:**
  ```bash
  bun run test
  ```
- **Testes de Integração e Concorrência (requer Docker rodando):**
  ```bash
  bun run test:integration
  ```
- **Cobertura de Testes:**
  ```bash
  bun run test:cov
  ```

---

## 📡 Endpoints Principais da API HTTP

### 1. Wallets
- `POST /wallets` — Cria uma nova carteira (gera transação interna `OPENING` se saldo inicial > 0).
- `GET /wallets/:walletId` — Retorna os dados atuais da carteira e saldo.
- `GET /wallets/:walletId/ledger?cursor=...&limit=50` — Consulta o ledger paginado por cursor.
- `POST /wallets/:walletId/reconciliation` — Executa reconciliação comparando saldo armazenado vs. calculado pelo ledger.

### 2. Transações de Apostas
- `POST /wagering/transactions` *(Header obrigatório: `Idempotency-Key`)* — Submete uma transação (`BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`).
- `GET /wagering/transactions/:transactionId` — Consulta transação por ID interno.
- `GET /providers/:providerId/wagering/transactions/:externalTransactionId` — Consulta transação por ID do provedor.

### 3. Health Checks (Sem Autenticação)
- `GET /health/live` — Verifica se o processo está vivo.
- `GET /health/ready` — Verifica a conectividade com o PostgreSQL e o SQS.

---

## 📐 Decisões de Arquitetura

Para detalhes aprofundados sobre isolamento por bloqueio pessimista (`PESSIMISTIC_WRITE`), padrões *Inbox/Outbox*, imutabilidade do ledger e mitigação de *lost updates*, consulte o documento [ARCHITECTURE.md](./ARCHITECTURE.md).