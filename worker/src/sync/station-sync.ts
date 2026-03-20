import type { Env } from '../types';
import { ChargePointClient } from './chargepoint';
import { getAllStations, updateStationStatus, insertStatusChange, logSync } from '../db/queries';

export async function syncStationStatuses(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  try {
    const client = new ChargePointClient(env);

    // Get current statuses from ChargePoint
    const apiStatuses = await client.getStationStatus();

    // Get current DB stations for comparison
    const dbResult = await getAllStations(env.DB);
    const dbStations = new Map(
      (dbResult.results as any[])?.map(s => [s.charger_id, s]) || []
    );

    // Update statuses and track changes
    for (const apiStation of apiStatuses) {
      const chargerId = String(apiStation.stationId || apiStation.charger_id || apiStation.id);
      const newStatus = apiStation.status || apiStation.stationStatus;
      if (!chargerId || !newStatus) continue;

      const dbStation = dbStations.get(chargerId);
      if (!dbStation) continue;

      if (dbStation.station_status !== newStatus) {
        await insertStatusChange(env.DB, chargerId, dbStation.station_status || 'UNKNOWN', newStatus);
        await updateStationStatus(env.DB, chargerId, newStatus);
      }

      processed++;
    }

    await logSync(env.DB, {
      sync_type: 'station_status',
      status: 'success',
      records_processed: processed,
      started_at: startedAt,
    });
  } catch (error: any) {
    await logSync(env.DB, {
      sync_type: 'station_status',
      status: 'error',
      records_processed: processed,
      error_message: error.message,
      started_at: startedAt,
    });
    console.error('Station sync failed:', error);
  }
}
