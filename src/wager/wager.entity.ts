import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Entidade de persistência (MikroORM) para Wager,
 * representando uma aposta simples no banco de dados relacional com suporte a UUIDs e colunas decimais.
 */
@Entity({ tableName: 'wagers' })
export class Wager {
  // Identificador único da aposta gerado automaticamente como UUID via banco de dados
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  // Identificador do usuário que realizou a aposta
  @Property()
  userId!: string;

  // Mont da aposta mapeado com alta precisão decimal
  @Property({ type: 'decimal' })
  amount!: number;

  // Status atual da aposta, com valor padrão 'PENDING'
  @Property()
  status: string = 'PENDING';

  // Data e hora de criação do registro geradas automaticamente no momento da inserção
  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}