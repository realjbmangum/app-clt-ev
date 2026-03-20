import { Hono } from 'hono';
import type { Env } from '../types';
import { getAllStations, getStationById, getRecentSessionsForStation, getDistinctOrgs } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

// GET /api/stations - list all stations with optional filters
app.get('/', async (c) => {
  const status = c.req.query('status');
  const org = c.req.query('org');
  const is_public = c.req.query('is_public');

  const result = await getAllStations(c.env.DB, { status, org, is_public });
  return c.json({ stations: result.results, total: result.results?.length || 0 });
});

// GET /api/stations/orgs - distinct org names for filters
app.get('/orgs', async (c) => {
  const result = await getDistinctOrgs(c.env.DB);
  return c.json({ orgs: result.results?.map((r: any) => r.org_name) || [] });
});

// GET /api/stations/:id - station detail with recent sessions
app.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid station ID' }, 400);

  const station = await getStationById(c.env.DB, id);
  if (!station) return c.json({ error: 'Station not found' }, 404);

  const sessions = await getRecentSessionsForStation(c.env.DB, (station as any).charger_id);

  return c.json({ station, recent_sessions: sessions.results || [] });
});

export default app;
