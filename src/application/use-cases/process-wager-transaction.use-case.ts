import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { createHash } from 'crypto';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WagerTransaction, WagerTransactionKind, WagerTransactionStatus } from '../../domain/entities/wager-transaction.entity';
import { WalletLedgerEntry, LedgerDirection } from '../../domain/entities/wallet-ledger-entry.entity';
import { OutboxMessage } from '../../domain/entities/outbox-message.entity';
import { Money } from '../../domain/value-objects/money.vo';
import type { SubmitWagerTransactionDto } from '../dtos/submit-wager-transaction.dto';

export interface ProcessTransactionResult {
  transactionId: string;
  status: WagerTransactionStatus;
  balance: { amount: string; currency: string };
  idempotentReplay: boolean;
}

@Injectable()
export class ProcessWagerTransactionUseCase {
  constructor(private readonly em: EntityManager) {}

  async execute(dto: SubmitWagerTransactionDto): Promise<ProcessTransactionResult> {
    const idempotencyKey = dto.idempotencyKey || `${dto.providerId}:${dto.externalTransactionId}`;
    const payloadHash = this.generateCanonicalHash(dto);
    const money = Money.from(dto.money);

    return this.em.transactional(async (em) => {
      const existingTx = await em.findOne(WagerTransaction, { idempotencyKey });
      if (existingTx) {
        if (!existingTx.matchesPayload(payloadHash)) {
          throw new Error('IDEMPOTENCY_CONFLICT');
        }
        const wallet = await em.findOneOrFail(Wallet, { id: existingTx.walletId });
        return {
          transactionId: existingTx.id,
          status: existingTx.status,
          balance: wallet.balance.toJSON(),
          idempotentReplay: true,
        };
      }

      const tx = WagerTransaction.create({
        id: crypto.randomUUID(),
        providerId: dto.providerId,
        externalTransactionId: dto.externalTransactionId,
        idempotencyKey,
        payloadHash,
        walletId: dto.walletId,
        playerId: dto.playerId,
        roundId: dto.roundId,
        gameId: dto.gameId,
        kind: dto.kind,
        money,
        referenceExternalTransactionId: dto.referenceExternalTransactionId,
      });

      const wallet = await em.findOne(Wallet, { id: dto.walletId });
      if (!wallet) {
        tx.reject('WALLET_NOT_FOUND');
        await em.persistAndFlush(tx);
        throw new Error('WALLET_NOT_FOUND');
      }

      const balanceBefore = wallet.balance;

      try {
        let referenceTx: WagerTransaction | null = null;
        if (tx.requiresReference() && dto.referenceExternalTransactionId) {
          referenceTx = await em.findOne(WagerTransaction, {
            providerId: dto.providerId,
            externalTransactionId: dto.referenceExternalTransactionId,
          });

          if (!referenceTx || referenceTx.status !== WagerTransactionStatus.Processed) {
            tx.markPendingReference();
            await em.persistAndFlush(tx);
            return {
              transactionId: tx.id,
              status: tx.status,
              balance: wallet.balance.toJSON(),
              idempotentReplay: false,
            };
          }
        }

        const createOutboxEvent = (eventType: string) => {
          return new OutboxMessage({
            id: crypto.randomUUID(),
            aggregateId: tx.id,
            eventType,
            payload: {
              transactionId: tx.id,
              providerId: tx.providerId,
              externalTransactionId: tx.externalTransactionId,
              walletId: tx.walletId,
              playerId: tx.playerId,
              roundId: tx.roundId,
              gameId: tx.gameId,
              kind: tx.kind,
              money: money.toJSON(),
              status: WagerTransactionStatus.Processed,
              occurredAt: new Date(),
            },
            occurredAt: new Date(),
          });
        };

        if (dto.kind === WagerTransactionKind.Bet) {
          wallet.debit(money);
          const balanceAfter = wallet.balance;

          const ledger = WalletLedgerEntry.create({
            id: crypto.randomUUID(),
            walletId: wallet.id,
            transactionId: tx.id,
            direction: LedgerDirection.Debit,
            money,
            balanceBefore,
            balanceAfter,
          });

          tx.markProcessed();
          const outbox = createOutboxEvent('WagerBetProcessed');
          await em.persistAndFlush([tx, wallet, ledger, outbox]);
        } else if (dto.kind === WagerTransactionKind.Win) {
          wallet.credit(money);
          const balanceAfter = wallet.balance;

          const ledger = WalletLedgerEntry.create({
            id: crypto.randomUUID(),
            walletId: wallet.id,
            transactionId: tx.id,
            direction: LedgerDirection.Credit,
            money,
            balanceBefore,
            balanceAfter,
          });

          tx.markProcessed(referenceTx?.id);
          const outbox = createOutboxEvent('WagerWinProcessed');
          await em.persistAndFlush([tx, wallet, ledger, outbox]);
        } else if (dto.kind === WagerTransactionKind.Loss) {
          tx.markProcessed();
          const outbox = createOutboxEvent('WagerLossProcessed');
          await em.persistAndFlush([tx, outbox]);
        } else if (dto.kind === WagerTransactionKind.Refund) {
          wallet.credit(money);
          const balanceAfter = wallet.balance;

          const ledger = WalletLedgerEntry.create({
            id: crypto.randomUUID(),
            walletId: wallet.id,
            transactionId: tx.id,
            direction: LedgerDirection.Credit,
            money,
            balanceBefore,
            balanceAfter,
          });

          tx.markProcessed(referenceTx?.id);
          const outbox = createOutboxEvent('WagerRefundProcessed');
          await em.persistAndFlush([tx, wallet, ledger, outbox]);
        } else if (dto.kind === WagerTransactionKind.Rollback) {
          let direction: LedgerDirection;

          if (referenceTx?.kind === WagerTransactionKind.Bet) {
            wallet.credit(money);
            direction = LedgerDirection.Credit;
          } else {
            wallet.debit(money);
            direction = LedgerDirection.Debit;
          }

          const balanceAfter = wallet.balance;

          const ledger = WalletLedgerEntry.create({
            id: crypto.randomUUID(),
            walletId: wallet.id,
            transactionId: tx.id,
            direction,
            money,
            balanceBefore,
            balanceAfter,
          });

          tx.markProcessed(referenceTx?.id);
          const outbox = createOutboxEvent('WagerRollbackProcessed');
          await em.persistAndFlush([tx, wallet, ledger, outbox]);
        } else {
          throw new Error(`KIND_${dto.kind}_NOT_SUPPORTED_YET`);
        }

        return {
          transactionId: tx.id,
          status: tx.status,
          balance: wallet.balance.toJSON(),
          idempotentReplay: false,
        };
      } catch (error: any) {
        if (error.message === 'INSUFFICIENT_FUNDS') {
          tx.reject('INSUFFICIENT_FUNDS');
          await em.persistAndFlush(tx);
          throw new Error('INSUFFICIENT_FUNDS');
        }
        throw error;
      }
    });
  }

  private generateCanonicalHash(dto: SubmitWagerTransactionDto): string {
    const canonicalObj = {
      externalTransactionId: dto.externalTransactionId,
      gameId: dto.gameId,
      kind: dto.kind,
      money: { amount: dto.money.amount, currency: dto.money.currency },
      playerId: dto.playerId,
      providerId: dto.providerId,
      roundId: dto.roundId,
      walletId: dto.walletId,
    };
    return createHash('sha256').update(JSON.stringify(canonicalObj)).digest('hex');
  }
}