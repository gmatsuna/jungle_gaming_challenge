import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'http://localhost:8080/realms/jungle-realm/protocol/openid-connect/certs',
      }),
      issuer: 'http://localhost:8080/realms/jungle-realm',
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      providerId: payload.preferred_username || payload.providerId || 'provider-01',
    };
  }

  // Sobrescreve o método de erro para imprimir no console o motivo exato da falha do token
  fail(info: any) {
    console.error('Falha na validação do JWT:', info);
    super.fail(info);
  }
}