import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Custom interceptor to handle file uploads properly with validation
 * This ensures file objects are properly passed to the service method
 */
@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  constructor(private fieldName: string) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Log what's coming in to help debug
    console.log('Request body before processing:', request.body);
    console.log('Request file:', request.file);
    
    // If file exists, make sure it's properly added to the DTO
    if (request.file) {
      if (!request.body) {
        request.body = {};
      }
      
      // Set file to the specified field
      request.body[this.fieldName] = request.file;
    }
    
    return next.handle();
  }
} 