import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * Trata o resultado da autenticação Passport, validando a presença do usuário
   * e assegurando o isolamento de escopo por provedor.
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido ou ausente.');
    }

    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Validação de segurança: Impede que um provedor autenticado envie requisições para o escopo de outro
    if (body && body.providerId && user.providerId && body.providerId !== user.providerId) {
      throw new UnauthorizedException('O providerId do token não corresponde ao provedor da requisição.');
    }

    return user;
  }
}