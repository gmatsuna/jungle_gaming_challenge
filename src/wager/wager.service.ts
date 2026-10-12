import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { Wager } from './wager.entity';
import { SqsService } from '../sqs/sqs.service';

/**
 * Serviço responsável por gerenciar a lógica de negócio das apostas,
 * lidando com a persistência via MikroORM e o despacho de eventos para o SQS.
 */
@Injectable()
export class WagerService {
  constructor(
    @InjectRepository(Wager)
    private readonly wagerRepository: EntityRepository<Wager>,
    private readonly em: EntityManager,
    private readonly sqsService: SqsService,
  ) {}

  /**
   * Cria uma nova aposta no banco de dados com status pendente e despacha um evento WAGER_CREATED para o SQS.
   */
  async create(userId: string, amount: number): Promise<Wager> {
    const wager = this.wagerRepository.create({
      userId,
      amount,
      status: 'PENDING',
    });

    // Persiste as alterações no banco de dados
    await this.em.flush();

    // Despacha o evento de criação de aposta para a mensageria
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

  /**
   * Retorna todas as apostas cadastradas no sistema.
   */
  async findAll(): Promise<Wager[]> {
    return this.wagerRepository.findAll();
  }
}