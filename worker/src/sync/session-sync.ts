import type { Env } from '../types';
import { ChargePointClient } from './chargepoint';
import { insertSession, logSync } from '../db/queries';

export async function syncChargingSessions(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  try {
    const client = new ChargePointClient(env);

    // Pull sessions from the last 2 hours to catch any delayed data
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const sessions = await client.getChargingSessions({ startTime, endTime });

    for (const session of sessions) {
      await insertSession(env.DB, {
        session_id: String(session.sessionId || session.session_id || session.id),
        station_charger_id: String(session.stationId || session.station_id),
        user_id: session.userId || session.user_id || null,
        start_time: session.startTime || session.start_time,
        end_time: session.endTime || session.end_time || null,
        energy_kwh: parseFloat(session.energyKwh || session.energy_kwh || '0') || undefined,
        cost_usd: parseFloat(session.cost || session.cost_usd || '0') || undefined,
        port_number: parseInt(session.portNumber || session.port_number || '0') || undefined,
      });
      processed++;
    }

    await logSync(env.DB, {
      sync_type: 'charging_sessions',
      status: 'success',
      records_processed: processed,
      started_at: startedAt,
    });
  } catch (error: any) {
    await logSync(env.DB, {
      sync_type: 'charging_sessions',
      status: 'error',
      records_processed: processed,
      error_message: error.message,
      started_at: startedAt,
    });
    console.error('Session sync failed:', error);
  }
}
