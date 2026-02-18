import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { Request, Response } from 'express';

/**
 * Interface for error details
 */
interface ErrorDetails {
  code?: string;
  hint?: string;
  stack?: string;
  [key: string]: any;
}

/**
 * Custom exception filter for Supabase errors
 * Maps Supabase error codes to appropriate HTTP status codes and messages
 */
@Catch()
export class SupabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SupabaseExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Get the request path for logging
    const path = request.url;
    const method = request.method;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: ErrorDetails | null = null;

    // Handle Supabase PostgrestError specifically
    if (exception.code && exception.message && exception.details) {
      // This is likely a Supabase PostgrestError
      const pgError = exception as PostgrestError;
      this.logger.error(
        `Supabase error for ${method} ${path}: ${pgError.message} (${pgError.code})`,
        pgError.details,
      );

      // Map common Supabase error codes to HTTP status codes
      switch (pgError.code) {
        // Foreign key violation
        case '23503':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'Referenced resource does not exist';
          details = { code: pgError.code, hint: pgError.hint };
          break;

        // Not null violation
        case '23502':
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'Required fields are missing';
          details = { code: pgError.code, hint: pgError.hint };
          break;

        // Unique violation
        case '23505':
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          message = 'Resource already exists';
          details = { code: pgError.code, hint: pgError.hint };
          break;

        // Resource not found
        case 'PGRST116':
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'Resource not found';
          details = { code: pgError.code, hint: pgError.hint };
          break;

        // Permission denied
        case '42501':
          status = HttpStatus.FORBIDDEN;
          error = 'Forbidden';
          message = 'Permission denied to access this resource';
          details = { code: pgError.code, hint: pgError.hint };
          break;

        // Default handling for other Postgres errors
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          error = 'Database Error';
          message = pgError.message;
          details = { code: pgError.code, hint: pgError.hint };
          break;
      }
    } 
    // Handle NestJS exceptions
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as any;
      
      // HttpException can either have a string message or a structured response
      if (typeof errorResponse === 'object') {
        message = errorResponse.message || exception.message;
        error = errorResponse.error || 'Error';
        details = errorResponse.details || null;
      } else {
        message = exception.message;
        error = 'Error';
      }
      
      // Only log 5xx errors as they're server-side issues
      if (status >= 500) {
        this.logger.error(`Exception for ${method} ${path}: ${message}`, exception.stack);
      } else {
        this.logger.log(`Client error for ${method} ${path}: ${status} ${message}`);
      }
    } 
    // Handle all other errors
    else {
      this.logger.error(
        `Uncaught exception for ${method} ${path}: ${exception.message || 'Unknown error'}`,
        exception.stack,
      );
      
      message = exception.message || 'Internal server error';
      if (process.env.NODE_ENV === 'production') {
        // Hide technical details in production
        details = null;
      } else {
        // Include stack trace in development
        details = {
          stack: exception.stack,
        };
      }
    }

    // Return a standardized error response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path,
    });
  }
} 