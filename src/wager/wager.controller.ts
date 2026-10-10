import { Controller, Post, Get, Body } from '@nestjs/common';
import { WagerService } from './wager.service';
import { Wager } from './wager.entity';

@Controller('wagers')
export class WagerController {
  constructor(private readonly wagerService: WagerService) {}

  @Post()
  async create(
    @Body() body: { userId: string; amount: number },
  ): Promise<Wager> {
    return this.wagerService.create(body.userId, body.amount);
  }

  @Get()
  async findAll(): Promise<Wager[]> {
    return this.wagerService.findAll();
  }
}