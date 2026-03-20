export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  CHARGEPOINT_API_KEY: string;
  CHARGEPOINT_API_URL: string;
  JWT_SECRET: string;
}

export interface Station {
  id: number;
  charger_id: string;
  company_id: string | null;
  connector_format: string | null;
  connector_name: string | null;
  connectors_id: string | null;
  country: string | null;
  country_code: string | null;
  county: string | null;
  evse_id: string | null;
  evse_name: string | null;
  floor_label: string | null;
  is_public: boolean;
  mac_address: string | null;
  max_amperage: string | null;
  max_voltage: string | null;
  org_name: string | null;
  party_id: string | null;
  power_type: string | null;
  provider_id: string | null;
  provision_status: string | null;
  scheduled_charging_policy: string | null;
  site_id: string | null;
  station_address: string | null;
  station_city: string | null;
  station_id: string | null;
  station_lat: number | null;
  station_lng: number | null;
  station_state: string | null;
  station_status: string | null;
  station_zip: string | null;
  system_serial: string | null;
  timezone: string | null;
  utility_name: string | null;
  utility_plan: string | null;
  warranty_type: string | null;
  last_status_change: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  session_id: string;
  station_charger_id: string;
  user_id: string | null;
  start_time: string;
  end_time: string | null;
  energy_kwh: number | null;
  cost_usd: number | null;
  port_number: number | null;
  created_at: string;
}

export interface EnergyReading {
  id: number;
  station_charger_id: string;
  reading_date: string;
  total_kwh: number;
  total_cost: number;
  session_count: number;
  avg_session_duration_min: number | null;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'operations' | 'finance' | 'leadership';
  password_hash: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface SyncLog {
  id: number;
  sync_type: string;
  status: 'success' | 'error';
  records_processed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
}

export interface JWTPayload {
  sub: number;
  email: string;
  role: string;
  exp: number;
}
