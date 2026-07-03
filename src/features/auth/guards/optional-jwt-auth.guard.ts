import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Guest — no token, let the request through as unauthenticated
      return true;
    }

    const token = authHeader.split(' ')[1];
    const refresh_token = request.headers['x-refresh-token'] || '';

    try {
      const { data, error } = await this.authService.getUser(token, refresh_token);
      if (!error && data?.user) {
        request.user = {
          id: data.user.id,
          email: data.user.email,
        };
      }
      // If token was invalid/expired, just proceed as guest instead of throwing
    } catch (error: any) {
        this.logger.error(`JWT validation error: ${error.message}`);
      }

    return true;
  }
}