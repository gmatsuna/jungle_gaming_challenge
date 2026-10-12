import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Controller raiz da aplicação responsável por responder às requisições na rota base,
 * delegando a lógica de negócio para o AppService.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint GET raiz que retorna uma saudação básica da aplicação.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}