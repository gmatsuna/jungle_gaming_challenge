import { EntitySchema } from '@mikro-orm/core';
import { InboxMessage } from '../../../domain/entities/inbox-message.entity';

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
    { name: 'idx_inbox_consumer_msg', properties: ['consumerName', 'messageId'], unique: true },
  ],
});