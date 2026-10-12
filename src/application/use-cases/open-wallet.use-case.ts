import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletLedgerEntry, LedgerDirection } from '../../domain/entities/wallet-ledger-entry.entity';
import { Money } from '../../domain/value-objects/money.vo';

@Injectable()
export class OpenWalletUseCase {
  constructor(private readonly em: EntityManager) {}

  /**
   * Executa a abertura de uma nova carteira para o jogador de forma atômica.
   */
  async execute(props: { playerId: string; initialBalance: { amount: string; currency: string } }) {
    const initialMoney = Money.from(props.initialBalance);

    // Garante atomicidade em toda a operação de abertura e registro de ledger inicial
    return this.em.transactional(async (em) => {
      // Verifica se já existe uma carteira ativa para o jogador na mesma moeda
      const existing = await em.findOne(Wallet, {
        playerId: props.playerId,
        currency: initialMoney.currency,
      });

      if (existing) {
        throw new Error('WALLET_ALREADY_EXISTS');
      }

      // Cria a nova entidade de carteira via domínio
      const walletId = crypto.randomUUID();
      const wallet = Wallet.open({
        id: walletId,
        playerId: props.playerId,
        initialBalance: initialMoney,
      });

      em.persist(wallet);

      // Se houver saldo inicial maior que zero, gera o crédito correspondente no ledger imutável
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

      // Efetua a persistência no banco de dados
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