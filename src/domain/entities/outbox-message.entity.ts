import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Entidade que implementa o padrão Transactional Outbox para publicação
 * confiável de eventos de domínio em mensageria distribuída.
 */
@Entity({ tableName: 'outbox_messages' })
export class OutboxMessage {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  // ID do agregado de origem
  @Property({ type: 'varchar', fieldName: 'aggregate_id' })
  aggregateId!: string;

  // Tipo do evento gerado
  @Property({ type: 'varchar', fieldName: 'event_type' })
  eventType!: string;

  // Payload contendo os dados do evento serializados em JSON
  @Property({ type: 'json' })
  payload!: Record<string, unknown>;

  // Data e hora em que o evento ocorreu
  @Property({ type: 'timestamptz', fieldName: 'occurred_at' })
  occurredAt!: Date;

  // Contador de tentativas de publicação falhas
  @Property({ type: 'int', default: 0 })
  attempts: number = 0;

  // Momento agendado para a próxima tentativa de reenvio
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'next_attempt_at' })
  nextAttemptAt?: Date;

  // Data e hora em que a mensagem foi publicada com sucesso (nulo se pendente)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'published_at' })
  publishedAt?: Date;

  constructor(props: {
    id: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt: Date;
  }) {
    this.id = props.id;
    this.aggregateId = props.aggregateId;
    this.eventType = props.eventType;
    this.payload = props.payload;
    this.occurredAt = props.occurredAt;
  }

  /**
   * Verifica se o evento ainda está pendente de publicação.
   */
  isPending(): boolean {
    return !this.publishedAt;
  }

  /**
   * Marca o evento como publicado e limpa o agendamento de retry.
   */
  markPublished(at: Date): void {
    this.publishedAt = at;
    this.nextAttemptAt = undefined;
  }

  /**
   * Agenda uma nova tentativa de publicação utilizando backoff exponencial (máximo de 60 segundos).
   */
  scheduleRetry(now: Date): void {
    this.attempts += 1;
    const delayMs = Math.min(1000 * Math.pow(2, this.attempts), 60000);
    this.nextAttemptAt = new Date(now.getTime() + delayMs);
  }
}