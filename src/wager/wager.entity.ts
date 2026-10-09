import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'wagers' })
export class Wager {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  userId!: string;

  @Property({ type: 'decimal' })
  amount!: number;

  @Property()
  status: string = 'PENDING';

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}