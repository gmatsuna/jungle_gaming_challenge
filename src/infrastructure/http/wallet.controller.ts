import { Controller, Post, Body } from '@nestjs/common';
import { OpenWalletUseCase } from '../../application/use-cases/open-wallet.use-case';

@Controller('wallets')
export class WalletController {
  constructor(private readonly openWalletUseCase: OpenWalletUseCase) {}

  @Post()
  async openWallet(
    @Body() body: { playerId: string; initialBalance: { amount: string; currency: string } },
  ) {
    return this.openWalletUseCase.execute(body);
  }
}