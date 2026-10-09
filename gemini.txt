📑 Resumo Executivo dos Requisitos
O objetivo do desafio é construir um serviço financeiro distribuído de alto desempenho e precisão para processar transações de apostas (iGaming) recebidas de múltiplos provedores.

🎯 Foco Principal da Avaliação
O desafio não avalia um CRUD básico, mas sim a capacidade de lidar com sistemas distribuídos, concorrência, consistência transacional e precisão financeira.

🔑 Principais Pontos e Regras do Sistema
1. Tolerância a Falhas e Mensageria (At-Least-Once)
O sistema deve ser resistente a mensagens duplicadas, entregas fora de ordem, processamento simultâneo por múltiplas instâncias e falhas no meio da execução (crashing antes/depois do commit).

Entradas fora de ordem (PENDING_REFERENCE): Se um REFUND ou ROLLBACK chegar antes do BET correspondente, deve ficar pendente e ser reprocessado via worker agendado com backoff exponencial.

2. Precisão Monetária & Invariantes
Proibido usar number, float ou double para dinheiro. O tipo Money deve usar representação decimal exata (escala fixa de 2 casas, ex: "25.00" BRL) e ser imutável.

Saldo nunca pode ser negativo.

Integridade Banco x Ledger: Toda alteração de saldo exige exatamente um lançamento correspondente no ledger (DEBIT ou CREDIT), salvo para operações sem efeito financeiro (ex: LOSS).

3. Concorrência e Idempotência Persistente
Sem lock global e sem idempotência em memória.

A unidade de concorrência é a walletId. Múltiplas instâncias operando a mesma wallet devem usar mecanismos como Pessimistic Locking ou Optimistic Locking.

Idempotency Key + Payload Hash: Submissões idênticas geram respostas idênticas com idempotentReplay: true. Reenvio da mesma chave com payload divergente deve gerar conflito.

4. Padrões de Arquitetura Obrigatórios
Inbox Pattern: Garantir idempotência e evitar duplicação no processamento das mensagens do SQS.

Transactional Outbox Pattern: Alteração de saldo, gravação de ledger, inbox e eventos de integração devem ser salvos dentro da mesma transação SQL. Um worker separado publica os eventos para o SQS/SNS.

5. Stack Tecnológica
Runtime / Package Manager: Bun 1.x

Linguagem: TypeScript (Modo Estrito)

Framework: NestJS

Banco de Dados: PostgreSQL (TypeORM ou MikroORM — preferencial)

Mensageria: AWS SQS via LocalStack

Orquestração: Docker Compose

6. Autenticação
Não vale pontos na avaliação. Pode ser implementada via IdP externo (Keycloak/Zitadel) ou apenas sinalizada com um point of extension (AuthGuard no-op / ProviderIdentityPort) e documentada no ARCHITECTURE.md.

🚀 Passo a Passo para Desenvolvimento
Abaixo está o plano de ação em fases estruturadas para a construção do projeto do zero até a entrega final.

Fase 1: Configuração do Ambiente e Infraestrutura Básica
Setup Inicial do Projeto NestJS com Bun

Inicializar projeto TypeScript com Bun.

Configurar tsconfig.json em modo estrito (strict mode).

Configurar linter e formatador.

Docker Compose & LocalStack

Subir PostgreSQL (v16+).

Subir LocalStack configurado para provisionar as filas SQS FIFO (wager-transactions.fifo e wager-transactions-dlq.fifo).

Adicionar script de inicialização do AWS/LocalStack.

Conexão com Banco de Dados e Migrations

Configurar ORM selecionado (MikroORM ou TypeORM).

Configurar migrations versionadas e reversíveis.

Fase 2: Modelagem de Domínio Rich & Invariantes (DDD)
Value Object Money

Implementar classe Money imutável baseada em string decimal de alta precisão (Decimal.js ou similar).

Implementar validações (rejeitar NaN, mais de 2 casas, moedas diferentes, etc.).

Criar métodos de operações (add, subtract, equals, etc.).

Aggregate Root Wallet

Mapear atributos, construtor privado, factory estática open e rehydrate.

Métodos credit() e debit() encapsulando regras de validação de saldo e concorrência.

Entidade WagerTransaction

Mapear enums WagerTransactionKind (BET, WIN, LOSS, REFUND, ROLLBACK, OPENING) e WagerTransactionStatus.

Implementar controle de estados e transições (métodos markProcessed, reject, fail, etc.).

Entidades de Suporte (WalletLedgerEntry, InboxMessage, OutboxMessage)

Implementar WalletLedgerEntry estritamente imutável.

Implementar InboxMessage para deduplicação de mensagens.

Implementar OutboxMessage para o Transactional Outbox.

Fase 3: Persistência & Schema do Banco de Dados
Desenho de Schema e Migrations

Tabela wallets com restrição de unicidade (player_id, currency) e coluna de versão para locking.

Tabela wager_transactions com índice e restrição para (provider_id, external_transaction_id) e idempotency_key.

Tabela wallet_ledger_entries com restrição de verificação/integridade.

Tabelas inbox_messages e outbox_messages.

Criar check constraints no PostgreSQL para impedir saldo negativo no próprio schema.

Fase 4: Core de Aplicação & Casos de Uso (Use Cases)
Caso de Uso: Criar Wallet (CreateWalletUseCase)

Criar wallet e, se houver saldo inicial, registrar transação OPENING e entrada no ledger na mesma transação SQL.

Caso de Uso Principal: Processar Transação (ProcessWagerTransactionUseCase)

Validação de idempotência (Idempotency-Key + Hash do JSON Canônico).

Execução da transação SQL (Wallet update + Ledger + Outbox + Inbox).

Regras específicas para cada kind (BET, WIN, LOSS, REFUND, ROLLBACK).

Tratamento de referências ausentes (PENDING_REFERENCE).

Worker de Reprocessamento de Pendências

Processo agendado/cron para buscar transações PENDING_REFERENCE e reprocessar com backoff exponencial.

Caso de Uso: Reconciliação (ReconcileWalletUseCase)

Comparar saldo atual com o somatório do ledger e emitir resposta com inconsistências, se houver.

Fase 5: Mensageria, SQS & Transactional Outbox
Outbox Publisher Worker

Worker concorrente que busca registros pendentes em outbox_messages, envia para o SQS/SNS e marca como publicado.

Consumidor SQS (Inbox Pattern)

Consumidor que lê da fila wager-transactions.fifo.

Deduplicação persistente via inbox_messages.

Gestão de ack/nack, retries e direcionamento para DLQ após esgotar tentativas.

Tratamento do sinal SIGTERM (graceful shutdown).

Fase 6: API HTTP & Controladores NestJS
Endpoints de Carteira e Transações

POST /wallets

GET /wallets/:walletId

GET /wallets/:walletId/ledger (paginado via cursor)

POST /wagering/transactions (com header Idempotency-Key)

GET /wagering/transactions/:transactionId

GET /providers/:providerId/wagering/transactions/:externalTransactionId

POST /wallets/:walletId/reconciliation

Health Checks & Observabilidade

GET /health/live e GET /health/ready (valida conexão com Postgres e SQS sem exigir auth).

Logs estruturados em JSON com correlationId, walletId, etc.

Fase 7: Suíte de Testes (Unitários, Integração e Concorrência)
Testes Unitários

Regras de negócio de Money, Wallet, WagerTransaction e cálculo de hashes.

Testes de Integração com Contêineres Reais

Execução com banco PostgreSQL e LocalStack reais.

Validação de transações atômicas, Outbox, Inbox e DLQ.

Testes de Concorrência e Race Conditions

Envio de 50 apostas simultâneas para a mesma wallet (Cenário obrigatório da seção 8).

Teste com 3+ instâncias simuladas disputando saldo.

Invariante final em todos os testes: wallet.balance == sum(ledger.entries).

Fase 8: Documentação Final
README.md: Instruções claras de setup local, subida do Docker e comandos para execução de testes.

ARCHITECTURE.md: Detalhamento e justificativa de todas as decisões técnicas (Estratégia de Lock, ORM, Tratamento de Concorrência, Estrutura do Hash e Autenticação).