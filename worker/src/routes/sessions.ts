import { Hono } from 'hono';
import type { Env } from '../types';
import { getSessions } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

// GET /api/sessions - list sessions with pagination and filters
app.get('/', async (c) => {
  const station_charger_id = c.req.query('station');
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await getSessions(c.env.DB, {
    station_charger_id,
    start_date,
    end_date,
    limit: Math.min(limit, 200),
    offset,
  });

  return c.json({
    sessions: result.results || [],
    pagination: { limit, offset, count: result.results?.length || 0 },
  });
});

export default app;
