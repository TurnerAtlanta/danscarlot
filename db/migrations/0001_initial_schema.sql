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
