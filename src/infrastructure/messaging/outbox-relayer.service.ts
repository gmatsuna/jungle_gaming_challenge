import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';
import { SqsService } from '../../sqs/sqs.service';

/**
 * Serviço responsável por implementar o padrão Transactional Outbox (Relayer),
 * realizando o polling de eventos pendentes na base de dados e despachando-os para o SQS
 * de forma assídua, com suporte a retentativas em caso de falha.
 */
@Injectable()
export class OutboxRelayerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayerService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private readonly em: EntityManager,
    private readonly sqsService: SqsService,
  ) {}

  /**
   * Inicializa o timer de polling periódico assim que o módulo é carregado.
   */
  onModuleInit() {
    const pollingIntervalMs = 60000; // Intervalo de 60 segundos
    this.intervalId = setInterval(() => {
      this.processOutboxMessages();
    }, pollingIntervalMs);
    this.logger.log(`OutboxRelayerService iniciado com polling de ${pollingIntervalMs}ms`);
  }

  /**
   * Limpa o timer de polling quando o módulo é destruído (encerra o ciclo de vida da aplicação).
   */
  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  /**
   * Processa o lote de mensagens pendentes na tabela outbox, enviando-as para o broker de mensageria.
   */
  async processOutboxMessages() {
    // Evita execuções concorrentes caso o ciclo anterior ainda esteja em andamento
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    const em = this.em.fork();

    try {
      const now = new Date();

      // Busca mensagens não publicadas cujo momento de próxima tentativa seja nulo ou já expirado
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
          // Despacha o evento de domínio estruturado para o Amazon SQS
          const messageId = await this.sqsService.sendMessage({
            eventId: message.id,
            aggregateId: message.aggregateId,
            eventType: message.eventType,
            payload: message.payload,
            occurredAt: message.occurredAt,
          });

          this.logger.log(`[Outbox] Mensagem ${message.id} (${message.eventType}) despachada com sucesso para o SQS. SQS MessageId: ${messageId}`);

          // Marca o evento como publicado com sucesso e persiste a alteração
          message.markPublished(new Date());
          await em.persistAndFlush(message);
        } catch (error: any) {
          this.logger.error(`[Outbox] Erro ao despachar mensagem ${message.id}: ${error.message}`, error.stack);
          
          // Agenda uma nova tentativa de envio em caso de falha na mensageria
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