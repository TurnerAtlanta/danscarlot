import type { Env, VehicleActivityRow } from '../types';

export async function listVehicleActivities(
  env: Env,
  vehicleId: string,
): Promise<VehicleActivityRow[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM vehicle_cost_activities WHERE vehicle_id = ? ORDER BY activity_date DESC, created_at DESC',
  ).bind(vehicleId).all<VehicleActivityRow>();

  return result.results;
}
