import { Controller, Post, Get, Body } from '@nestjs/common';
import { WagerService } from './wager.service';
import { Wager } from './wager.entity';

/**
 * Controller responsável pelos endpoints de gerenciamento de apostas (Wagers),
 * expondo rotas para criação e listagem geral de registros.
 */
@Controller('wagers')
export class WagerController {
  constructor(private readonly wagerService: WagerService) {}

  /**
   * Endpoint para criar uma nova aposta com base no ID do usuário e montante fornecidos no corpo da requisição.
   */
  @Post()
  async create(
    @Body() body: { userId: string; amount: number },
  ): Promise<Wager> {
    return this.wagerService.create(body.userId, body.amount);
  }

  /**
   * Endpoint para listar todas as apostas cadastradas no sistema.
   */
  @Get()
  async findAll(): Promise<Wager[]> {
    return this.wagerService.findAll();
  }
}