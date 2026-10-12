import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { InboxMessage } from '../../domain/entities/inbox-message.entity';
import * as crypto from 'crypto';

/**
 * Serviço responsável por implementar o padrão Transactional Inbox, garantindo
 * a entrega exatamente uma vez e idempotência no consumo de eventos.
 */
@Injectable()
export class InboxProcessorService {
  private readonly logger = new Logger(InboxProcessorService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Processa uma mensagem de forma transacional e idempotente, verificando se já foi tratada anteriormente.
   */
  async processMessage(
    eventId: string,
    consumerName: string,
    eventType: string,
    payload: Record<string, any>,
    handler: () => Promise<void>,
  ): Promise<boolean> {
    // Cria um fork isolado do Entity Manager para gerenciar a transação local
    const em = this.em.fork();

    // Gera o hash SHA-256 do payload para auditoria e verificação de integridade
    const payloadString = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    return await em.transactional(async (txEm) => {
      // Verifica se a mensagem já foi registrada para este consumidor específico
      const existing = await txEm.findOne(InboxMessage, { consumerName, messageId: eventId });

      // Se a mensagem já existe e já foi processada, aborta a execução para garantir idempotência
      if (existing && existing.isProcessed()) {
        this.logger.warn(`[Inbox] Mensagem ${eventId} (${eventType}) para o consumer ${consumerName} já foi processada anteriormente. Ignorando.`);
        return false;
      }

      this.logger.log(`[Inbox] Processando nova mensagem ${eventId} do tipo ${eventType} (consumer: ${consumerName})...`);

      // Executa a lógica de negócio associada à mensagem recebida
      await handler();

      // Registra ou atualiza o status da mensagem no inbox como processada
      if (existing) {
        existing.markProcessed(new Date());
        txEm.persist(existing);
      } else {
        const inboxMessage = new InboxMessage({
          messageId: eventId,
          consumerName,
          payloadHash,
          receivedAt: new Date(),
        });
        inboxMessage.markProcessed(new Date());
        txEm.persist(inboxMessage);
      }

      this.logger.log(`[Inbox] Mensagem ${eventId} registrada com sucesso na tabela inbox_messages.`);
      return true;
    });
  }
}