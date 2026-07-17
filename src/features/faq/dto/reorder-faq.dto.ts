import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FaqOrderItem {
  id: string;
  order: number;
}

export class ReorderFaqDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqOrderItem)
  items: FaqOrderItem[];
}