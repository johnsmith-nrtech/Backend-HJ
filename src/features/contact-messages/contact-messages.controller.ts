import { 
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactMessagesService, ContactMessage } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Contact Messages')
@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a contact message' })
  @ApiBody({ type: CreateContactMessageDto })
  @ApiResponse({ status: 201, description: 'Message submitted', type: Object })
  async create(@Body() dto: CreateContactMessageDto): Promise<ContactMessage> {
    return this.contactMessagesService.create(dto);
  }
}

@ApiTags('Admin Contact Messages')
@Controller('admin/contact-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  @Get()
  @ApiOperation({ summary: 'List contact messages (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['new','read','archived','replied'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: 'new'|'read'|'archived'|'replied',
    @Query('search') search?: string,
  ) {
    return this.contactMessagesService.listAdmin({ page, limit, status, search });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update message status/notes (Admin)' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContactMessageStatusDto,
  ) {
    return this.contactMessagesService.updateAdmin(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact message (Admin)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.contactMessagesService.removeAdmin(id);
  }
}


