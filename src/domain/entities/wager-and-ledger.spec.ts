import { WagerTransaction, WagerTransactionKind, WagerTransactionStatus } from './wager-transaction.entity';
import { WalletLedgerEntry, LedgerDirection } from './wallet-ledger-entry.entity';
import { Money } from '../value-objects/money.vo';

describe('WagerTransaction & WalletLedgerEntry Entities', () => {
  // Testa a criação correta de uma transação de aposta com status inicial Pendente
  it('should create a pending WagerTransaction for BET', () => {
    const tx = WagerTransaction.create({
      id: 'tx-1',
      providerId: 'provider-a',
      externalTransactionId: 'ext-1',
      idempotencyKey: 'key-1',
      payloadHash: 'hash-1',
      walletId: 'w-1',
      playerId: 'p-1',
      roundId: 'r-1',
      gameId: 'g-1',
      kind: WagerTransactionKind.Bet,
      money: Money.from({ amount: '25.00', currency: 'BRL' }),
    });

    expect(tx.status).toBe(WagerTransactionStatus.Pending);
    expect(tx.affectsBalance()).toBe(true);
  });

  // Valida que operações de estorno (Refund) obrigatoriamente exigem o ID da transação de referência
  it('should require reference transaction for REFUND', () => {
    expect(() =>
      WagerTransaction.create({
        id: 'tx-2',
        providerId: 'provider-a',
        externalTransactionId: 'ext-2',
        idempotencyKey: 'key-2',
        payloadHash: 'hash-2',
        walletId: 'w-1',
        playerId: 'p-1',
        roundId: 'r-1',
        gameId: 'g-1',
        kind: WagerTransactionKind.Refund,
        money: Money.from({ amount: '25.00', currency: 'BRL' }),
      }),
    ).toThrow('REFERENCE_TRANSACTION_ID_REQUIRED');
  });

  // Testa a criação de uma entrada de ledger perfeitamente balanceada contendo saldos antes e depois válidos
  it('should create a valid balanced WalletLedgerEntry', () => {
    const entry = WalletLedgerEntry.create({
      id: 'l-1',
      walletId: 'w-1',
      transactionId: 'tx-1',
      direction: LedgerDirection.Debit,
      money: Money.from({ amount: '25.00', currency: 'BRL' }),
      balanceBefore: Money.from({ amount: '100.00', currency: 'BRL' }),
      balanceAfter: Money.from({ amount: '75.00', currency: 'BRL' }),
    });

    expect(entry.isBalanced()).toBe(true);
  });

  // Garante que o domínio rejeita lançamentos no ledger caso haja divergência matemática nos saldos
  it('should throw error if WalletLedgerEntry arithmetic is wrong', () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: 'l-2',
        walletId: 'w-1',
        transactionId: 'tx-1',
        direction: LedgerDirection.Debit,
        money: Money.from({ amount: '25.00', currency: 'BRL' }),
        balanceBefore: Money.from({ amount: '100.00', currency: 'BRL' }),
        balanceAfter: Money.from({ amount: '80.00', currency: 'BRL' }),
      }),
    ).toThrow('INVALID_LEDGER_ARITHMETIC');
  });
});