import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

export interface Floor {
  id: string;
  name: string;
  charges: number;
}

@Injectable()
export class FloorsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get all floors
   */
  async findAll(): Promise<Floor[]> {
    const { data: floors, error } = await this.supabaseService
      .getClient()
      .from('floors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return floors;
  }

  /**
   * Get a single floor by ID
   */
  async findOne(id: string): Promise<Floor> {
    const { data: floor, error } = await this.supabaseService
      .getClient()
      .from('floors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !floor) {
      throw new NotFoundException(`Floor with ID ${id} not found`);
    }

    return floor;
  }

  /**
   * Create a new floor
   */
  async create(createFloorDto: CreateFloorDto): Promise<Floor> {
    const { data: newFloor, error } = await this.supabaseService
      .getClient()
      .from('floors')
      .insert({
        name: createFloorDto.name,
        charges: createFloorDto.charges,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return newFloor;
  }

  /**
   * Update an existing floor
   */
  async update(id: string, updateFloorDto: UpdateFloorDto): Promise<Floor> {
    // Ensure floor exists
    await this.findOne(id);

    const { data: updatedFloor, error } = await this.supabaseService
      .getClient()
      .from('floors')
      .update({
        name: updateFloorDto.name,
        charges: updateFloorDto.charges,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedFloor;
  }

  /**
   * Delete a floor
   */
  async remove(id: string): Promise<Floor> {
    // Ensure floor exists
    const floor = await this.findOne(id);

    const { error } = await this.supabaseService
      .getClient()
      .from('floors')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return floor;
  }
}
