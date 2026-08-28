export type BedOptionType = 'headboard_height' | 'storage' | 'wings' | 'mattress' | 'base';

export class BedOption {
  id: string;
  type: BedOptionType;
  label: string;
  charge: number;
  height_cm?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}