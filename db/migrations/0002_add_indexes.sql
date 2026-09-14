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
