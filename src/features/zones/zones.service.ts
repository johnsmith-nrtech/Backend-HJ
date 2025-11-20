import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateZonesDto } from './dto/create-zones.dto';
import { UpdateZonesDto } from './dto/update-zones.dto';
import { Zone, Zone as ZoneEntity } from './entities/zones.entity';

type ZoneSelectResult = {
  id: string;
  zone_name: string;
  delivery_charges: number;
  created_at: Date;
  updated_at: Date;
  zone_areas: { zip_code: string }[];
};

type ZoneByZipCodeResult = {
  id: string;
  zone_name: string;
  delivery_charges: number;
  zip_code: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ZonesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<ZoneEntity[]> {
    const { data: zones, error } = await this.supabaseService
      .getClient()
      .from('zones')
      .select(
        `
        id,
        zone_name,
        delivery_charges,
        created_at,
        updated_at,
        zone_areas (
          zip_code
        )
      `,
      )
      .order('zone_name', { ascending: true });

    if (error) {
      throw error;
    }

    return zones.map((zone: ZoneSelectResult) => {
      return {
        id: zone.id,
        zone_name: zone.zone_name,
        delivery_charges: zone.delivery_charges,
        created_at: zone.created_at,
        updated_at: zone.updated_at,
        zip_codes: zone.zone_areas.map((area) => area.zip_code),
      };
    });
  }

  async findOne(id: string): Promise<ZoneEntity> {
    const { data: zone, error } = await this.supabaseService
      .getClient()
      .from('zones')
      .select(
        `
        id,
        zone_name,
        delivery_charges,
        created_at,
        updated_at,
        zone_areas (
          zip_code
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    const zoneResult: ZoneSelectResult = zone;

    return {
      id: zoneResult.id,
      zone_name: zoneResult.zone_name,
      delivery_charges: zoneResult.delivery_charges,
      created_at: zoneResult.created_at,
      updated_at: zoneResult.updated_at,
      zip_codes: zoneResult.zone_areas.map((area) => area.zip_code),
    };
  }

  async create(createZonesDto: CreateZonesDto): Promise<ZoneEntity> {
    const client = this.supabaseService.getClient();

    // Start a transaction-like operation
    const { data: newZone, error: zoneError } = await client
      .from('zones')
      .insert({
        zone_name: createZonesDto.zone_name,
        delivery_charges: createZonesDto.delivery_charges,
      })
      .select()
      .single();

    if (zoneError) {
      throw zoneError;
    }

    if (!newZone) {
      throw new Error('Failed to create zone');
    }

    const newZoneId: string = newZone.id;

    // Verify that the zipCodes doesnot already exist in zone_areas
    const existingZipCodesCheck = await this.zipCodesExists(
      createZonesDto.zip_codes,
    ).catch(async (error) => {
      // Rollback: delete the created zone if verification fails
      await client.from('zones').delete().eq('id', newZoneId);
      throw error;
    });
    if (existingZipCodesCheck.zipCodesExist) {
      // Rollback: delete the created zone if verification fails
      await client.from('zones').delete().eq('id', newZoneId);
      throw new Error(
        `The following zip codes already exist in other zones: ${existingZipCodesCheck.existingZipCodes.join(
          ', ',
        )}`,
      );
    }

    // Insert zip codes into zone_areas
    const zoneAreasData = createZonesDto.zip_codes.map((zipCode) => ({
      zone_id: newZoneId,
      zip_code: zipCode,
    }));

    const { error: areasError } = await client
      .from('zone_areas')
      .insert(zoneAreasData);

    if (areasError) {
      // Rollback: delete the zone if zip codes insertion fails
      await client.from('zones').delete().eq('id', newZoneId);
      throw areasError;
    }

    // Return the complete zone with zip codes
    return this.findOne(newZoneId);
  }

  /**
   * Update an existing zone
   */
  async update(
    id: string,
    updateZonesDto: UpdateZonesDto,
  ): Promise<ZoneEntity> {
    // Ensure zone exists
    const zone = await this.findOne(id);
    const existingZipCodes = zone.zip_codes;

    const { error } = await this.supabaseService
      .getClient()
      .from('zones')
      .update({
        zone_name: updateZonesDto.zone_name,
        delivery_charges: updateZonesDto.delivery_charges,
      })
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    const newZipCode = updateZonesDto.zip_codes.filter(
      (zip) => !existingZipCodes.includes(zip),
    );

    const removedZipCode = existingZipCodes.filter(
      (zip) => !updateZonesDto.zip_codes.includes(zip),
    );

    if (newZipCode.length === 0) {
      return this.findOne(id);
    }

    // Verify that the new zip codes do not already exist in zone_areas
    const existingZipCodesCheck = await this.zipCodesExists(newZipCode);
    if (existingZipCodesCheck.zipCodesExist) {
      throw new Error(
        `The following zip codes already exist in other zones: ${existingZipCodesCheck.existingZipCodes.join(
          ', ',
        )}`,
      );
    }

    // Insert new zip codes into zone_areas
    const zoneAreasData = newZipCode.map((zipCode) => ({
      zone_id: id,
      zip_code: zipCode,
    }));

    const { error: areasError } = await this.supabaseService
      .getClient()
      .from('zone_areas')
      .insert(zoneAreasData);

    if (areasError) {
      throw areasError;
    }

    // Remove deleted zip codes from zone_areas
    if (removedZipCode.length > 0) {
      const { error: removeError } = await this.supabaseService
        .getClient()
        .from('zone_areas')
        .delete()
        .eq('zone_id', id)
        .in('zip_code', removedZipCode);

      if (removeError) {
        throw removeError;
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ id: string }> {
    const { error } = await this.supabaseService
      .getClient()
      .from('zones')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { id };
  }

  async findByZipCode(zipCode: string): Promise<ZoneByZipCodeResult | null> {
    const { data: zone, error } = await this.supabaseService
      .getClient()
      .from('zone_areas')
      .select(
        `
        zones (
          id,
          zone_name,
          delivery_charges,
          created_at,
          updated_at
        ),
        zip_code
      `,
      )
      .eq('zip_code', zipCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    const zoneData = zone.zones as unknown as Omit<
      ZoneSelectResult,
      'zone_areas'
    >;

    return {
      id: zoneData.id,
      zone_name: zoneData.zone_name,
      delivery_charges: zoneData.delivery_charges,
      zip_code: zone.zip_code,
      created_at: zoneData.created_at,
      updated_at: zoneData.updated_at,
    };
  }

  private async zipCodesExists(zipCodes: string[]): Promise<{
    zipCodesExist: boolean;
    existingZipCodes: string[];
  }> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('zone_areas')
      .select('zip_code')
      .in('zip_code', zipCodes);

    if (error) {
      throw error;
    }

    // return data && data.length > 0;
    const existingZipCodes = data.map(
      (area: { zip_code: string }) => area.zip_code,
    );
    return {
      zipCodesExist: existingZipCodes.length > 0,
      existingZipCodes: existingZipCodes,
    };
  }
}
