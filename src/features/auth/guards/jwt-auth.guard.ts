import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard to protect routes that require authentication
 * Extracts and validates the JWT token from request headers
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public with @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If route is marked as public, allow access
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authentication token',
      );
    }

    const token = authHeader.split(' ')[1];
    const refresh_token = request.headers['x-refresh-token'] || '';
    
    try {
      // Validate the token and get user data from Supabase
      const { data, error } = await this.authService.getUser(
        token,
        refresh_token,
      );

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Store the user in the request object for later use
      // Removed debug logging to avoid exposing sensitive user data in logs

      // Set the user object with necessary properties
      request.user = {
        id: data.user.id,
        email: data.user.email,
        // The token doesn't include role, we'll get it in the RolesGuard
      };

      return true;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
