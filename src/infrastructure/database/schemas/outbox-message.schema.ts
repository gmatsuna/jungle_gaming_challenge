import { EntitySchema } from '@mikro-orm/core';
import { OutboxMessage } from '../../../domain/entities/outbox-message.entity';

/**
 * Schema de mapeamento ORM (MikroORM) para a entidade OutboxMessage,
 * configurando a persistência de eventos de domínio com suporte a JSONB e índices de varredura para reenvio.
 */
export const OutboxMessageSchema = new EntitySchema<OutboxMessage>({
  class: OutboxMessage,
  tableName: 'outbox_messages',
  properties: {
    // Identificador único gerado automaticamente via função nativa do banco
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    aggregateId: { type: 'varchar', length: 255, fieldName: 'aggregate_id' },
    eventType: { type: 'varchar', length: 255, fieldName: 'event_type' },
    // Armazenamento em formato JSONB para consultas e serialização eficiente de metadados
    payload: { type: 'jsonb' },
    occurredAt: { type: 'datetime', fieldName: 'occurred_at' },
    attempts: { type: 'integer', default: 0 },
    nextAttemptAt: { type: 'datetime', nullable: true, fieldName: 'next_attempt_at' },
    publishedAt: { type: 'datetime', nullable: true, fieldName: 'published_at' },
  },
  indexes: [
    // Índice composto para otimizar a varredura contínua de eventos pendentes que aguardam publicação ou novas tentativas
    { name: 'idx_outbox_pending', properties: ['publishedAt', 'nextAttemptAt'] },
  ],
});