import { EntitySchema } from '@mikro-orm/core';
import { OutboxMessage } from '../../../domain/entities/outbox-message.entity';

export const OutboxMessageSchema = new EntitySchema<OutboxMessage>({
  class: OutboxMessage,
  tableName: 'outbox_messages',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    aggregateId: { type: 'varchar', length: 255, fieldName: 'aggregate_id' },
    eventType: { type: 'varchar', length: 255, fieldName: 'event_type' },
    payload: { type: 'jsonb' },
    occurredAt: { type: 'datetime', fieldName: 'occurred_at' },
    attempts: { type: 'integer', default: 0 },
    nextAttemptAt: { type: 'datetime', nullable: true, fieldName: 'next_attempt_at' },
    publishedAt: { type: 'datetime', nullable: true, fieldName: 'published_at' },
  },
  indexes: [
    { name: 'idx_outbox_pending', properties: ['publishedAt', 'nextAttemptAt'] },
  ],
});