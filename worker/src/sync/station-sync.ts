import type { Env } from '../types';
import { ChargePointClient } from './chargepoint';
import { updateStationStatus, insertStatusChange, logSync } from '../db/queries';

// Map ChargePoint status values to our format
function normalizeStatus(cpStatus: string): string {
  const s = cpStatus.toUpperCase().trim();
  if (s === 'AVAILABLE') return 'AVAILABLE';
  if (s === 'INUSE' || s === 'IN USE') return 'OCCUPIED';
  if (s === 'UNREACHABLE' || s === 'UNKNOWN') return 'UNREACHABLE';
  if (s === 'FAULTED' || s === 'FAULT') return 'FAULTED';
  return 'UNREACHABLE';
}

export async function syncStationStatuses(env: Env): Promise<void> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  try {
    const client = new ChargePointClient(env);
    const apiStatuses = await client.getStationStatus();

    // Build a map of chargepoint_station_id -> status from DB
    const dbResult = await env.DB.prepare(
      'SELECT id, charger_id, evse_name, station_status, chargepoint_station_id FROM stations'
    ).all();

    // Map by chargepoint_station_id if available, otherwise by evse_name
    const byStationId = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const s of (dbResult.results || []) as any[]) {
      if (s.chargepoint_station_id) {
        byStationId.set(s.chargepoint_station_id, s);
      }
      if (s.evse_name) {
        byName.set(s.evse_name.toUpperCase(), s);
      }
    }

    for (const apiStation of apiStatuses) {
      const cpStationId = apiStation.stationId;
      const newStatus = normalizeStatus(apiStation.status);
      if (!cpStationId) continue;

      // Try to match by stored chargepoint_station_id first
      let dbStation = byStationId.get(cpStationId);

      if (dbStation) {
        // Found match — update status if changed
        if (dbStation.station_status !== newStatus) {
          await insertStatusChange(env.DB, dbStation.charger_id, dbStation.station_status || 'UNKNOWN', newStatus);
          await updateStationStatus(env.DB, dbStation.charger_id, newStatus);
        }
        processed++;
      }
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

// One-time function to map ChargePoint station IDs to our DB stations
export async function mapStationIds(env: Env): Promise<{ mapped: number; unmapped: number }> {
  const client = new ChargePointClient(env);
  const xml = await client.debugRawResponse('getStations', `<tns:getStations>
    <tns:searchQuery></tns:searchQuery>
  </tns:getStations>`);

  // Extract station data blocks
  const stationBlocks = xml.match(/<stationData>[\s\S]*?<\/stationData>/gi) || [];

  // Get tag value helper
  const getVal = (block: string, tag: string): string | null => {
    const regex = new RegExp(`<(?:[a-z]+:)?${tag}[^>]*>([^<]*)<\\/(?:[a-z]+:)?${tag}>`, 'i');
    const m = block.match(regex);
    return m ? m[1].trim() : null;
  };

  // Get all port names for each station
  const getPortNames = (block: string): string[] => {
    const names: string[] = [];
    const portBlocks = block.match(/<Port>[\s\S]*?<\/Port>/gi) || [];
    for (const p of portBlocks) {
      const name = getVal(p, 'stationName');
      if (name) names.push(name.toUpperCase());
    }
    return names;
  };

  // Load all DB stations
  const dbResult = await env.DB.prepare('SELECT id, charger_id, evse_name FROM stations').all();
  const dbByName = new Map<string, any>();
  for (const s of (dbResult.results || []) as any[]) {
    if (s.evse_name) {
      dbByName.set(s.evse_name.toUpperCase(), s);
    }
  }

  let mapped = 0;
  let unmapped = 0;

  // Add chargepoint_station_id column if not exists
  try {
    await env.DB.prepare('ALTER TABLE stations ADD COLUMN chargepoint_station_id TEXT').run();
  } catch {
    // Column already exists
  }

  for (const block of stationBlocks) {
    const cpStationId = getVal(block, 'stationID');
    if (!cpStationId) continue;

    const portNames = getPortNames(block);
    let matched = false;

    for (const name of portNames) {
      const dbStation = dbByName.get(name);
      if (dbStation) {
        await env.DB.prepare(
          'UPDATE stations SET chargepoint_station_id = ? WHERE id = ?'
        ).bind(cpStationId, dbStation.id).run();
        mapped++;
        matched = true;
        break;
      }
    }

    if (!matched) unmapped++;
  }

  return { mapped, unmapped };
}
