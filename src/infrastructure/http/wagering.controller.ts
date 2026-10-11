import { Controller, Post, Get, Param, Body, Headers, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProcessWagerTransactionUseCase } from '../../application/use-cases/process-wager-transaction.use-case';
import { SubmitWagerTransactionDto } from '../../application/dtos/submit-wager-transaction.dto';
import { WagerTransaction } from '../../domain/entities/wager-transaction.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('wagering')
@UseGuards(JwtAuthGuard)
export class WageringController {
  constructor(
    private readonly processWagerTransactionUseCase: ProcessWagerTransactionUseCase,
    private readonly em: EntityManager,
  ) {}

  @Post('transactions')
  async submitTransaction(
    @Body() body: SubmitWagerTransactionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('REQUEST_BODY_MISSING_OR_INVALID_JSON');
    }
    if (idempotencyKey) {
      body.idempotencyKey = idempotencyKey;
    }
    return this.processWagerTransactionUseCase.execute(body);
  }

  @Get('transactions/:transactionId')
  async getTransactionById(@Param('transactionId') transactionId: string) {
    const tx = await this.em.findOne(WagerTransaction, { id: transactionId });
    if (!tx) {
      throw new NotFoundException('TRANSACTION_NOT_FOUND');
    }
    return this.formatTransactionResponse(tx);
  }

  @Get('/providers/:providerId/wagering/transactions/:externalTransactionId')
  async getTransactionByProviderId(
    @Param('providerId') providerId: string,
    @Param('externalTransactionId') externalTransactionId: string,
  ) {
    const tx = await this.em.findOne(WagerTransaction, { providerId, externalTransactionId });
    if (!tx) {
      throw new NotFoundException('TRANSACTION_NOT_FOUND');
    }
    return this.formatTransactionResponse(tx);
  }

  private formatTransactionResponse(tx: WagerTransaction) {
    return {
      id: tx.id,
      providerId: tx.providerId,
      externalTransactionId: tx.externalTransactionId,
      idempotencyKey: tx.idempotencyKey,
      walletId: tx.walletId,
      playerId: tx.playerId,
      roundId: tx.roundId,
      gameId: tx.gameId,
      kind: tx.kind,
      money: tx.money.toJSON(),
      status: tx.status,
      referenceExternalTransactionId: tx.referenceExternalTransactionId,
      referenceTransactionId: tx.referenceTransactionId,
      failureCode: tx.failureCode,
      createdAt: tx.createdAt,
      processedAt: tx.processedAt,
    };
  }
}