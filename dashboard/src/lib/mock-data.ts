// Mock station data based on real CLT EV CSV — used when API is unavailable

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

export const mockStations: Station[] = [
  {
    id: 1, charger_id: '5405', connector_format: 'SOCKET', evse_id: '5405',
    evse_name: 'CLT AIRPORT / BUS. VALET 02', is_public: true,
    org_name: 'Charlotte Douglas International Airport', power_type: 'AC_1_PHASE',
    station_address: '5601 Wilkinson Blvd', station_city: 'Charlotte',
    station_lat: 35.23290253, station_lng: -80.93578339, station_state: 'North Carolina',
    station_status: 'UNREACHABLE', station_zip: '28208', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-18T14:30:00Z',
  },
  {
    id: 2, charger_id: '112279', connector_format: 'PLUG', evse_id: '112279',
    evse_name: 'CLT AIRPORT / LEVEL4_ST2', is_public: true,
    org_name: 'Charlotte Douglas International Airport', power_type: 'AC_1_PHASE',
    station_address: '5501 R C Josh Birmingham Pkwy', station_city: 'Charlotte',
    station_lat: 35.22166797, station_lng: -80.944873, station_state: 'North Carolina',
    station_status: 'AVAILABLE', station_zip: '28208', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-19T09:15:00Z',
  },
  {
    id: 3, charger_id: '112677', connector_format: 'PLUG', evse_id: '112677',
    evse_name: 'CLT AIRPORT / LEVEL6_ST3', is_public: true,
    org_name: 'Charlotte Douglas International Airport', power_type: 'AC_1_PHASE',
    station_address: '5501 R C Josh Birmingham Pkwy', station_city: 'Charlotte',
    station_lat: 35.22165045, station_lng: -80.94538799, station_state: 'North Carolina',
    station_status: 'OCCUPIED', station_zip: '28208', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-20T08:45:00Z',
  },
  {
    id: 4, charger_id: '124357', connector_format: 'PLUG', evse_id: '124357',
    evse_name: 'CHARLOTTE, NC / SOUTHEND 01', is_public: true,
    org_name: 'City of Charlotte', power_type: 'AC_1_PHASE',
    station_address: '1424 South Blvd', station_city: 'Charlotte',
    station_lat: 35.21530753, station_lng: -80.85392945, station_state: 'North Carolina',
    station_status: 'OCCUPIED', station_zip: '28203', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-20T10:00:00Z',
  },
  {
    id: 5, charger_id: '124391', connector_format: 'PLUG', evse_id: '124391',
    evse_name: 'CHARLOTTE, NC / HUNTERSVILLE 01', is_public: true,
    org_name: 'City of Charlotte', power_type: 'AC_1_PHASE',
    station_address: '10300 Compass St', station_city: 'Huntersville',
    station_lat: 35.41369045, station_lng: -80.85719246, station_state: 'North Carolina',
    station_status: 'AVAILABLE', station_zip: '28078', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-19T16:00:00Z',
  },
  {
    id: 6, charger_id: '136493', connector_format: 'PLUG', evse_id: '136493',
    evse_name: 'CHARLOTTE, NC / SOUTHEND 02', is_public: true,
    org_name: 'City of Charlotte', power_type: 'AC_1_PHASE',
    station_address: '1424 South Blvd', station_city: 'Charlotte',
    station_lat: 35.21530667, station_lng: -80.85385208, station_state: 'North Carolina',
    station_status: 'UNREACHABLE', station_zip: '28203', warranty_type: 'ChargePoint Assure',
    last_status_change: '2026-03-17T22:15:00Z',
  },
  {
    id: 7, charger_id: '136531', connector_format: 'PLUG', evse_id: '136531',
    evse_name: 'CHARLOTTE, NC / MALLARD CK 01', is_public: true,
    org_name: 'City of Charlotte', power_type: 'AC_1_PHASE',
    station_address: '1712 J N Pease Pl', station_city: 'Charlotte',
    station_lat: 35.32366992, station_lng: -80.77301164, station_state: 'North Carolina',
    station_status: 'UNREACHABLE', station_zip: '28262', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-16T11:00:00Z',
  },
  {
    id: 8, charger_id: '200001', connector_format: 'PLUG', evse_id: '200001',
    evse_name: 'CLT WATER / VEST RD 01', is_public: false,
    org_name: 'City of Charlotte- Water', power_type: 'AC_1_PHASE',
    station_address: '4222 Vest Rd', station_city: 'Charlotte',
    station_lat: 35.1455, station_lng: -80.8765, station_state: 'North Carolina',
    station_status: 'AVAILABLE', station_zip: '28217', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-20T06:30:00Z',
  },
  {
    id: 9, charger_id: '200002', connector_format: 'PLUG', evse_id: '200002',
    evse_name: 'CLT WATER / VEST RD 02', is_public: false,
    org_name: 'City of Charlotte- Water', power_type: 'AC_1_PHASE',
    station_address: '4222 Vest Rd', station_city: 'Charlotte',
    station_lat: 35.1457, station_lng: -80.8763, station_state: 'North Carolina',
    station_status: 'FAULTED', station_zip: '28217', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-19T03:00:00Z',
  },
  {
    id: 10, charger_id: '112685', connector_format: 'PLUG', evse_id: '112685',
    evse_name: 'CLT AIRPORT / LEVEL6_ST1', is_public: true,
    org_name: 'Charlotte Douglas International Airport', power_type: 'AC_1_PHASE',
    station_address: '5501 R C Josh Birmingham Pkwy', station_city: 'Charlotte',
    station_lat: 35.22164168, station_lng: -80.945506, station_state: 'North Carolina',
    station_status: 'AVAILABLE', station_zip: '28208', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-20T07:00:00Z',
  },
  {
    id: 11, charger_id: '112691', connector_format: 'PLUG', evse_id: '112691',
    evse_name: 'CLT AIRPORT / LEVEL4_ST3', is_public: true,
    org_name: 'Charlotte Douglas International Airport', power_type: 'AC_1_PHASE',
    station_address: '5501 R C Josh Birmingham Pkwy', station_city: 'Charlotte',
    station_lat: 35.22169427, station_lng: -80.9447979, station_state: 'North Carolina',
    station_status: 'AVAILABLE', station_zip: '28208', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-20T07:15:00Z',
  },
  {
    id: 12, charger_id: '200003', connector_format: 'PLUG', evse_id: '200003',
    evse_name: 'CLT WATER / MCALPINE 01', is_public: false,
    org_name: 'City of Charlotte- Water', power_type: 'AC_1_PHASE',
    station_address: '8711 Monroe Rd', station_city: 'Charlotte',
    station_lat: 35.1320, station_lng: -80.7650, station_state: 'North Carolina',
    station_status: 'FAULTED', station_zip: '28212', warranty_type: 'ChargePoint Assure',
    last_status_change: '2026-03-18T20:00:00Z',
  },
  {
    id: 13, charger_id: '145279', connector_format: 'PLUG', evse_id: '145279',
    evse_name: 'CHARLOTTE, NC / HUNTERSVILLE 02', is_public: true,
    org_name: 'City of Charlotte', power_type: 'AC_1_PHASE',
    station_address: '10300 Compass St', station_city: 'Huntersville',
    station_lat: 35.41363172, station_lng: -80.85717636, station_state: 'North Carolina',
    station_status: 'UNREACHABLE', station_zip: '28078', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-15T09:00:00Z',
  },
  {
    id: 14, charger_id: '86181', connector_format: 'PLUG', evse_id: '86181',
    evse_name: 'CLT AIRPORT / FBO WILSON AIR', is_public: false,
    org_name: 'Charlotte Douglas International Airport', power_type: 'AC_1_PHASE',
    station_address: '5400 Airport Dr', station_city: 'Charlotte',
    station_lat: 35.209715, station_lng: -80.930646, station_state: 'North Carolina',
    station_status: 'UNREACHABLE', station_zip: '28208', warranty_type: 'Standard Warranty',
    last_status_change: '2026-03-14T12:00:00Z',
  },
  {
    id: 15, charger_id: '300001', connector_format: 'PLUG', evse_id: '300001',
    evse_name: 'CHARLOTTE, NC / CITY HALL 01', is_public: true,
    org_name: 'City of Charlotte', power_type: 'AC_3_PHASE',
    station_address: '600 E 4th St', station_city: 'Charlotte',
    station_lat: 35.2265, station_lng: -80.8380, station_state: 'North Carolina',
    station_status: 'AVAILABLE', station_zip: '28202', warranty_type: 'ChargePoint Assure',
    last_status_change: '2026-03-20T08:00:00Z',
  },
]

export const mockSessions: Session[] = [
  { id: 1, session_id: 'S001', station_charger_id: '124357', start_time: '2026-03-20T08:15:00Z', end_time: '2026-03-20T10:30:00Z', energy_kwh: 18.5, cost_usd: 3.70, port_number: 1 },
  { id: 2, session_id: 'S002', station_charger_id: '124357', start_time: '2026-03-19T14:00:00Z', end_time: '2026-03-19T16:45:00Z', energy_kwh: 22.1, cost_usd: 4.42, port_number: 1 },
  { id: 3, session_id: 'S003', station_charger_id: '112279', start_time: '2026-03-20T06:00:00Z', end_time: '2026-03-20T08:00:00Z', energy_kwh: 15.3, cost_usd: 3.06, port_number: 1 },
  { id: 4, session_id: 'S004', station_charger_id: '112677', start_time: '2026-03-20T07:30:00Z', end_time: '2026-03-20T09:00:00Z', energy_kwh: 12.8, cost_usd: 2.56, port_number: 1 },
  { id: 5, session_id: 'S005', station_charger_id: '124391', start_time: '2026-03-19T10:00:00Z', end_time: '2026-03-19T12:30:00Z', energy_kwh: 20.0, cost_usd: 4.00, port_number: 1 },
  { id: 6, session_id: 'S006', station_charger_id: '112685', start_time: '2026-03-18T09:00:00Z', end_time: '2026-03-18T11:15:00Z', energy_kwh: 17.2, cost_usd: 3.44, port_number: 1 },
  { id: 7, session_id: 'S007', station_charger_id: '300001', start_time: '2026-03-20T07:00:00Z', end_time: '2026-03-20T09:30:00Z', energy_kwh: 25.0, cost_usd: 5.00, port_number: 1 },
  { id: 8, session_id: 'S008', station_charger_id: '124357', start_time: '2026-03-18T16:00:00Z', end_time: '2026-03-18T18:00:00Z', energy_kwh: 14.6, cost_usd: 2.92, port_number: 1 },
  { id: 9, session_id: 'S009', station_charger_id: '112279', start_time: '2026-03-17T11:00:00Z', end_time: '2026-03-17T13:30:00Z', energy_kwh: 19.8, cost_usd: 3.96, port_number: 1 },
  { id: 10, session_id: 'S010', station_charger_id: '200001', start_time: '2026-03-19T08:00:00Z', end_time: '2026-03-19T10:00:00Z', energy_kwh: 16.4, cost_usd: 3.28, port_number: 1 },
]

export const mockStats: StatsResponse = {
  total: 208,
  available: 157,
  occupied: 20,
  unreachable: 29,
  faulted: 2,
  total_sessions: 0,
  total_kwh: 0,
  total_cost: 0,
  uptime_percent: 75.5,
}
