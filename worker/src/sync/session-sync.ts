import type { Env } from '../types';
import { ChargePointClient } from './chargepoint';
import { insertSession, logSync } from '../db/queries';

export async function syncChargingSessions(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  try {
    const client = new ChargePointClient(env);

    // Pull sessions from the last 2 hours
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const sessions = await client.getChargingSessions({ startTime, endTime });

    for (const session of sessions) {
      if (!session.sessionId || !session.stationId) continue;

      await insertSession(env.DB, {
        session_id: session.sessionId,
        station_charger_id: session.stationId,
        start_time: session.startTime,
        end_time: session.endTime || undefined,
        energy_kwh: session.energy || undefined,
        cost_usd: session.cost || undefined,
        port_number: parseInt(session.portNumber) || undefined,
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
      error_message: error.message?.substring(0, 500),
      started_at: startedAt,
    });
    console.error('Session sync failed:', error);
  }
}
