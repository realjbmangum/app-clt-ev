export type Station = {
  id: number
  charger_id: string
  connector_format: string
  evse_id: string
  evse_name: string
  is_public: boolean
  org_name: string
  power_type: string
  station_address: string
  station_city: string
  station_lat: number
  station_lng: number
  station_state: string
  station_status: 'AVAILABLE' | 'OCCUPIED' | 'UNREACHABLE' | 'FAULTED'
  station_zip: string
  warranty_type: string
  last_status_change: string | null
}

export type Session = {
  id: number
  session_id: string
  station_charger_id: string
  start_time: string
  end_time: string
  energy_kwh: number
  cost_usd: number
  port_number: number
}

export type StatsResponse = {
  total: number
  available: number
  occupied: number
  unreachable: number
  faulted: number
  total_sessions: number
  total_kwh: number
  total_cost: number
  uptime_percent: number
}
