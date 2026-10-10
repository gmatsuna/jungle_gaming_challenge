import { Wallet } from './wallet.entity';
import { Money } from '../value-objects/money.vo';

describe('Wallet Entity', () => {
  it('should open a new wallet with initial balance and version 1', () => {
    const initialBalance = Money.from({ amount: '100.00', currency: 'BRL' });
    const wallet = Wallet.open({
      id: 'w-1',
      playerId: 'p-1',
      initialBalance,
    });

    expect(wallet.balance.amount).toBe('100.00');
    expect(wallet.version).toBe(1);
  });

  it('should credit and increment version', () => {
    const wallet = Wallet.open({
      id: 'w-1',
      playerId: 'p-1',
      initialBalance: Money.from({ amount: '100.00', currency: 'BRL' }),
    });

    wallet.credit(Money.from({ amount: '50.00', currency: 'BRL' }));

    expect(wallet.balance.amount).toBe('150.00');
    expect(wallet.version).toBe(2);
  });

  it('should debit and increment version', () => {
    const wallet = Wallet.open({
      id: 'w-1',
      playerId: 'p-1',
      initialBalance: Money.from({ amount: '100.00', currency: 'BRL' }),
    });

    wallet.debit(Money.from({ amount: '40.00', currency: 'BRL' }));

    expect(wallet.balance.amount).toBe('60.00');
    expect(wallet.version).toBe(2);
  });

  it('should throw error when debit exceeds balance', () => {
    const wallet = Wallet.open({
      id: 'w-1',
      playerId: 'p-1',
      initialBalance: Money.from({ amount: '50.00', currency: 'BRL' }),
    });

    expect(() => wallet.debit(Money.from({ amount: '100.00', currency: 'BRL' }))).toThrow('INSUFFICIENT_FUNDS');
  });
});