import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido ou ausente.');
    }

    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Se a requisição contiver um provedor, validamos se o providerId do token bate com o payload
    if (body && body.providerId && user.providerId && body.providerId !== user.providerId) {
      throw new UnauthorizedException('O providerId do token não corresponde ao provedor da requisição.');
    }

    return user;
  }
}