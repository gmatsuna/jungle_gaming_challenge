import { Money } from '../value-objects/money.vo';

export interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  public readonly id!: string;
  public readonly playerId!: string;
  public readonly currency!: string;
  public balance!: Money;
  private _version!: number;
  public readonly createdAt!: Date;
  private _updatedAt!: Date;

  private constructor(
    id?: string,
    playerId?: string,
    currency?: string,
    balance?: Money | { amount: string | number; currency: string },
    version?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    if (id) (this as any).id = id;
    if (playerId) (this as any).playerId = playerId;
    if (currency) (this as any).currency = currency;
    if (version) this._version = version;
    if (createdAt) (this as any).createdAt = createdAt;
    if (updatedAt) this._updatedAt = updatedAt;
    
    if (balance) {
      this.balance = balance instanceof Money ? balance : Money.from(balance as any);
    } else {
      this.balance = Money.zero(currency || 'BRL');
    }
  }

  public static open(props: { id: string; playerId: string; initialBalance: Money }): Wallet {
    const now = new Date();
    return new Wallet(
      props.id,
      props.playerId,
      props.initialBalance.currency,
      props.initialBalance,
      1,
      now,
      now,
    );
  }

  public static rehydrate(state: WalletState): Wallet {
    return new Wallet(
      state.id,
      state.playerId,
      state.currency,
      state.balance,
      state.version,
      state.createdAt,
      state.updatedAt,
    );
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  public credit(amount: Money): void {
    this.assertSameCurrency(amount);
    this.balance = this.balance.add(amount);
    this._version += 1;
    this._updatedAt = new Date();
  }

  public debit(amount: Money): void {
    this.assertSameCurrency(amount);
    
    if (this.balance.isLessThan(amount)) {
      throw new Error('INSUFFICIENT_FUNDS');
    }
    this.balance = this.balance.subtract(amount);
    this._version += 1;
    this._updatedAt = new Date();
  }

  private assertSameCurrency(money: Money): void {
    if (this.currency !== money.currency) {
      throw new Error(`Currency mismatch: Wallet currency is ${this.currency}, but operation is ${money.currency}`);
    }
  }
}