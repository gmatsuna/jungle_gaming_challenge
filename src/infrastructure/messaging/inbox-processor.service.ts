import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { InboxMessage } from '../../domain/entities/inbox-message.entity';
import * as crypto from 'crypto';

@Injectable()
export class InboxProcessorService {
  private readonly logger = new Logger(InboxProcessorService.name);

  constructor(private readonly em: EntityManager) {}

  async processMessage(
    eventId: string,
    consumerName: string,
    eventType: string,
    payload: Record<string, any>,
    handler: () => Promise<void>,
  ): Promise<boolean> {
    const em = this.em.fork();

    const payloadString = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    return await em.transactional(async (txEm) => {
      const existing = await txEm.findOne(InboxMessage, { consumerName, messageId: eventId });

      if (existing && existing.isProcessed()) {
        this.logger.warn(`[Inbox] Mensagem ${eventId} (${eventType}) para o consumer ${consumerName} já foi processada anteriormente. Ignorando.`);
        return false;
      }

      this.logger.log(`[Inbox] Processando nova mensagem ${eventId} do tipo ${eventType} (consumer: ${consumerName})...`);

      await handler();

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
}1