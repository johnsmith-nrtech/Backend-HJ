import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMattressDto } from './create-mattress.dto';

export class UpdateMattressDto extends PartialType(
  OmitType(CreateMattressDto, ['mattress_type_id'] as const),
) {}