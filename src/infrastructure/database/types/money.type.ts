import { Type } from '@mikro-orm/core';
import { Money } from '../../../domain/value-objects/money.vo';

/**
 * Tipo customizado do MikroORM para realizar o mapeamento bidirecional
 * entre o Value Object de Domínio (Money) e a estrutura JSONB armazenada no banco.
 */
export class MoneyType extends Type<Money, { amount: string; currency: string }> {
  /**
   * Converte o dado bruto recuperado do banco de dados para a instância do Value Object Money.
   */
  convertToJSValue(value: any): Money {
    if (!value) {
      return Money.zero('BRL');
    }
    return value instanceof Money ? value : Money.from(value);
  }

  /**
   * Converte a instância de Money ou objeto estruturado para o formato JSON persistido no banco de dados.
   */
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

  /**
   * Define a coluna do banco como jsonb para armazenar montante e moeda com alta performance.
   */
  getColumnType(): string {
    return 'jsonb';
  }
}