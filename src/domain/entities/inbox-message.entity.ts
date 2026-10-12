import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Entidade que implementa o padrão Transactional Inbox para processamento
 * seguro e idempotente de mensagens vindas de mensageria.
 */
@Entity({ tableName: 'inbox_messages' })
export class InboxMessage {
  // ID único da mensagem recebida
  @PrimaryKey({ type: 'varchar', fieldName: 'message_id' })
  messageId!: string;

  // Nome do microsserviço ou consumidor que processou a mensagem
  @Property({ type: 'varchar', fieldName: 'consumer_name' })
  consumerName!: string;

  // Hash do payload para detectar alterações ou conflitos de conteúdo
  @Property({ type: 'varchar', fieldName: 'payload_hash' })
  payloadHash!: string;

  // Data e hora de recebimento da mensagem
  @Property({ type: 'timestamptz', fieldName: 'received_at' })
  receivedAt!: Date;

  // Data e hora em que o processamento foi concluído (opcional)
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

  /**
   * Verifica se a mensagem já foi processada anteriormente.
   */
  isProcessed(): boolean {
    return !!this.processedAt;
  }

  /**
   * Marca a mensagem como processada informando o timestamp correspondente.
   */
  markProcessed(at: Date): void {
    this.processedAt = at;
  }
}