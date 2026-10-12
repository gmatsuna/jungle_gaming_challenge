import Decimal from 'decimal.js';

export interface MoneyProps {
  amount: string;
  currency: string;
}

/**
 * Objeto de valor imutável que encapsula a representação de valores monetários,
 * utilizando aritmética de precisão arbitrária (decimal.js) para evitar erros de ponto flutuante.
 */
export class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {}

  /**
   * Fábrica para instanciar e validar a conformidade de dados monetários (strings decimais com 2 casas).
   */
  public static from(props: MoneyProps | any): Money {
    if (!props) {
      return Money.zero('BRL');
    }

    const amount = typeof props.amount === 'number' ? props.amount.toFixed(2) : props.amount;
    const currency = props.currency || 'BRL';

    if (typeof currency !== 'string' || currency.trim() === '') {
      throw new Error('Currency must be a non-empty string');
    }

    if (typeof props.amount !== 'string') {
      throw new Error('Amount must be a decimal string');
    }

    // Expressão regular para garantir formato decimal positivo estrito com 2 casas decimais
    const regex = /^\d+(\.\d{1,2})?$/;
    if (!regex.test(amount)) {
      throw new Error('Amount must be a valid positive decimal string with up to 2 decimal places');
    }

    const decimalValue = new Decimal(amount);
    return new Money(decimalValue, currency.toUpperCase());
  }

  /**
   * Cria uma instância de valor monetário zerado para uma determinada moeda.
   */
  public static zero(currency: string = 'BRL'): Money {
    return new Money(new Decimal('0.00'), currency.toUpperCase());
  }

  /**
   * Realiza adição imutável entre valores da mesma moeda.
   */
  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value), this.currency);
  }

  /**
   * Realiza subtração imutável entre valores da mesma moeda.
   */
  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value), this.currency);
  }

  /**
   * Retorna uma nova instância com o valor negado.
   */
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

  /**
   * Compara se o valor atual é menor que outro da mesma moeda.
   */
  public isLessThan(other: Money): MoneyProps | boolean {
    this.assertSameCurrency(other);
    return this.value.lessThan(other.value);
  }

  /**
   * Compara igualdade de montante e moeda.
   */
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

  get amount(): string {
    return this.value.toFixed(2);
  }

  /**
   * Garante que operações aritméticas ou comparações sejam feitas estritamente entre a mesma moeda.
   */
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} !== ${other.currency}`);
    }
  }
}