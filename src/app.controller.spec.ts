import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * Suíte de testes unitários para a classe AppController,
 * validando o funcionamento correto dos endpoints básicos da aplicação.
 */
describe('AppController', () => {
  let appController: AppController;

  // Configura o módulo de teste isolado do NestJS antes de cada execução de teste
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    // Valida se o método getHello retorna a mensagem padrão esperada
    it('should return "Jungle Gaming!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});