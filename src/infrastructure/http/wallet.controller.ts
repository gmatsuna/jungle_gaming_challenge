import { Controller, Post, Get, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OpenWalletUseCase } from '../../application/use-cases/open-wallet.use-case';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletLedgerEntry } from '../../domain/entities/wallet-ledger-entry.entity';
import { ReconcileWalletUseCase } from '../../application/use-cases/reconcile-wallet.use-case';

@Controller('wallets')
export class WalletController {
  constructor(
    private readonly openWalletUseCase: OpenWalletUseCase,
    private readonly reconcileWalletUseCase: ReconcileWalletUseCase,
    private readonly em: EntityManager,
  ) {}

  @Post()
  async openWallet(
    @Body() body: { playerId: string; initialBalance: { amount: string; currency: string } },
  ) {
    return this.openWalletUseCase.execute(body);
  }

  @Get(':walletId')
  async getWallet(@Param('walletId') walletId: string) {
    const wallet = await this.em.findOne(Wallet, { id: walletId });
    if (!wallet) {
      throw new NotFoundException('WALLET_NOT_FOUND');
    }
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      currency: wallet.currency,
      balance: wallet.balance.toJSON(),
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  @Get(':walletId/ledger')
  async getLedger(
    @Param('walletId') walletId: string,
    @Query('limit') limitQuery?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = limitQuery ? parseInt(limitQuery, 10) : 50;
    
    // Construção da query com paginação por cursor baseada em data/id decrescente
    const qb = this.em.createQueryBuilder(WalletLedgerEntry, 'e')
      .where({ walletId })
      .orderBy({ createdAt: 'DESC', id: 'DESC' })
      .limit(limit + 1);

    if (cursor) {
      // O cursor pode ser um timestamp base64 ou string simples do createdAt/id
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const [createdAtStr, id] = decodedCursor.split('_');
      if (createdAtStr && id) {
        qb.andWhere('e.created_at <= ? and e.id < ?', [new Date(createdAtStr), id]);
      }
    }

    const entries = await qb.getResult();
    let nextCursor: string | null = null;

    if (entries.length > limit) {
      entries.pop(); // Remove o item extra usado para detectar se há próxima página
      const lastItem = entries[entries.length - 1];
      const rawCursor = `${lastItem.createdAt.toISOString()}_${lastItem.id}`;
      nextCursor = Buffer.from(rawCursor).toString('base64');
    }

    return {
      data: entries.map((entry) => ({
        id: entry.id,
        walletId: entry.walletId,
        transactionId: entry.transactionId,
        direction: entry.direction,
        money: entry.money.toJSON(),
        balanceBefore: entry.balanceBefore.toJSON(),
        balanceAfter: entry.balanceAfter.toJSON(),
        createdAt: entry.createdAt,
      })),
      meta: {
        limit,
        nextCursor,
      },
    };
  }

  @Post(':walletId/reconciliation')
  async reconcileWallet(@Param('walletId') walletId: string) {
    try {
      return await this.reconcileWalletUseCase.execute(walletId);
    } catch (error: any) {
      if (error.message === 'WALLET_NOT_FOUND') {
        throw new NotFoundException('WALLET_NOT_FOUND');
      }
      throw error;
    }
  }
}