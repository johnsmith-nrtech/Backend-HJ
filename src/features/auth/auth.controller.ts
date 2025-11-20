import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Headers,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto, SigninDto, EmailDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { MailService } from '../mail/mail.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  @ApiCreatedResponse({
    description: 'User has been successfully registered',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
        },
        error: {
          type: 'object',
          nullable: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input - email format is incorrect or password is too weak',
  })
  @ApiConflictResponse({
    description: 'Email is already registered',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user with email and password' })
  @ApiBody({ type: SigninDto })
  @ApiOkResponse({
    description: 'Successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
        },
        error: {
          type: 'object',
          nullable: true,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async signin(@Body() signinDto: SigninDto) {
    return this.authService.signin(signinDto);
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a magic link to user email for passwordless login',
  })
  @ApiBody({ type: EmailDto })
  @ApiOkResponse({
    description: 'Magic link sent successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
        },
        error: {
          type: 'object',
          nullable: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or user not found',
  })
  async signinWithOtp(@Body() emailDto: EmailDto) {
    return this.authService.signinWithOtp(emailDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset instructions to user email' })
  @ApiBody({ type: EmailDto })
  @ApiOkResponse({
    description: 'Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
        },
        error: {
          type: 'object',
          nullable: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format or user not found',
  })
  async resetPassword(@Body() emailDto: EmailDto) {
    return this.authService.resetPassword(emailDto.email);
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out the current user' })
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT Bearer token',
    required: true,
    schema: { type: 'string', example: 'Bearer {{access_token}}' },
  })
  @ApiOkResponse({
    description: 'Successfully signed out',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
        },
        error: {
          type: 'object',
          nullable: true,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
  })
  async signout(@Headers('authorization') authorization: string) {
    const token = authorization?.split(' ')[1];
    return this.authService.signout(token);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT Bearer token',
    required: true,
    schema: { type: 'string', example: 'Bearer {{access_token}}' },
  })
  @ApiOkResponse({
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
            },
          },
        },
        error: {
          type: 'object',
          nullable: true,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
  })
  async getUser(
    @Headers('authorization') authorization: string,
    @Headers('x-refresh-token') refreshToken: string,
  ) {
    const token = authorization?.split(' ')[1];
    return this.authService.getUser(token, refreshToken);
  }

  @Post('clerk-to-supabase')
  @ApiOperation({ summary: 'Login with Google or Facbook' })
  async clerkToSupabase(@Req() req: Request, @Res() res: Response) {
    return this.authService.oauthLogin(req, res);
  }
}
