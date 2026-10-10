import { EntitySchema } from '@mikro-orm/core';
import { Wallet } from '../../../domain/entities/wallet.entity';
import { MoneyType } from '../types/money.type';

export const WalletSchema = new EntitySchema<Wallet>({
  class: Wallet,
  tableName: 'wallets',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    playerId: { type: 'varchar', length: 255, fieldName: 'player_id' },
    currency: { type: 'varchar', length: 3, default: 'BRL', fieldName: 'currency' },
    balance: { 
      type: MoneyType, 
      fieldName: 'balance',
    },
    version: { type: 'integer', default: 1, fieldName: 'version' },
    createdAt: { type: 'datetime', onCreate: () => new Date(), fieldName: 'created_at' },
    updatedAt: { type: 'datetime', onUpdate: () => new Date(), fieldName: 'updated_at' },
  },
  indexes: [
    { properties: ['playerId', 'currency'], options: { unique: true } },
  ],
});