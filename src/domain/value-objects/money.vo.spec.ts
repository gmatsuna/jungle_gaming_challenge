import { Money } from './money.vo';

describe('Money Value Object', () => {
  // Testa a criação correta de uma instância de Money a partir de uma string decimal válida
  it('should create a valid Money instance from decimal string', () => {
    const money = Money.from({ amount: '25.50', currency: 'BRL' });
    expect(money.amount).toBe('25.50');
    expect(money.currency).toBe('BRL');
  });

  // Garante que o sistema rejeita valores que não sejam passados em formato de string
  it('should reject non-string amounts', () => {
    expect(() => Money.from({ amount: 25.5 as any, currency: 'BRL' })).toThrow(
      'Amount must be a decimal string',
    );
  });

  // Valida que formatos decimais inválidos, números negativos, mais de 2 casas decimais ou textos são rejeitados
  it('should reject invalid decimal formats or more than 2 decimal places', () => {
    expect(() => Money.from({ amount: '25.501', currency: 'BRL' })).toThrow();
    expect(() => Money.from({ amount: '-25.50', currency: 'BRL' })).toThrow();
    expect(() => Money.from({ amount: 'abc', currency: 'BRL' })).toThrow();
  });

  // Assegura que operações de adição e subtração mantêm a imutabilidade do objeto original gerando novos resultados corretos
  it('should correctly perform immutable addition and subtraction', () => {
    const m1 = Money.from({ amount: '100.00', currency: 'BRL' });
    const m2 = Money.from({ amount: '25.50', currency: 'BRL' });

    const sum = m1.add(m2);
    const diff = m1.subtract(m2);

    expect(sum.amount).toBe('125.50');
    expect(diff.amount).toBe('74.50');
    expect(m1.amount).toBe('100.00'); // Garante imutabilidade
  });

  // Valida que o objeto de valor impede operações aritméticas entre moedas distintas
  it('should throw an error when operating on different currencies', () => {
    const brl = Money.from({ amount: '100.00', currency: 'BRL' });
    const usd = Money.from({ amount: '100.00', currency: 'USD' });

    expect(() => brl.add(usd)).toThrow('Currency mismatch: BRL !== USD');
  });
});