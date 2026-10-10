import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Wager } from './wager.entity';
import { SqsService } from '../sqs/sqs.service';

@Injectable()
export class WagerService {
  constructor(
    @InjectRepository(Wager)
    private readonly wagerRepository: EntityRepository<Wager>,
    private readonly em: EntityManager,
    private readonly sqsService: SqsService,
  ) {}

  async create(userId: string, amount: number): Promise<Wager> {
    const wager = this.wagerRepository.create({
      userId,
      amount,
      status: 'PENDING',
    });

    await this.em.flush();

    const messageId = await this.sqsService.sendMessage({
      event: 'WAGER_CREATED',
      wagerId: wager.id,
      userId: wager.userId,
      amount: wager.amount,
      createdAt: wager.createdAt,
    });

    console.log(`[SQS] Mensagem enviada para a fila! MessageId: ${messageId}`);

    return wager;
  }

  async findAll(): Promise<Wager[]> {
    return this.wagerRepository.findAll();
  }
}