import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // Configura o Passport para utilizar 'jwt' como estratégia padrão de autenticação
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Configura o módulo JWT com segredo de ambiente (ou fallback seguro para desenvolvimento) e tempo de expiração
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key-for-development',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}