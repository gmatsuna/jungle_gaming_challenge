import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ProcessWagerTransactionUseCase } from '../../application/use-cases/process-wager-transaction.use-case';
import { SubmitWagerTransactionDto } from '../../application/dtos/submit-wager-transaction.dto';

@Controller('wagering')
export class WageringController {
  constructor(private readonly processWagerTransactionUseCase: ProcessWagerTransactionUseCase) {}

  @Post('transactions')
  async submitTransaction(
    @Body() body: SubmitWagerTransactionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      body.idempotencyKey = idempotencyKey;
    }
    return this.processWagerTransactionUseCase.execute(body);
  }
}