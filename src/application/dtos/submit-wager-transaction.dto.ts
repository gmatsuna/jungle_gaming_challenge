import { WagerTransactionKind } from '../../domain/entities/wager-transaction.entity';
import { MoneyProps } from '../../domain/value-objects/money.vo';

/**
 * DTO de entrada para submissão de transações de apostas HTTP.
 */
export class SubmitWagerTransactionDto {
  // Identificadores do provedor e da transação externa
  providerId!: string;
  externalTransactionId!: string;

  // Chave opcional enviada pelo cliente para garantir idempotência na API
  idempotencyKey?: string;

  // Contexto de negócio (jogador, carteira, rodada e jogo)
  playerId!: string;
  walletId!: string;
  roundId!: string;
  gameId!: string;

  // Tipo de operação (BET, WIN, LOSS, REFUND, ROLLBACK)
  kind!: WagerTransactionKind;

  // Objeto de valor com a quantia e moeda da operação
  money!: MoneyProps;

  // Referência à transação original (necessário para REFUND e ROLLBACK)
  referenceExternalTransactionId?: string;
}