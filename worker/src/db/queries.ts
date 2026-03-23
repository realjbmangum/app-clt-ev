import type { Env } from '../types';

// --- Stations ---

export async function getAllStations(db: D1Database, filters?: {
  status?: string;
  org?: string;
  is_public?: string;
}) {
  let query = 'SELECT * FROM stations WHERE 1=1';
  const params: string[] = [];

  if (filters?.status) {
    const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length > 0 && statuses.length < 4) {
      query += ` AND station_status IN (${statuses.map(() => '?').join(',')})`
      params.push(...statuses)
    }
  }
  if (filters?.org) {
    query += ' AND org_name = ?';
    params.push(filters.org);
  }
  if (filters?.is_public !== undefined) {
    query += ' AND is_public = ?';
    params.push(filters.is_public === 'true' ? '1' : '0');
  }

  query += ' ORDER BY org_name, evse_name';
  return db.prepare(query).bind(...params).all();
}

export async function getStationById(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM stations WHERE id = ?').bind(id).first();
}

export async function getStationByChargerId(db: D1Database, chargerId: string) {
  return db.prepare('SELECT * FROM stations WHERE charger_id = ?').bind(chargerId).first();
}

export async function updateStationStatus(db: D1Database, chargerId: string, status: string) {
  return db.prepare(
    'UPDATE stations SET station_status = ?, updated_at = CURRENT_TIMESTAMP WHERE charger_id = ?'
  ).bind(status, chargerId).run();
}

export async function getDistinctOrgs(db: D1Database) {
  return db.prepare('SELECT DISTINCT org_name FROM stations WHERE org_name IS NOT NULL ORDER BY org_name').all();
}

// --- Sessions ---

export async function getSessions(db: D1Database, filters?: {
  station_charger_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  let query = 'SELECT * FROM sessions WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.station_charger_id) {
    query += ' AND station_charger_id = ?';
    params.push(filters.station_charger_id);
  }
  if (filters?.start_date) {
    query += ' AND start_time >= ?';
    params.push(filters.start_date);
  }
  if (filters?.end_date) {
    query += ' AND start_time <= ?';
    params.push(filters.end_date);
  }

  query += ' ORDER BY start_time DESC';

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).bind(...params).all();
}

export async function getRecentSessionsForStation(db: D1Database, chargerId: string, limit = 10) {
  return db.prepare(
    'SELECT * FROM sessions WHERE station_charger_id = ? ORDER BY start_time DESC LIMIT ?'
  ).bind(chargerId, limit).all();
}

export async function insertSession(db: D1Database, session: {
  session_id: string;
  station_charger_id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  energy_kwh?: number;
  cost_usd?: number;
  port_number?: number;
}) {
  return db.prepare(
    `INSERT OR IGNORE INTO sessions (session_id, station_charger_id, user_id, start_time, end_time, energy_kwh, cost_usd, port_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    session.session_id,
    session.station_charger_id,
    session.user_id || null,
    session.start_time,
    session.end_time || null,
    session.energy_kwh || null,
    session.cost_usd || null,
    session.port_number || null
  ).run();
}

// --- Energy Readings ---

export async function getEnergyReadings(db: D1Database, filters?: {
  station_charger_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  let query = 'SELECT * FROM energy_readings WHERE 1=1';
  const params: string[] = [];

  if (filters?.station_charger_id) {
    query += ' AND station_charger_id = ?';
    params.push(filters.station_charger_id);
  }
  if (filters?.start_date) {
    query += ' AND reading_date >= ?';
    params.push(filters.start_date);
  }
  if (filters?.end_date) {
    query += ' AND reading_date <= ?';
    params.push(filters.end_date);
  }

  query += ' ORDER BY reading_date DESC';
  return db.prepare(query).bind(...params).all();
}

export async function upsertEnergyReading(db: D1Database, reading: {
  station_charger_id: string;
  reading_date: string;
  total_kwh: number;
  total_cost: number;
  session_count: number;
  avg_session_duration_min: number | null;
}) {
  return db.prepare(
    `INSERT INTO energy_readings (station_charger_id, reading_date, total_kwh, total_cost, session_count, avg_session_duration_min)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(station_charger_id, reading_date)
     DO UPDATE SET total_kwh = ?, total_cost = ?, session_count = ?, avg_session_duration_min = ?`
  ).bind(
    reading.station_charger_id,
    reading.reading_date,
    reading.total_kwh,
    reading.total_cost,
    reading.session_count,
    reading.avg_session_duration_min,
    reading.total_kwh,
    reading.total_cost,
    reading.session_count,
    reading.avg_session_duration_min
  ).run();
}

// --- Stats ---

export async function getAggregateStats(db: D1Database) {
  const [stations, sessions, energy, statusCounts] = await Promise.all([
    db.prepare('SELECT COUNT(*) as total FROM stations').first(),
    db.prepare('SELECT COUNT(*) as total, SUM(energy_kwh) as total_kwh, SUM(cost_usd) as total_cost FROM sessions').first(),
    db.prepare('SELECT SUM(total_kwh) as total_kwh, SUM(total_cost) as total_cost FROM energy_readings').first(),
    db.prepare("SELECT station_status, COUNT(*) as count FROM stations GROUP BY station_status").all(),
  ]);

  const totalStations = (stations as any)?.total || 0;
  const availableCount = (statusCounts?.results as any[])?.find(r => r.station_status === 'AVAILABLE')?.count || 0;
  const uptimePercent = totalStations > 0 ? ((availableCount / totalStations) * 100).toFixed(1) : '0';

  return {
    total_stations: totalStations,
    total_sessions: (sessions as any)?.total || 0,
    total_kwh: (sessions as any)?.total_kwh || (energy as any)?.total_kwh || 0,
    total_cost: (sessions as any)?.total_cost || (energy as any)?.total_cost || 0,
    uptime_percent: parseFloat(uptimePercent),
    status_counts: statusCounts?.results || [],
  };
}

export async function getUtilizationStats(db: D1Database) {
  const [topStations, bottomStations, sessionTrends] = await Promise.all([
    db.prepare(
      `SELECT s.station_charger_id, st.evse_name as station_name, COUNT(*) as session_count, SUM(s.energy_kwh) as total_kwh
       FROM sessions s LEFT JOIN stations st ON s.station_charger_id = st.charger_id
       GROUP BY s.station_charger_id ORDER BY session_count DESC LIMIT 20`
    ).all(),
    db.prepare(
      `SELECT s.station_charger_id, st.evse_name as station_name, COUNT(*) as session_count, SUM(s.energy_kwh) as total_kwh
       FROM sessions s LEFT JOIN stations st ON s.station_charger_id = st.charger_id
       GROUP BY s.station_charger_id ORDER BY session_count ASC LIMIT 20`
    ).all(),
    db.prepare(
      `SELECT DATE(start_time) as date, COUNT(*) as sessions, SUM(energy_kwh) as kwh
       FROM sessions GROUP BY DATE(start_time) ORDER BY date DESC LIMIT 30`
    ).all(),
  ]);

  // Hourly heatmap data
  const hourly = await db.prepare(
    `SELECT CAST(strftime('%H', start_time) AS INTEGER) as hour,
            CAST(strftime('%w', start_time) AS INTEGER) as day_of_week,
            COUNT(*) as count
     FROM sessions
     GROUP BY hour, day_of_week`
  ).all();

  return {
    top_stations: topStations?.results || [],
    bottom_stations: bottomStations?.results || [],
    session_trends: sessionTrends?.results || [],
    hourly_heatmap: hourly?.results || [],
  };
}

export async function getEnergyStats(db: D1Database, filters?: {
  start_date?: string;
  end_date?: string;
}) {
  let dateFilter = '';
  const params: string[] = [];

  if (filters?.start_date) {
    dateFilter += ' AND reading_date >= ?';
    params.push(filters.start_date);
  }
  if (filters?.end_date) {
    dateFilter += ' AND reading_date <= ?';
    params.push(filters.end_date);
  }

  const [timeline, byOrg] = await Promise.all([
    db.prepare(
      `SELECT reading_date, SUM(total_kwh) as kwh, SUM(total_cost) as cost, SUM(session_count) as sessions
       FROM energy_readings WHERE 1=1 ${dateFilter}
       GROUP BY reading_date ORDER BY reading_date DESC LIMIT 90`
    ).bind(...params).all(),
    db.prepare(
      `SELECT s.org_name, SUM(e.total_kwh) as kwh, SUM(e.total_cost) as cost, SUM(e.session_count) as sessions
       FROM energy_readings e
       JOIN stations s ON e.station_charger_id = s.charger_id
       WHERE 1=1 ${dateFilter}
       GROUP BY s.org_name ORDER BY kwh DESC`
    ).bind(...params).all(),
  ]);

  return {
    timeline: timeline?.results || [],
    by_org: byOrg?.results || [],
  };
}

// --- Usage Stats (Pete Dashboard) ---

export async function getUsageStats(db: D1Database, filters: {
  granularity?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  station_id?: string;
}) {
  const granularity = filters.granularity || 'daily';
  const endDate = filters.end_date || new Date().toISOString().slice(0, 10);
  const startDate = filters.start_date || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })();

  let periodExpr: string;
  switch (granularity) {
    case 'weekly':
      periodExpr = "strftime('%Y-W%W', s.start_time)";
      break;
    case 'monthly':
      periodExpr = "strftime('%Y-%m', s.start_time)";
      break;
    case 'quarterly':
      periodExpr = "strftime('%Y', s.start_time) || '-Q' || ((CAST(strftime('%m', s.start_time) AS INTEGER) - 1) / 3 + 1)";
      break;
    default:
      periodExpr = "DATE(s.start_time)";
  }

  let whereClause = 's.start_time >= ? AND s.start_time <= ?';
  const params: (string | number)[] = [startDate, endDate + 'T23:59:59'];

  if (filters.station_id) {
    whereClause += ' AND s.station_charger_id = ?';
    params.push(filters.station_id);
  }

  const query = `
    SELECT
      s.station_charger_id,
      st.evse_name as station_name,
      st.station_address as address,
      ${periodExpr} as period,
      SUM(s.energy_kwh) as kwh,
      COUNT(*) as sessions,
      SUM(s.cost_usd) as cost
    FROM sessions s
    LEFT JOIN stations st ON s.station_charger_id = st.charger_id
    WHERE ${whereClause}
    GROUP BY period, s.station_charger_id
    ORDER BY period DESC, kwh DESC
  `;

  const result = await db.prepare(query).bind(...params).all();
  const rows = result?.results || [];

  // Parse location from station name
  function parseLocation(name: string | null): string {
    if (!name) return 'Unknown';
    const parts = name.split(' / ');
    const loc = parts.length >= 2 ? parts[parts.length - 1] : name;
    return loc.replace(/\s*[-]?\d+$/, '').replace(/\.\s*/g, ' ').trim();
  }

  // Filter by location if specified
  const filteredRows = filters.location
    ? rows.filter((r: any) => parseLocation(r.station_name) === filters.location)
    : rows;

  // Build by-location aggregation
  const locationMap = new Map<string, {
    location: string;
    address: string;
    stations: Set<string>;
    total_kwh: number;
    total_sessions: number;
    total_cost: number;
  }>();

  for (const row of filteredRows as any[]) {
    const loc = parseLocation(row.station_name);
    if (!locationMap.has(loc)) {
      locationMap.set(loc, {
        location: loc,
        address: row.address || '',
        stations: new Set(),
        total_kwh: 0,
        total_sessions: 0,
        total_cost: 0,
      });
    }
    const entry = locationMap.get(loc)!;
    entry.stations.add(row.station_charger_id);
    entry.total_kwh += Number(row.kwh) || 0;
    entry.total_sessions += Number(row.sessions) || 0;
    entry.total_cost += Number(row.cost) || 0;
  }

  const byLocation = Array.from(locationMap.values())
    .map(l => ({
      location: l.location,
      address: l.address,
      station_count: l.stations.size,
      total_kwh: Math.round(l.total_kwh * 100) / 100,
      total_sessions: l.total_sessions,
      total_cost: Math.round(l.total_cost * 100) / 100,
    }))
    .sort((a, b) => b.total_kwh - a.total_kwh);

  // Compute totals
  let totalKwh = 0, totalSessions = 0, totalCost = 0;
  for (const row of filteredRows as any[]) {
    totalKwh += Number(row.kwh) || 0;
    totalSessions += Number(row.sessions) || 0;
    totalCost += Number(row.cost) || 0;
  }

  return {
    usage: (filteredRows as any[]).map(r => ({
      period: r.period,
      station_id: r.station_charger_id,
      station_name: r.station_name || '',
      location: parseLocation(r.station_name),
      address: r.address || '',
      kwh: Math.round((Number(r.kwh) || 0) * 100) / 100,
      sessions: Number(r.sessions) || 0,
      cost: Math.round((Number(r.cost) || 0) * 100) / 100,
    })),
    by_location: byLocation,
    totals: {
      total_kwh: Math.round(totalKwh * 100) / 100,
      total_sessions: totalSessions,
      total_cost: Math.round(totalCost * 100) / 100,
    },
  };
}

// --- Users ---

export async function getUserByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').bind(email).first();
}

export async function getUsers(db: D1Database) {
  return db.prepare('SELECT id, email, name, role, is_active, last_login, created_at FROM users ORDER BY name').all();
}

export async function createUser(db: D1Database, user: { email: string; name: string; role: string; password_hash: string }) {
  return db.prepare(
    'INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)'
  ).bind(user.email, user.name, user.role, user.password_hash).run();
}

export async function updateUser(db: D1Database, id: number, updates: { name?: string; role?: string; is_active?: boolean }) {
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (updates.name !== undefined) { sets.push('name = ?'); params.push(updates.name); }
  if (updates.role !== undefined) { sets.push('role = ?'); params.push(updates.role); }
  if (updates.is_active !== undefined) { sets.push('is_active = ?'); params.push(updates.is_active ? 1 : 0); }

  if (sets.length === 0) return;
  params.push(id);
  return db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
}

export async function updateLastLogin(db: D1Database, id: number) {
  return db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
}

// --- Sync Logs ---

export async function logSync(db: D1Database, entry: {
  sync_type: string;
  status: 'success' | 'error';
  records_processed?: number;
  error_message?: string;
  started_at: string;
}) {
  return db.prepare(
    'INSERT INTO sync_logs (sync_type, status, records_processed, error_message, started_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    entry.sync_type,
    entry.status,
    entry.records_processed || 0,
    entry.error_message || null,
    entry.started_at
  ).run();
}

export async function getSyncLogs(db: D1Database, limit = 50) {
  return db.prepare('SELECT * FROM sync_logs ORDER BY completed_at DESC LIMIT ?').bind(limit).all();
}

// --- Status History ---

export async function insertStatusChange(db: D1Database, chargerId: string, oldStatus: string, newStatus: string) {
  return db.prepare(
    'INSERT INTO station_status_history (station_charger_id, old_status, new_status) VALUES (?, ?, ?)'
  ).bind(chargerId, oldStatus, newStatus).run();
}

// --- Maintenance Logs ---

export async function getMaintenanceLogs(db: D1Database, filters?: {
  status?: string;
  issue_type?: string;
}) {
  let query = 'SELECT * FROM maintenance_logs WHERE 1=1';
  const params: string[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.issue_type) {
    query += ' AND issue_type = ?';
    params.push(filters.issue_type);
  }

  query += ' ORDER BY reported_at DESC';
  return db.prepare(query).bind(...params).all();
}

export async function createMaintenanceLog(db: D1Database, data: {
  station_charger_id: string;
  station_name?: string;
  issue_type: string;
  description?: string;
  assigned_to?: string;
}) {
  return db.prepare(
    `INSERT INTO maintenance_logs (station_charger_id, station_name, issue_type, description, assigned_to)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    data.station_charger_id,
    data.station_name || null,
    data.issue_type,
    data.description || null,
    data.assigned_to || null
  ).run();
}

export async function updateMaintenanceLog(db: D1Database, id: number, updates: {
  status?: string;
  notes?: string;
  resolved_at?: string;
  assigned_to?: string;
}) {
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (updates.status !== undefined) { sets.push('status = ?'); params.push(updates.status); }
  if (updates.notes !== undefined) { sets.push('notes = ?'); params.push(updates.notes); }
  if (updates.resolved_at !== undefined) { sets.push('resolved_at = ?'); params.push(updates.resolved_at); }
  if (updates.assigned_to !== undefined) { sets.push('assigned_to = ?'); params.push(updates.assigned_to); }

  if (sets.length === 0) return;
  params.push(id);
  return db.prepare(`UPDATE maintenance_logs SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
}
