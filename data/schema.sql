-- CLT EV Charging Dashboard - D1 Schema

-- stations: all 208 charging stations
CREATE TABLE stations (
  id INTEGER PRIMARY KEY,
  charger_id TEXT NOT NULL,
  company_id TEXT,
  connector_format TEXT,
  connector_name TEXT,
  connectors_id TEXT,
  country TEXT,
  country_code TEXT,
  county TEXT,
  evse_id TEXT,
  evse_name TEXT,
  floor_label TEXT,
  is_public BOOLEAN,
  mac_address TEXT,
  max_amperage TEXT,
  max_voltage TEXT,
  org_name TEXT,
  party_id TEXT,
  power_type TEXT,
  provider_id TEXT,
  provision_status TEXT,
  scheduled_charging_policy TEXT,
  site_id TEXT,
  station_address TEXT,
  station_city TEXT,
  station_id TEXT,
  station_lat REAL,
  station_lng REAL,
  station_state TEXT,
  station_status TEXT,
  station_zip TEXT,
  system_serial TEXT,
  timezone TEXT,
  utility_name TEXT,
  utility_plan TEXT,
  warranty_type TEXT,
  last_status_change DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- sessions: charging session records from ChargePoint
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE,
  station_charger_id TEXT,
  user_id TEXT,
  start_time DATETIME,
  end_time DATETIME,
  energy_kwh REAL,
  cost_usd REAL,
  port_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- energy_readings: daily aggregated energy/cost snapshots
CREATE TABLE energy_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_charger_id TEXT,
  reading_date DATE,
  total_kwh REAL,
  total_cost REAL,
  session_count INTEGER,
  avg_session_duration_min REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(station_charger_id, reading_date)
);

-- users: dashboard users with roles
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'operations', 'finance', 'leadership')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- sync_logs: API sync health tracking
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('success', 'error')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- station_status_history: track status changes over time
CREATE TABLE station_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_charger_id TEXT,
  old_status TEXT,
  new_status TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_stations_status ON stations(station_status);
CREATE INDEX idx_stations_org ON stations(org_name);
CREATE INDEX idx_sessions_station ON sessions(station_charger_id);
CREATE INDEX idx_sessions_time ON sessions(start_time);
CREATE INDEX idx_energy_station_date ON energy_readings(station_charger_id, reading_date);
CREATE INDEX idx_sync_type ON sync_logs(sync_type, completed_at);
CREATE INDEX idx_status_history ON station_status_history(station_charger_id, changed_at);
