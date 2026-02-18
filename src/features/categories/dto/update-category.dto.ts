import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';
 
/**
 * Data Transfer Object for updating an existing category
 * All fields are optional - only provided fields will be updated
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {} 