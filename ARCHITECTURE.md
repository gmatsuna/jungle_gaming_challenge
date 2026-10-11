# Architecture & Design Decisions

Este documento detalha as decisões arquiteturais, padrões de design, *trade-offs* e estratégias de mitigação adotadas no desenvolvimento do sistema de carteira e processamento de apostas.

---

## 1. Visão Geral da Arquitetura

O sistema foi concebido sob os princípios de **Domain-Driven Design (DDD)** e **Arquitetura Limpa (Clean Architecture)**, desacoplando o núcleo de domínio de frameworks (NestJS) e ORMs (MikroORM). O objetivo central é garantir **integridade financeira absoluta**, **consistência transacional** e **tolerância a falhas distribuídas**.

### Camadas da Aplicação

| Camada | Responsabilidade & Isolamento | Componentes Principais |
| :--- | :--- | :--- |
| **Domínio** | Regras de negócio puras, isento de frameworks ou banco de dados. | `Wallet`, `WagerTransaction`, `WalletLedgerEntry`, `Money` (VO) |
| **Aplicação** | Orquestração de fluxos e controle de transações. | Casos de uso (ex: `ProcessWagerTransactionUseCase`) |
| **Infraestrutura** | Adaptadores de persistência, mensageria e contratos externos. | PostgreSQL, MikroORM, AWS SQS / LocalStack, NestJS Controllers |

---

## 2. Estratégia de Concorrência e Isolamento (`Wallet`)

Para atender aos cenários de alta concorrência (como o teste obrigatório de 50 requisições simultâneas ou disputa de saldo em *hot wallets*), a estratégia adotada combina **Domain Locking** e **Controle Transacional no Banco de Dados**:

* **Pessimistic Locking (`PESSIMISTIC_WRITE`)**: No início do caso de uso de processamento, a carteira (`Wallet`) é consultada utilizando bloqueio exclusivo de escrita na linha do banco de dados. Isso serializa acessos concorrentes à mesma `walletId`, eliminando completamente o risco de *lost updates* e garantindo que leituras e escritas de saldo ocorram sobre o estado mais recente.
* **Isolamento por `walletId`**: O lock restringe-se estritamente à carteira afetada. Operações em carteiras distintas executam de forma totalmente paralela, sem contenção global.
* **Database Constraints**: O banco de dados PostgreSQL atua como a garantia final (fonte da verdade). Restrições do tipo `CHECK` no schema impedem matematicamente que o saldo atinja valores negativos, mesmo em cenários de falha de lógica na aplicação.

---

## 3. Idempotência e Confiabilidade de Mensageria

O sistema foi desenhado para operar em ambientes distribuídos com entrega *at-least-once*, blindando-se contra duplicidades e falhas parciais:

* **Idempotência Persistente**: A tabela `wager_transactions` utiliza um índice único composto na chave de idempotência (`idempotencyKey`).
* **Validação por Hash Canônico de Payload**: Se a mesma chave de idempotência for submetida com dados diferentes, o sistema rejeita a requisição detectando conflito de payload, em vez de retornar um falso *replay*. Se o payload for idêntico, a transação retorna o resultado original (`idempotentReplay: true`).
* **Inbox Pattern**: Mensagens recebidas do SQS são registradas na tabela `inbox_messages` dentro da mesma transação SQL da operação financeira, garantindo deduplicação persistente no consumidor.
* **Ack Pós-Commit**: O reconhecimento (*ack*) da mensagem no SQS ocorre estritamente após a confirmação bem-sucedida (*commit*) da transação no banco de dados.

---

## 4. Consistência Atômica e Padrão *Transactional Outbox*

Para evitar o problema de *dual-write* entre o banco de dados e o broker de mensageria:

* **Outbox Pattern**: Todos os eventos de integração gerados por uma operação financeira (`WalletBalanceChanged`, `WagerTransactionProcessed`, etc.) são persistidos na tabela `outbox_messages` na **mesma transação SQL** que altera a carteira e gera o lançamento no ledger.
* **Relayer Desacoplado**: Um worker em background (`OutboxRelayerService`) varre a tabela de outbox e despacha os eventos para o SQS de forma assídua, garantindo que nenhum evento seja publicado antes do commit financeiro.

---

## 5. Ledger Imutável e Auditoria de Partidas

* **Trilha de Auditoria Estrita**: A entidade `WalletLedgerEntry` é estruturalmente imutável (sem métodos de mutação ou campos alteráveis após a criação).
* **Consistência Matemática**: Toda alteração de saldo gera obrigatoriamente um lançamento correspondente no ledger. A fábrica de criação valida aritmeticamente se o saldo anterior e o posterior batem com o valor movimentado ($\text{balanceBefore} \pm \text{money} === \text{balanceAfter}$).
* **Reconciliação**: O endpoint de reconciliação (`POST /wallets/:walletId/reconciliation`) permite auditar a qualquer momento se o saldo armazenado na carteira (`storedBalance`) coincide perfeitamente com a soma acumulada dos lançamentos no ledger (`calculatedBalance`).

---

## 6. Tratamento de Erros e Recuperação de Falhas

O tratamento de falhas está segmentado em categorias claras de comportamento:

| Categoria | Comportamento / Estratégia | Destino da Transação |
| :--- | :--- | :--- |
| **Erros de Domínio / Negócio** | Rejeição por regra de validação (ex: saldo insuficiente, conflito de payload). | Status terminal `REJECTED` (Ack imediato). |
| **Erros Transitórios** | Falhas temporárias de rede ou infraestrutura. | Nova tentativa controlada com *backoff* exponencial. |
| **Erros Permanentes** | Esgotamento do limite de tentativas ou falhas críticas. | Encaminhado para a DLQ (`wager-transactions-dlq.fifo`). |

* **Graceful Shutdown**: Em caso de sinal de interrupção (`SIGTERM`), o serviço conclui os ciclos de transação em andamento ou devolve a visibilidade das mensagens ao broker para evitar perda de dados.

---

## 7. Trade-offs e Limitações Conhecidas

* **Latência vs. Consistência**: O uso de bloqueio pessimista (`PESSIMISTIC_WRITE`) prioriza a **consistência financeira estrita** em detrimento de uma concorrência massiva na mesma linha de carteira individual (*hot wallet*). Para o domínio de apostas, a integridade absoluta do saldo supera a necessidade de vazão extrema por usuário singular.
* **Complexidade de Infraestrutura**: A dependência de um SQS (ou LocalStack) e PostgreSQL exige um ambiente de testes integrado robusto (Docker Compose), o que aumenta o tempo de execução dos testes de integração comparado a testes estritamente unitários com mocks.