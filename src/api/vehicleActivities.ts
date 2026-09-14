import { apiRequest } from './client';
import type { VehicleCostActivity, VehicleCostActivityInput } from '../types/vehicleActivity';

export const vehicleActivitiesApi = {
  list: (vehicleId: string) =>
    apiRequest<VehicleCostActivity[]>(`/vehicles/${vehicleId}/activities`),
  create: (vehicleId: string, input: VehicleCostActivityInput) =>
    apiRequest<VehicleCostActivity>(`/vehicles/${vehicleId}/activities`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (vehicleId: string, activityId: string, input: Partial<VehicleCostActivityInput>) =>
    apiRequest<VehicleCostActivity>(`/vehicles/${vehicleId}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  remove: (vehicleId: string, activityId: string) =>
    apiRequest<void>(`/vehicles/${vehicleId}/activities/${activityId}`, {
      method: 'DELETE',
    }),
};
