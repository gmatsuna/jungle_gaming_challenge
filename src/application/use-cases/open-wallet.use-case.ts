import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Wallet } from '../../domain/entities/wallet.entity';
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

      const wallet = Wallet.open({
        id: crypto.randomUUID(),
        playerId: props.playerId,
        initialBalance: initialMoney,
      });

      await em.persistAndFlush(wallet);

      return {
        id: wallet.id,
        playerId: wallet.playerId,
        balance: wallet.balance.toJSON(),
        version: wallet.version,
      };
    });
  }
}