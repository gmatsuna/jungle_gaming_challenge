import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'inbox_messages' })
export class InboxMessage {
  @PrimaryKey({ type: 'varchar', fieldName: 'message_id' })
  messageId!: string;

  @Property({ type: 'varchar', fieldName: 'consumer_name' })
  consumerName!: string;

  @Property({ type: 'varchar', fieldName: 'payload_hash' })
  payloadHash!: string;

  @Property({ type: 'timestamptz', fieldName: 'received_at' })
  receivedAt!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'processed_at' })
  processedAt?: Date;

  constructor(props: {
    messageId: string;
    consumerName: string;
    payloadHash: string;
    receivedAt: Date;
  }) {
    this.messageId = props.messageId;
    this.consumerName = props.consumerName;
    this.payloadHash = props.payloadHash;
    this.receivedAt = props.receivedAt;
  }

  isProcessed(): boolean {
    return !!this.processedAt;
  }

  markProcessed(at: Date): void {
    this.processedAt = at;
  }
}