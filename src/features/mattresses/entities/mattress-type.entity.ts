export class MattressType {
  id: string;
  name: string;
  image_url?: string | null;
  height_cm?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  mattresses?: Mattress[];
}

export class Mattress {
  id: string;
  mattress_type_id: string;
  name: string;
  height_cm?: number | null;
  size?: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}