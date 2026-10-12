import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletSchema } from './infrastructure/database/schemas/wallet.schema';
import { WagerTransactionSchema } from './infrastructure/database/schemas/wager-transaction.schema';
import { WalletLedgerEntrySchema } from './infrastructure/database/schemas/wallet-ledger-entry.schema';
import { OutboxMessageSchema } from './infrastructure/database/schemas/outbox-message.schema';
import { InboxMessageSchema } from './infrastructure/database/schemas/inbox-message.schema';
import { OpenWalletUseCase } from './application/use-cases/open-wallet.use-case';
import { ProcessWagerTransactionUseCase } from './application/use-cases/process-wager-transaction.use-case';
import { ReconcileWalletUseCase } from './application/use-cases/reconcile-wallet.use-case';
import { WalletController } from './infrastructure/http/wallet.controller';
import { WageringController } from './infrastructure/http/wagering.controller';
import { OutboxRelayerService } from './infrastructure/messaging/outbox-relayer.service';
import { SqsModule } from './sqs/sqs.module';
import { InboxProcessorService } from './infrastructure/messaging/inbox-processor.service';
import { SqsConsumerWorker } from './infrastructure/messaging/sqs-consumer.worker';
import { AuthModule } from './auth/auth.module';

/**
 * Módulo raiz da aplicação NestJS, responsável por orquestrar a importação de configurações,
 * conexão com o banco de dados relacional (MikroORM), módulos de mensageria, segurança,
 * além de registrar controllers, casos de uso e serviços de infraestrutura.
 */
@Module({
  imports: [
    // Carrega e disponibiliza as variáveis de ambiente globalmente na aplicação
    ConfigModule.forRoot({ isGlobal: true }),
    SqsModule,
    AuthModule,
    // Configuração assíncrona do ORM utilizando as variáveis de ambiente para conexão com o PostgreSQL
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        driver: PostgreSqlDriver,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        user: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgrespassword'),
        dbName: configService.get<string>('DB_NAME', 'jungle_gaming_challenge_db'),
        entities: [WalletSchema, WagerTransactionSchema, WalletLedgerEntrySchema, OutboxMessageSchema, InboxMessageSchema],
        debug: true,
      }),
    }),
    // Registra os schemas de entidades para injeção de repositórios nos contextos da aplicação
    MikroOrmModule.forFeature([WalletSchema, WagerTransactionSchema, WalletLedgerEntrySchema, OutboxMessageSchema, InboxMessageSchema]),
  ],
  controllers: [AppController, WalletController, WageringController],
  providers: [
    AppService,
    OpenWalletUseCase,
    ProcessWagerTransactionUseCase,
    ReconcileWalletUseCase,
    OutboxRelayerService,
    InboxProcessorService,
    SqsConsumerWorker,
  ],
})
export class AppModule {}