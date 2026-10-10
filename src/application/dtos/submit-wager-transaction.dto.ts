import { WagerTransactionKind } from '../../domain/entities/wager-transaction.entity';
import { MoneyProps } from '../../domain/value-objects/money.vo';

export class SubmitWagerTransactionDto {
  providerId!: string;
  externalTransactionId!: string;
  idempotencyKey?: string;
  playerId!: string;
  walletId!: string;
  roundId!: string;
  gameId!: string;
  kind!: WagerTransactionKind;
  money!: MoneyProps;
  referenceExternalTransactionId?: string;
}