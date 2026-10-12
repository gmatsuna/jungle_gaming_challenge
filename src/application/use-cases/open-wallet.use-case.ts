import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletLedgerEntry, LedgerDirection } from '../../domain/entities/wallet-ledger-entry.entity';
import { Money } from '../../domain/value-objects/money.vo';

@Injectable()
export class OpenWalletUseCase {
  constructor(private readonly em: EntityManager) {}

  async execute(props: { playerId: string; initialBalance: { amount: string; currency: string } }) {
    const initialMoney = Money.from(props.initialBalance);

    return this.em.transactional(async (em) => {
      const existing = await em.findOne(Wallet, {
        playerId: props.playerId,
        currency: initialMoney.currency,
      });

      if (existing) {
        throw new Error('WALLET_ALREADY_EXISTS');
      }

      const walletId = crypto.randomUUID();
      const wallet = Wallet.open({
        id: walletId,
        playerId: props.playerId,
        initialBalance: initialMoney,
      });

      em.persist(wallet);

      if (initialMoney.amount > '0') {
        const zeroBalance = Money.zero(initialMoney.currency);
        const ledgerEntry = WalletLedgerEntry.create({
          id: crypto.randomUUID(),
          walletId: wallet.id,
          transactionId: crypto.randomUUID(),
          direction: LedgerDirection.Credit,
          money: initialMoney,
          balanceBefore: zeroBalance,
          balanceAfter: initialMoney,
        });

        em.persist(ledgerEntry);
      }

      await em.flush();

      return {
        id: wallet.id,
        playerId: wallet.playerId,
        balance: wallet.balance.toJSON(),
        version: wallet.version,
      };
    });
  }
}