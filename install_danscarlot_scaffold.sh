#!/usr/bin/env bash
set -euo pipefail

# Run from the root of the danscarlot repository:
#   bash install_danscarlot_scaffold.sh
#
# This script creates the application scaffold and D1 SQL migrations only.
# It intentionally does NOT overwrite existing source files.
# Review the generated placeholder files, then implement or merge them.

if [[ ! -f "package.json" || ! -d "src" || ! -d "worker" ]]; then
  echo "Error: run this script from the root of the danscarlot repository."
  exit 1
fi

if [[ -e "db/migrations/0001_initial_schema.sql" ]]; then
  echo "Error: db/migrations/0001_initial_schema.sql already exists. No files were changed."
  exit 1
fi

mkdir -p \
  db/migrations \
  src/api \
  src/components/CarManager \
  src/components/ui \
  src/lib \
  src/types \
  worker/db \
  worker/routes \
  worker/lib

cat > db/migrations/0001_initial_schema.sql <<'SQL'
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  stock_number TEXT,
  vin TEXT,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  mileage INTEGER,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'inventory',
  acquisition_cost_cents INTEGER,
  selling_price_cents INTEGER,
  purchased_from TEXT,
  primary_funding_source TEXT,
  secondary_funding_source TEXT,
  additional_funding_source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_cost_activities (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  vendor TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  funding_source TEXT,
  receipt_reference TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
SQL

cat > db/migrations/0002_add_indexes.sql <<'SQL'
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin
  ON vehicles(vin)
  WHERE vin IS NOT NULL AND vin <> '';

CREATE INDEX IF NOT EXISTS idx_vehicles_status
  ON vehicles(status);

CREATE INDEX IF NOT EXISTS idx_vehicles_created_at
  ON vehicles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_cost_activities_vehicle_date
  ON vehicle_cost_activities(vehicle_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_cost_activities_category
  ON vehicle_cost_activities(category);
SQL

cat > src/types/vehicle.ts <<'TS'
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
TS

cat > src/types/vehicleActivity.ts <<'TS'
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
TS

cat > src/lib/currency.ts <<'TS'
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function parseCurrencyInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
TS

cat > src/lib/vehicleFinancials.ts <<'TS'
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
TS

cat > src/api/client.ts <<'TS'
const API_BASE_URL = '/api';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
TS

cat > src/api/vehicles.ts <<'TS'
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
TS

cat > src/api/vehicleActivities.ts <<'TS'
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
TS

cat > worker/types.ts <<'TS'
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
TS

cat > worker/lib/http.ts <<'TS'
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
TS

cat > worker/lib/money.ts <<'TS'
export function dollarsToCents(value: unknown): number | null {
  if (value == null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function centsToDollars(value: number | null): number | null {
  return value == null ? null : value / 100;
}
TS

cat > worker/db/vehicleRepository.ts <<'TS'
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
TS

cat > worker/db/vehicleActivityRepository.ts <<'TS'
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
TS

cat > worker/routes/vehicles.ts <<'TS'
// Add vehicle CRUD handlers here. These handlers must use env.DB prepared statements,
// never an in-memory array or module-level inventory variable.
export {};
TS

cat > worker/routes/vehicleActivities.ts <<'TS'
// Add vehicle cost activity CRUD handlers here. Validate amount > 0 and verify
// the parent vehicle exists before inserting activity records.
export {};
TS

cat > src/components/CarManager/VehicleFinancialSummary.tsx <<'TSX'
import { formatCurrency } from '../../lib/currency';
import type { VehicleFinancialSummary as Summary } from '../../lib/vehicleFinancials';

export function VehicleFinancialSummary({ summary }: { summary: Summary }) {
  const items = [
    ['Purchase Cost', summary.acquisitionCost],
    ['Added Costs', summary.addedCosts],
    ['Total Invested', summary.totalInvested],
    ['Projected Gross Profit', summary.projectedGrossProfit],
  ] as const;

  return (
    <section aria-label="Vehicle financial summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(([label, amount]) => (
        <div key={label} className="rounded border p-3">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-semibold">{formatCurrency(amount)}</p>
        </div>
      ))}
    </section>
  );
}
TSX

cat > src/components/CarManager/VehicleActivityForm.tsx <<'TSX'
import type { FormEvent } from 'react';
import type { VehicleActivityCategory, VehicleCostActivityInput } from '../../types/vehicleActivity';

export const vehicleActivityCategories: VehicleActivityCategory[] = [
  'Cleanup / Detail',
  'Repair',
  'Service / Maintenance',
  'Parts',
  'Transport / Tow',
  'Inspection',
  'Title / Registration',
  'Auction / Purchase Fee',
  'Marketing / Advertising',
  'Photography',
  'Other',
];

export function VehicleActivityForm({
  initialValue,
  onSubmit,
}: {
  initialValue?: Partial<VehicleCostActivityInput>;
  onSubmit: (value: VehicleCostActivityInput) => Promise<void> | void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get('amount'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    await onSubmit({
      activityDate: String(form.get('activityDate')),
      category: String(form.get('category')) as VehicleActivityCategory,
      description: String(form.get('description')).trim(),
      vendor: String(form.get('vendor')).trim() || null,
      amount,
      fundingSource: String(form.get('fundingSource')).trim() || null,
      receiptReference: String(form.get('receiptReference')).trim() || null,
      notes: String(form.get('notes')).trim() || null,
    });

    event.currentTarget.reset();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input name="activityDate" type="date" required defaultValue={initialValue?.activityDate} />
      <select name="category" required defaultValue={initialValue?.category ?? 'Repair'}>
        {vehicleActivityCategories.map((category) => <option key={category}>{category}</option>)}
      </select>
      <input name="description" required placeholder="Description" defaultValue={initialValue?.description} />
      <input name="vendor" placeholder="Vendor / payee" defaultValue={initialValue?.vendor ?? ''} />
      <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Cost amount" defaultValue={initialValue?.amount} />
      <input name="fundingSource" placeholder="Paid by / funding source" defaultValue={initialValue?.fundingSource ?? ''} />
      <input name="receiptReference" placeholder="Receipt / invoice reference" defaultValue={initialValue?.receiptReference ?? ''} />
      <textarea name="notes" placeholder="Notes" defaultValue={initialValue?.notes ?? ''} />
      <button type="submit">Save Cost Activity</button>
    </form>
  );
}
TSX

cat > src/components/CarManager/VehicleActivityList.tsx <<'TSX'
import { formatCurrency } from '../../lib/currency';
import type { VehicleCostActivity } from '../../types/vehicleActivity';

export function VehicleActivityList({ activities }: { activities: VehicleCostActivity[] }) {
  if (activities.length === 0) return <p>No maintenance, repair, cleanup, or marketing costs entered.</p>;

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <article key={activity.id} className="rounded border p-3">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-medium">{activity.category}: {activity.description}</p>
              <p className="text-sm text-gray-500">{activity.activityDate}{activity.vendor ? ` · ${activity.vendor}` : ''}</p>
            </div>
            <p className="font-semibold">{formatCurrency(activity.amount)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
TSX

if ! grep -q 'd1_databases' wrangler.toml; then
  cat >> wrangler.toml <<'TOML'

# Create the database first with: npx wrangler d1 create danscarlot-db
# Replace the placeholder below with the returned Cloudflare database ID.
[[d1_databases]]
binding = "DB"
database_name = "danscarlot-db"
database_id = "REPLACE_WITH_D1_DATABASE_ID"
migrations_dir = "db/migrations"
TOML
fi

echo
 echo "Scaffold created successfully."
echo ""
echo "Next actions:"
echo "  1. Create D1: npx wrangler d1 create danscarlot-db"
echo "  2. Put the returned database_id into wrangler.toml."
echo "  3. Apply local schema:  npx wrangler d1 migrations apply danscarlot-db --local"
echo "  4. Apply remote schema: npx wrangler d1 migrations apply danscarlot-db --remote"
echo "  5. Implement the route handlers and connect the existing car components to src/api/."
echo "  6. Run: npm run build"
