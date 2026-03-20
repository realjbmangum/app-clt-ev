import type { Env } from '../types';
import { upsertEnergyReading, logSync } from '../db/queries';

export async function aggregateEnergyReadings(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  try {
    // Aggregate yesterday's sessions into energy_readings
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await env.DB.prepare(
      `SELECT
        station_charger_id,
        SUM(energy_kwh) as total_kwh,
        SUM(cost_usd) as total_cost,
        COUNT(*) as session_count,
        AVG(
          CASE WHEN end_time IS NOT NULL
            THEN (julianday(end_time) - julianday(start_time)) * 24 * 60
            ELSE NULL
          END
        ) as avg_duration_min
       FROM sessions
       WHERE DATE(start_time) = ?
       GROUP BY station_charger_id`
    ).bind(yesterday).all();

    for (const row of (result.results as any[]) || []) {
      await upsertEnergyReading(env.DB, {
        station_charger_id: row.station_charger_id,
        reading_date: yesterday,
        total_kwh: row.total_kwh || 0,
        total_cost: row.total_cost || 0,
        session_count: row.session_count || 0,
        avg_session_duration_min: row.avg_duration_min || null,
      });
      processed++;
    }

    await logSync(env.DB, {
      sync_type: 'energy_aggregation',
      status: 'success',
      records_processed: processed,
      started_at: startedAt,
    });
  } catch (error: any) {
    await logSync(env.DB, {
      sync_type: 'energy_aggregation',
      status: 'error',
      records_processed: processed,
      error_message: error.message,
      started_at: startedAt,
    });
    console.error('Energy aggregation failed:', error);
  }
}
