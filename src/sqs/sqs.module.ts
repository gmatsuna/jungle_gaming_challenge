import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';

/**
 * Módulo NestJS responsável por encapsular e prover os serviços de integração
 * com o Amazon SQS para publicação e gerenciamento de filas.
 */
@Module({
  providers: [SqsService],
  exports: [SqsService], // Exporta o SqsService para que outros módulos possam despachar eventos
})
export class SqsModule {}