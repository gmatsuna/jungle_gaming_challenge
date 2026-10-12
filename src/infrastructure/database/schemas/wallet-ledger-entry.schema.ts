import { EntitySchema } from '@mikro-orm/core';
import { WalletLedgerEntry, LedgerDirection } from '../../../domain/entities/wallet-ledger-entry.entity';
import { MoneyType } from '../types/money.type';

/**
 * Schema de mapeamento ORM (MikroORM) para a entidade WalletLedgerEntry,
 * configurando a persistência imutável dos lançamentos de extrato com tipos monetários customizados e unicidade por transação.
 */
export const WalletLedgerEntrySchema = new EntitySchema<WalletLedgerEntry>({
  class: WalletLedgerEntry,
  tableName: 'wallet_ledger_entries',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    walletId: { type: 'uuid' },
    transactionId: { type: 'uuid' },
    // Mapeamento do enum de direção do lançamento (DEBIT / CREDIT)
    direction: { type: 'enum', items: Object.values(LedgerDirection) },
    // Mapeamento persistido dos valores monetários utilizando o tipo customizado MoneyType
    money: { type: MoneyType },
    balanceBefore: { type: MoneyType },
    balanceAfter: { type: MoneyType },
    createdAt: { type: 'datetime', onCreate: () => new Date() },
  },
  indexes: [
    // Índice composto exclusivo garantindo que uma mesma transação não gere lançamentos duplicados na mesma carteira
    { name: 'idx_ledger_wallet_tx', properties: ['walletId', 'transactionId'], unique: true },
  ],
});