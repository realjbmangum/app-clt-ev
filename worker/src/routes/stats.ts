import { Hono } from 'hono';
import type { Env } from '../types';
import { getAggregateStats, getUtilizationStats, getEnergyStats } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

// GET /api/stats - aggregate KPIs
app.get('/', async (c) => {
  const stats = await getAggregateStats(c.env.DB);
  return c.json(stats);
});

// GET /api/stats/utilization - top/bottom stations, heatmap, trends
app.get('/utilization', async (c) => {
  const stats = await getUtilizationStats(c.env.DB);
  return c.json(stats);
});

// GET /api/stats/energy - kWh and cost over time
app.get('/energy', async (c) => {
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');
  const stats = await getEnergyStats(c.env.DB, { start_date, end_date });
  return c.json(stats);
});

export default app;
