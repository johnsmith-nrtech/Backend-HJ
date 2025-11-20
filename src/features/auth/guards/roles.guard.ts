import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the roles required for this route
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the user from the request (set by the JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const { user } = request;
    
    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }
    
    // Get the user's role from the custom users table in the database
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error || !data) {
      throw new ForbiddenException('Failed to verify user role');
    }
    
    // Attach role to request.user so downstream handlers can use it
    request.user = { ...user, role: data.role };

    // Check if the user has the required role
    const hasRole = requiredRoles.some(role => data.role === role);
      
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${data.role}`
      );
    }
    
    return true;
  }
} 