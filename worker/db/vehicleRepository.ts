import type { Env, VehicleRow } from '../types';

export async function listVehicles(env: Env): Promise<VehicleRow[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM vehicles ORDER BY created_at DESC',
  ).all<VehicleRow>();
  return result.results;
}

export async function findVehicle(env: Env, id: string): Promise<VehicleRow | null> {
  return env.DB.prepare('SELECT * FROM vehicles WHERE id = ?').bind(id).first<VehicleRow>();
}
