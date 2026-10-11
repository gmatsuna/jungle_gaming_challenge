import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';
import { SqsService } from '../../sqs/sqs.service';

@Injectable()
export class OutboxRelayerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayerService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly em: EntityManager,
    private readonly sqsService: SqsService,
  ) {}

  onModuleInit() {
    // Roda a cada 5 segundos para processar o outbox
    const pollingIntervalMs = 60000;
    this.intervalId = setInterval(() => {
      this.processOutboxMessages();
    }, pollingIntervalMs);
    this.logger.log(`OutboxRelayerService iniciado com polling de ${pollingIntervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async processOutboxMessages() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    // Criamos um fork do EntityManager para gerenciar o ciclo de vida do background worker isoladamente
    const em = this.em.fork();

    try {
      const now = new Date();

      // Busca mensagens pendentes (publishedAt IS NULL) e que já passaram da hora da tentativa (nextAttemptAt)
      const messages = await em.find(
        OutboxMessage,
        {
          publishedAt: null,
          $or: [
            { nextAttemptAt: null },
            { nextAttemptAt: { $lte: now } },
          ],
        },
        {
          limit: 50,
          orderBy: { occurredAt: 'ASC' },
        },
      );

      if (messages.length === 0) {
        return;
      }

      for (const message of messages) {
        try {
          // Envia o evento para o SQS
          const messageId = await this.sqsService.sendMessage({
            eventId: message.id,
            aggregateId: message.aggregateId,
            eventType: message.eventType,
            payload: message.payload,
            occurredAt: message.occurredAt,
          });

          this.logger.log(`[Outbox] Mensagem ${message.id} (${message.eventType}) despachada com sucesso para o SQS. SQS MessageId: ${messageId}`);

          // Marca como publicada
          message.markPublished(new Date());
          await em.persistAndFlush(message);
        } catch (error: any) {
          this.logger.error(`[Outbox] Erro ao despachar mensagem ${message.id}: ${error.message}`, error.stack);
          
          // Agenda retry com backoff exponencial
          message.scheduleRetry(new Date());
          await em.persistAndFlush(message);
        }
      }
    } catch (error: any) {
      this.logger.error(`[OutboxRelayer] Erro no ciclo de processamento: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}