import { Injectable } from '@nestjs/common';

/**
 * Serviço responsável por fornecer a lógica de negócio básica para o AppController.
 */
@Injectable()
export class AppService {
  /**
   * Retorna a string de saudação padrão da aplicação.
   */
  getHello(): string {
    return 'Jungle Gaming!';
  }
}