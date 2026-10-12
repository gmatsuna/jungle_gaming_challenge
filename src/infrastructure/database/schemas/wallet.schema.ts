import { EntitySchema } from '@mikro-orm/core';
import { Wallet } from '../../../domain/entities/wallet.entity';
import { MoneyType } from '../types/money.type';

/**
 * Schema de mapeamento ORM (MikroORM) para a entidade Wallet,
 * configurando a persistência das carteiras de jogadores, tipos monetários e restrição de unicidade por jogador/moeda.
 */
export const WalletSchema = new EntitySchema<Wallet>({
  class: Wallet,
  tableName: 'wallets',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    playerId: { type: 'varchar', length: 255, fieldName: 'player_id' },
    currency: { type: 'varchar', length: 3, default: 'BRL', fieldName: 'currency' },
    // Mapeamento persistido utilizando o tipo customizado MoneyType para precisão financeira
    balance: { 
      type: MoneyType, 
      fieldName: 'balance',
    },
    // Versão da carteira utilizada para controle de concorrência otimista (Optimistic Locking)
    version: { type: 'integer', default: 1, fieldName: 'version' },
    createdAt: { type: 'datetime', onCreate: () => new Date(), fieldName: 'created_at' },
    updatedAt: { type: 'datetime', onUpdate: () => new Date(), fieldName: 'updated_at' },
  },
  indexes: [
    // Índice exclusivo composto garantindo que um jogador possua apenas uma carteira por tipo de moeda
    { properties: ['playerId', 'currency'], options: { unique: true } },
  ],
});