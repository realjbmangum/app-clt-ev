import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import stationRoutes from './routes/stations';
import sessionRoutes from './routes/sessions';
import statsRoutes from './routes/stats';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import maintenanceRoutes from './routes/maintenance';

import { syncStationStatuses, mapStationIds } from './sync/station-sync';
import { syncChargingSessions } from './sync/session-sync';
import { aggregateEnergyReadings } from './sync/energy-aggregator';

const app = new Hono<{ Bindings: Env }>();

// CORS for dashboard frontend
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/stations', stationRoutes);
app.route('/api/sessions', sessionRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api/auth', authRoutes);
app.route('/api', adminRoutes);
app.route('/api/maintenance', maintenanceRoutes);

// Manual sync triggers
app.post('/api/sync/stations', async (c) => {
  await syncStationStatuses(c.env);
  return c.json({ triggered: 'station_status' });
});
// Debug: raw SOAP test
app.get('/api/debug/soap-test', async (c) => {
  const { ChargePointClient } = await import('./sync/chargepoint');
  const client = new ChargePointClient(c.env);
  try {
    const result = await client.getStationStatus();
    return c.json({ count: result.length, sample: result.slice(0, 3) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
app.get('/api/debug/stations-map', async (c) => {
  const { ChargePointClient } = await import('./sync/chargepoint');
  const client = new ChargePointClient(c.env);
  try {
    const xml = await client.debugRawResponse('getStations', `<tns:getStations>
      <tns:searchQuery></tns:searchQuery>
    </tns:getStations>`);
    return c.text(xml.substring(0, 8000));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
app.get('/api/debug/soap-raw', async (c) => {
  const { ChargePointClient } = await import('./sync/chargepoint');
  const client = new ChargePointClient(c.env);
  try {
    const xml = await client.debugRawResponse('getStationStatus', `<tns:getStationStatus>
      <tns:searchQuery><tns:orgID></tns:orgID></tns:searchQuery>
    </tns:getStationStatus>`);
    return c.text(xml.substring(0, 5000));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
app.post('/api/sync/sessions', async (c) => {
  await syncChargingSessions(c.env);
  return c.json({ triggered: 'charging_sessions' });
});
app.post('/api/sync/map-ids', async (c) => {
  const result = await mapStationIds(c.env);
  return c.json(result);
});
app.post('/api/sync/energy', async (c) => {
  await aggregateEnergyReadings(c.env);
  return c.json({ triggered: 'energy_aggregation' });
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default {
  fetch: app.fetch,

  // Scheduled handler for cron jobs
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cron = event.cron;

    switch (cron) {
      // Every 15 minutes: sync station statuses
      case '*/15 * * * *':
        ctx.waitUntil(syncStationStatuses(env));
        break;

      // Every hour: sync charging sessions
      case '0 * * * *':
        ctx.waitUntil(syncChargingSessions(env));
        break;

      // Daily at 6 AM: aggregate energy readings
      case '0 6 * * *':
        ctx.waitUntil(aggregateEnergyReadings(env));
        break;
    }
  },
};
