import { PartialType } from '@nestjs/swagger';
import { CreateMattressTypeDto } from './create-mattress-type.dto';

export class UpdateMattressTypeDto extends PartialType(CreateMattressTypeDto) {}