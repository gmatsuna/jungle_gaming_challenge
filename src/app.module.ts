import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Wager } from './wager/wager.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        driver: PostgreSqlDriver,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        user: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgrespassword'),
        dbName: configService.get<string>('DB_NAME', 'jungle_gaming_challenge_db'),
        entities: [Wager],
        debug: true,
        ensureDatabase: true,
      }),
    }),
    MikroOrmModule.forFeature([Wager]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}