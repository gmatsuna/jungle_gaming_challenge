import Decimal from 'decimal.js';

export interface MoneyProps {
  amount: string;
  currency: string;
}

export class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {}

  public static from(props: MoneyProps | any): Money {
    if (!props) {
      return Money.zero('BRL');
    }

    const amount = typeof props.amount === 'number' ? props.amount.toFixed(2) : props.amount;
    const currency = props.currency || 'BRL';

    if (typeof currency !== 'string' || currency.trim() === '') {
      throw new Error('Currency must be a non-empty string');
    }

    if (typeof amount !== 'string') {
      throw new Error('Amount must be a decimal string');
    }

    const regex = /^\d+(\.\d{1,2})?$/;
    if (!regex.test(amount)) {
      throw new Error('Amount must be a valid positive decimal string with up to 2 decimal places');
    }

    const decimalValue = new Decimal(amount);
    return new Money(decimalValue, currency.toUpperCase());
  }

  public static zero(currency: string = 'BRL'): Money {
    return new Money(new Decimal('0.00'), currency.toUpperCase());
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value), this.currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value), this.currency);
  }

  public negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  public isZero(): boolean {
    return this.value.isZero();
  }

  public isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  public isNegative(): boolean {
    return this.value.isNegative();
  }

  public isLessThan(other: Money): MoneyProps | boolean {
    this.assertSameCurrency(other);
    return this.value.lessThan(other.value);
  }

  public equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  public toJSON(): MoneyProps {
    return {
      amount: this.value.toFixed(2),
      currency: this.currency,
    };
  }

  public toString(): string {
    return `${this.value.toFixed(2)} ${this.currency}`;
  }

  public get amount(): string {
    return this.value.toFixed(2);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} !== ${other.currency}`);
    }
  }
}