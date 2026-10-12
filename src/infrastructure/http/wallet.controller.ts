import { Controller, Post, Get, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OpenWalletUseCase } from '../../application/use-cases/open-wallet.use-case';
import { Wallet } from '../../domain/entities/wallet.entity';
import { WalletLedgerEntry } from '../../domain/entities/wallet-ledger-entry.entity';
import { ReconcileWalletUseCase } from '../../application/use-cases/reconcile-wallet.use-case';

/**
 * Controller responsável pelos endpoints de gerenciamento de carteiras, consulta de saldos,
 * paginação de extratos (ledger) via cursor e execução de rotinas de conciliação financeira.
 */
@Controller('wallets')
export class WalletController {
  constructor(
    private readonly openWalletUseCase: OpenWalletUseCase,
    private readonly reconcileWalletUseCase: ReconcileWalletUseCase,
    private readonly em: EntityManager,
  ) {}

  /**
   * Endpoint para abrir uma nova carteira associada a um jogador com saldo inicial.
   */
  @Post()
  async openWallet(
    @Body() body: { playerId: string; initialBalance: { amount: string; currency: string } },
  ) {
    return this.openWalletUseCase.execute(body);
  }

  /**
   * Consulta os detalhes e o saldo atual de uma carteira específica pelo seu ID.
   */
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

  /**
   * Consulta o extrato de lançamentos (ledger) da carteira utilizando paginação baseada em cursor.
   */
  @Get(':walletId/ledger')
  async getLedger(
    @Param('walletId') walletId: string,
    @Query('limit') limitQuery?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = limitQuery ? parseInt(limitQuery, 10) : 50;
    
    // Constrói a consulta buscando um item a mais que o limite para determinar a existência de próxima página
    const qb = this.em.createQueryBuilder(WalletLedgerEntry, 'e')
      .where({ walletId })
      .orderBy({ createdAt: 'DESC', id: 'DESC' })
      .limit(limit + 1);

    // Aplica o cursor decodificado em Base64 caso fornecido na requisição
    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const [createdAtStr, id] = decodedCursor.split('_');
      if (createdAtStr && id) {
        qb.andWhere('e.created_at <= ? and e.id < ?', [new Date(createdAtStr), id]);
      }
    }

    const entries = await qb.getResult();
    let nextCursor: string | null = null;

    // Se houver mais registros que o limite, remove o excedente e gera o próximo cursor
    if (entries.length > limit) {
      entries.pop();
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

  /**
   * Aciona o caso de uso de conciliação para validar a integridade dos saldos e transações da carteira.
   */
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