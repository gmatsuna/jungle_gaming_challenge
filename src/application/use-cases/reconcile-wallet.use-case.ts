import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletLedgerEntry, LedgerDirection } from '../../domain/entities/wallet-ledger-entry.entity';
import { Money } from '../../domain/value-objects/money.vo';

export interface ReconciliationResult {
  walletId: string;
  storedBalance: { amount: string; currency: string };
  calculatedBalance: { amount: string; currency: string };
  difference: { amount: string; currency: string };
  consistent: boolean;
  checkedEntries: number;
}

@Injectable()
export class ReconcileWalletUseCase {
  constructor(private readonly em: EntityManager) {}

  async execute(walletId: string): Promise<ReconciliationResult> {
    const wallet = await this.em.findOne(Wallet, { id: walletId });
    if (!wallet) {
      throw new Error('WALLET_NOT_FOUND');
    }

    const entries = await this.em.find(WalletLedgerEntry, { walletId }, { orderBy: { createdAt: 'ASC' } });

    let calculatedMoney = Money.zero(wallet.currency);

    for (const entry of entries) {
      if (entry.direction === LedgerDirection.Credit) {
        calculatedMoney = calculatedMoney.add(entry.money);
      } else {
        calculatedMoney = calculatedMoney.subtract(entry.money);
      }
    }

    const storedBalance = wallet.balance;
    const difference = storedBalance.subtract(calculatedMoney);
    const consistent = storedBalance.equals(calculatedMoney);

    if (!consistent) {
      console.warn(`[RECONCILIATION_MISMATCH] Wallet ${walletId} has divergence! Stored: ${storedBalance.toString()}, Calculated: ${calculatedMoney.toString()}`);
    }

    return {
      walletId: wallet.id,
      storedBalance: storedBalance.toJSON(),
      calculatedBalance: calculatedMoney.toJSON(),
      difference: difference.toJSON(),
      consistent,
      checkedEntries: entries.length,
    };
  }
}