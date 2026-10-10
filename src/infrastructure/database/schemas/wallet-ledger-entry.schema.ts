import { EntitySchema } from '@mikro-orm/core';
import { WalletLedgerEntry, LedgerDirection } from '../../../domain/entities/wallet-ledger-entry.entity';
import { MoneyType } from '../types/money.type';

export const WalletLedgerEntrySchema = new EntitySchema<WalletLedgerEntry>({
  class: WalletLedgerEntry,
  tableName: 'wallet_ledger_entries',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    walletId: { type: 'uuid' },
    transactionId: { type: 'uuid' },
    direction: { type: 'enum', items: Object.values(LedgerDirection) },
    money: { type: MoneyType },
    balanceBefore: { type: MoneyType },
    balanceAfter: { type: MoneyType },
    createdAt: { type: 'datetime', onCreate: () => new Date() },
  },
  indexes: [
    { name: 'idx_ledger_wallet_tx', properties: ['walletId', 'transactionId'], unique: true },
  ],
});