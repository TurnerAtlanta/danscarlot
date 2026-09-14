export type VehicleActivityCategory =
  | 'Cleanup / Detail'
  | 'Repair'
  | 'Service / Maintenance'
  | 'Parts'
  | 'Transport / Tow'
  | 'Inspection'
  | 'Title / Registration'
  | 'Auction / Purchase Fee'
  | 'Marketing / Advertising'
  | 'Photography'
  | 'Other';

export interface VehicleCostActivity {
  id: string;
  vehicleId: string;
  activityDate: string;
  category: VehicleActivityCategory;
  description: string;
  vendor: string | null;
  amount: number;
  fundingSource: string | null;
  receiptReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VehicleCostActivityInput = Omit<
  VehicleCostActivity,
  'id' | 'vehicleId' | 'createdAt' | 'updatedAt'
>;
