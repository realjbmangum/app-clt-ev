import type { Env } from '../types';
import { ChargePointClient } from './chargepoint';
import { getAllStations, updateStationStatus, insertStatusChange, logSync } from '../db/queries';

// Map ChargePoint status values to our status format
function normalizeStatus(cpStatus: string): string {
  const s = cpStatus.toUpperCase().trim();
  if (s === 'AVAILABLE' || s === 'OPERATIVE' || s === '1') return 'AVAILABLE';
  if (s === 'INUSE' || s === 'IN_USE' || s === 'OCCUPIED' || s === '2') return 'OCCUPIED';
  if (s === 'UNAVAILABLE' || s === 'UNREACHABLE' || s === 'UNKNOWN' || s === '0') return 'UNREACHABLE';
  if (s === 'FAULTED' || s === 'FAULT' || s === '3') return 'FAULTED';
  return 'UNREACHABLE';
}

export async function syncStationStatuses(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  try {
    const client = new ChargePointClient(env);
    const apiStatuses = await client.getStationStatus();

    // Get current DB stations for comparison
    const dbResult = await getAllStations(env.DB);
    const dbStations = new Map(
      (dbResult.results as any[])?.map(s => [s.charger_id, s]) || []
    );

    for (const apiStation of apiStatuses) {
      const chargerId = apiStation.stationId;
      if (!chargerId) continue;

      const newStatus = normalizeStatus(apiStation.status);
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
      error_message: error.message?.substring(0, 500),
      started_at: startedAt,
    });
    console.error('Station sync failed:', error);
  }
}
