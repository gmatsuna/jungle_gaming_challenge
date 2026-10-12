import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

/**
 * Serviço responsável por gerenciar a comunicação com o Amazon SQS,
 * configurando o cliente AWS SDK e fornecendo métodos para o envio de mensagens para as filas.
 */
@Injectable()
export class SqsService implements OnModuleInit {
  private sqsClient!: SQSClient;
  private queueUrl!: string;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Inicializa o cliente SQS e define a URL da fila com base nas variáveis de ambiente ou padrões locais (LocalStack).
   */
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

    this.queueUrl = `${endpoint}/000000000000/wagering-queue`;
  }

  /**
   * Envia uma mensagem serializada em JSON para a fila SQS configurada e retorna o ID da mensagem despachada.
   */
  async sendMessage(body: any): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(body),
    });

    const response = await this.sqsClient.send(command);
    return response.MessageId!;
  }
}