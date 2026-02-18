import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateUserDto, CreateAddressDto, UpdateAddressDto, UpdateRoleDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Get user profile by ID or user session token
   */
  async getUserProfile(userId: string) {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (!data) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to get user profile: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to get user profile',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateUserDto: UpdateUserDto) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Update auth user metadata
      if (updateUserDto.name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: updateUserDto.name }
        });
        
        if (authError) throw authError;
      }
      
      // Update user profile in users table
      const { data, error } = await supabase
        .from('users')
        .update(updateUserDto)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to update user profile: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to update user profile',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string) {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      this.logger.error(`Failed to get user addresses: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to get user addresses',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Add new address for user
   */
  async createAddress(userId: string, createAddressDto: CreateAddressDto) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // If this is set as default address, update existing default addresses of the same type
      if (createAddressDto.is_default) {
        await this.updateDefaultAddressFlag(userId, createAddressDto.type);
      }
      
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          ...createAddressDto,
          user_id: userId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to create address: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to create address',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update user address
   */
  async updateAddress(userId: string, addressId: number, updateAddressDto: UpdateAddressDto) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Check if address exists and belongs to user
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('id, type')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !existingAddress) {
        throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
      }
      
      // If this is set as default address or the type changed, update existing defaults
      if (updateAddressDto.is_default || 
          (updateAddressDto.type && updateAddressDto.type !== existingAddress.type)) {
        // Use the new type if it's being updated, otherwise use the existing one
        const addressType = updateAddressDto.type || existingAddress.type;
        await this.updateDefaultAddressFlag(userId, addressType);
      }
      
      const { data, error } = await supabase
        .from('user_addresses')
        .update(updateAddressDto)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to update address: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to update address',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete user address
   */
  async deleteAddress(userId: string, addressId: number) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Check if address exists and belongs to user
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('id', addressId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !existingAddress) {
        throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
      }
      
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return existingAddress;
    } catch (error) {
      this.logger.error(`Failed to delete address: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to delete address',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Helper method to update default flag for addresses of a given type
   */
  private async updateDefaultAddressFlag(userId: string, addressType: string) {
    const supabase = this.supabaseService.getClient();
    
    // Reset default flag for all addresses of this type
    await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('type', addressType)
      .eq('is_default', true);
  }

  /**
   * List all users (admin only)
   */
  async getAllUsers(
    page: number = 1, 
    limit: number = 10,
    search?: string,
    role?: string,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Start building the query
      let query = supabase.from('users').select('*');
      
      // Apply filters if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      if (role) {
        query = query.eq('role', role);
      }
      
      // Get count of filtered users
      const countQuery = supabase.from('users').select('*', { count: 'exact', head: true });
      
      // Apply the same filters to the count query
      if (search) {
        countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      if (role) {
        countQuery.eq('role', role);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      // Apply sorting and pagination
      const offset = (page - 1) * limit;
      
      // Get paginated users with filters, sorting and pagination
      const { data, error } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Construct pagination metadata
      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / limit);
      
      return {
        items: data || [],
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get all users: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to get all users',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, updateRoleDto: UpdateRoleDto) {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (checkError || !existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      const { data, error } = await supabase
        .from('users')
        .update({ role: updateRoleDto.role })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to update user role: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to update user role',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 