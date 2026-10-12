import { EntitySchema } from '@mikro-orm/core';
import { InboxMessage } from '../../../domain/entities/inbox-message.entity';

/**
 * Schema de mapeamento ORM (MikroORM) para a entidade InboxMessage,
 * definindo tipos de colunas, chaves primárias, nomes de campos e índices exclusivos.
 */
export const InboxMessageSchema = new EntitySchema<InboxMessage>({
  class: InboxMessage,
  tableName: 'inbox_messages',
  properties: {
    messageId: { type: 'varchar', length: 255, primary: true, fieldName: 'message_id' },
    consumerName: { type: 'varchar', length: 255, fieldName: 'consumer_name' },
    payloadHash: { type: 'varchar', length: 255, fieldName: 'payload_hash' },
    receivedAt: { type: 'datetime', fieldName: 'received_at' },
    processedAt: { type: 'datetime', nullable: true, fieldName: 'processed_at' },
  },
  indexes: [
    // Índice exclusivo composto para garantir que um mesmo consumidor não processe a mesma mensagem duplicada
    { name: 'idx_inbox_consumer_msg', properties: ['consumerName', 'messageId'], options: { unique: true } },
  ],
});