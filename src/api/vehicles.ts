import { apiRequest } from './client';
import type { Vehicle, VehicleInput } from '../types/vehicle';

export const vehiclesApi = {
  list: () => apiRequest<Vehicle[]>('/vehicles'),
  get: (vehicleId: string) => apiRequest<Vehicle>(`/vehicles/${vehicleId}`),
  create: (input: VehicleInput) =>
    apiRequest<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(input) }),
  update: (vehicleId: string, input: Partial<VehicleInput>) =>
    apiRequest<Vehicle>(`/vehicles/${vehicleId}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (vehicleId: string) =>
    apiRequest<void>(`/vehicles/${vehicleId}`, { method: 'DELETE' }),
};
