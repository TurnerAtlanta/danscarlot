export type VehicleStatus =
  | 'inventory'
  | 'in_recon'
  | 'ready_for_sale'
  | 'pending_sale'
  | 'sold'
  | 'wholesale';

export interface Vehicle {
  id: string;
  stockNumber: string | null;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  color: string | null;
  status: VehicleStatus;
  acquisitionCost: number | null;
  sellingPrice: number | null;
  purchasedFrom: string | null;
  primaryFundingSource: string | null;
  secondaryFundingSource: string | null;
  additionalFundingSource: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;
