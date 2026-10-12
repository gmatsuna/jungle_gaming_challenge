import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { InboxProcessorService } from './inbox-processor.service';

@Injectable()
export class SqsConsumerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerWorker.name);
  private sqsClient: SQSClient;
  private queueUrl: string;
  private isRunning = false;
  private pollTimeout: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly inboxProcessor: InboxProcessorService,
  ) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('AWS_ENDPOINT', 'http://localhost:4566');
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    const queueName = this.configService.get<string>('SQS_QUEUE_NAME', 'wager-transactions.fifo');
    this.queueUrl = `${endpoint}/000000000000/${queueName}`;

    this.isRunning = true;
    this.pollMessages();
    this.logger.log(`[SqsConsumerWorker] Worker iniciado para a fila: ${queueName}`);
  }

  onModuleDestroy() {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    this.logger.log('[SqsConsumerWorker] Worker finalizado.');
  }

  private async pollMessages() {
    if (!this.isRunning) return;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 5,
        AttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          await this.handleMessage(message);
        }
      }
    } catch (error) {
      this.logger.error('[SqsConsumerWorker] Erro ao pesquisar mensagens no SQS:', error);
    } finally {
      if (this.isRunning) {
        this.pollTimeout = setTimeout(() => this.pollMessages(), 1000);
      }
    }
  }

  private async handleMessage(message: any) {
    const messageId = message.MessageId;
    const receiptHandle = message.ReceiptHandle;
    const consumerName = 'wager-transactions-consumer';

    try {
      this.logger.log(`[SqsConsumerWorker] Mensagem recebida do SQS. MessageId: ${messageId}`);
      
      const body = JSON.parse(message.Body || '{}');
      const eventType = body.eventType || 'UnknownEvent';
      const eventId = body.eventId || messageId;
      const payload = body.payload || body;

      const processed = await this.inboxProcessor.processMessage(
        eventId,
        consumerName,
        eventType,
        payload,
        async () => {
          this.logger.log(`[SqsConsumerWorker] Executando handler de negócio para o evento ${eventType} (${eventId})`);
        },
      );

      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );

      if (processed) {
        this.logger.log(`[SqsConsumerWorker] Mensagem ${messageId} processada e removida da fila com sucesso.`);
      } else {
        this.logger.warn(`[SqsConsumerWorker] Mensagem ${messageId} já havia sido processada anteriormente (idempotência garantida). Removida da fila.`);
      }
    } catch (error) {
      this.logger.error(`[SqsConsumerWorker] Erro ao processar mensagem ${messageId}:`, error);
    }
  }
}