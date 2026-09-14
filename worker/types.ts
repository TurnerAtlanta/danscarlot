export interface Env {
  DB: D1Database;
}

export type VehicleStatus =
  | 'inventory'
  | 'in_recon'
  | 'ready_for_sale'
  | 'pending_sale'
  | 'sold'
  | 'wholesale';

export interface VehicleRow {
  id: string;
  stock_number: string | null;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  color: string | null;
  status: VehicleStatus;
  acquisition_cost_cents: number | null;
  selling_price_cents: number | null;
  purchased_from: string | null;
  primary_funding_source: string | null;
  secondary_funding_source: string | null;
  additional_funding_source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleActivityRow {
  id: string;
  vehicle_id: string;
  activity_date: string;
  category: string;
  description: string;
  vendor: string | null;
  amount_cents: number;
  funding_source: string | null;
  receipt_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
