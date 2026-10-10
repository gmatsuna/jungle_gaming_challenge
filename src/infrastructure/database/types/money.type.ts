import { Type } from '@mikro-orm/core';
import { Money } from '../../../domain/value-objects/money.vo';

export class MoneyType extends Type<Money, { amount: string; currency: string }> {
  convertToJSValue(value: any): Money {
    if (!value) {
      return Money.zero('BRL');
    }
    return value instanceof Money ? value : Money.from(value);
  }

  convertToDatabaseValue(value: Money | { amount: string; currency: string }): any {
    if (!value) {
      return { amount: '0.00', currency: 'BRL' };
    }
    if (value instanceof Money) {
      return {
        amount: value.amount,
        currency: value.currency,
      };
    }
    return value;
  }

  getColumnType(): string {
    return 'jsonb';
  }
}