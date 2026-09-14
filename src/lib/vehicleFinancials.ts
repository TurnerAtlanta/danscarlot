import type { Vehicle } from '../types/vehicle';
import type { VehicleCostActivity } from '../types/vehicleActivity';

export interface VehicleFinancialSummary {
  acquisitionCost: number;
  addedCosts: number;
  totalInvested: number;
  sellingPrice: number | null;
  projectedGrossProfit: number | null;
}

export function calculateVehicleFinancials(
  vehicle: Pick<Vehicle, 'acquisitionCost' | 'sellingPrice'>,
  activities: Array<Pick<VehicleCostActivity, 'amount'>>,
): VehicleFinancialSummary {
  const acquisitionCost = vehicle.acquisitionCost ?? 0;
  const addedCosts = activities.reduce((total, activity) => total + activity.amount, 0);
  const totalInvested = acquisitionCost + addedCosts;

  return {
    acquisitionCost,
    addedCosts,
    totalInvested,
    sellingPrice: vehicle.sellingPrice,
    projectedGrossProfit:
      vehicle.sellingPrice == null ? null : vehicle.sellingPrice - totalInvested,
  };
}
