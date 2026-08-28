import { PartialType } from '@nestjs/swagger';
import { CreateBedOptionDto } from './create-bed-option.dto';

export class UpdateBedOptionDto extends PartialType(CreateBedOptionDto) {}