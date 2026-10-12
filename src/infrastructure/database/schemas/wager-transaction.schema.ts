import { EntitySchema } from '@mikro-orm/core';
import { WagerTransaction, WagerTransactionKind, WagerTransactionStatus } from '../../../domain/entities/wager-transaction.entity';
import { MoneyType } from '../types/money.type';

/**
 * Schema de mapeamento ORM (MikroORM) para a entidade WagerTransaction,
 * definindo colunas relacionais, tipos monetários customizados, enums e restrições de unicidade.
 */
export const WagerTransactionSchema = new EntitySchema<WagerTransaction>({
  class: WagerTransaction,
  tableName: 'wager_transactions',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    providerId: { type: 'varchar', length: 255 },
    externalTransactionId: { type: 'varchar', length: 255 },
    idempotencyKey: { type: 'varchar', length: 255 },
    payloadHash: { type: 'varchar', length: 255 },
    walletId: { type: 'uuid' },
    playerId: { type: 'varchar', length: 255 },
    roundId: { type: 'varchar', length: 255 },
    gameId: { type: 'varchar', length: 255 },
    // Mapeamento do enum de tipos de transação
    kind: { type: 'enum', items: Object.values(WagerTransactionKind) },
    // Mapeamento personalizado para persistência segura do Value Object Money
    money: { type: MoneyType },
    referenceExternalTransactionId: { type: 'varchar', length: 255, nullable: true },
    // Mapeamento do enum de status com valor padrão Pendente
    status: { type: 'enum', items: Object.values(WagerTransactionStatus), default: WagerTransactionStatus.Pending },
    referenceTransactionId: { type: 'uuid', nullable: true },
    failureCode: { type: 'varchar', length: 255, nullable: true },
    createdAt: { type: 'datetime', onCreate: () => new Date() },
    processedAt: { type: 'datetime', nullable: true },
  },
  indexes: [
    // Índice exclusivo para garantir chave de idempotência nas requisições
    { name: 'idx_wager_tx_idempotency_key', properties: ['idempotencyKey'], unique: true },
    // Índice exclusivo composto para prevenir duplicidade de transações externas por provedor
    { name: 'idx_wager_tx_provider_ext_id', properties: ['providerId', 'externalTransactionId'], unique: true },
  ],
});