import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MikroORM } from '@mikro-orm/core';

/**
 * Função de inicialização e boot da aplicação NestJS.
 */
async function bootstrap() {
  // Cria a instância principal da aplicação baseada no AppModule
  const app = await NestFactory.create(AppModule);
  
  // Obtém a instância do MikroORM para gerenciar a sincronização do banco de dados
  const orm = app.get(MikroORM);
  // Atualiza/gera automaticamente o schema do banco de dados com base nas entidades mapeadas
  await orm.getSchemaGenerator().updateSchema();

  // Inicializa o servidor HTTP na porta definida nas variáveis de ambiente ou padrão 3000
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();