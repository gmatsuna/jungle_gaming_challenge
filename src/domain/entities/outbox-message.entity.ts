import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'outbox_messages' })
export class OutboxMessage {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'varchar', fieldName: 'aggregate_id' })
  aggregateId!: string;

  @Property({ type: 'varchar', fieldName: 'event_type' })
  eventType!: string;

  @Property({ type: 'json' })
  payload!: Record<string, unknown>;

  @Property({ type: 'timestamptz', fieldName: 'occurred_at' })
  occurredAt!: Date;

  @Property({ type: 'int', default: 0 })
  attempts: number = 0;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'next_attempt_at' })
  nextAttemptAt?: Date;

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

  isPending(): boolean {
    return !this.publishedAt;
  }

  markPublished(at: Date): void {
    this.publishedAt = at;
    this.nextAttemptAt = undefined;
  }

  scheduleRetry(now: Date): void {
    this.attempts += 1;
    const delayMs = Math.min(1000 * Math.pow(2, this.attempts), 60000);
    this.nextAttemptAt = new Date(now.getTime() + delayMs);
  }
}