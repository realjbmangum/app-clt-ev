import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import stationRoutes from './routes/stations';
import sessionRoutes from './routes/sessions';
import statsRoutes from './routes/stats';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

import { syncStationStatuses } from './sync/station-sync';
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
