import { Hono } from 'hono';
import type { Env } from '../types';
import { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

// GET /api/maintenance - list all, optional ?status=open&issue_type=FAULTED
app.get('/', async (c) => {
  const status = c.req.query('status');
  const issue_type = c.req.query('issue_type');

  const result = await getMaintenanceLogs(c.env.DB, { status, issue_type });
  return c.json({ logs: result.results || [], total: result.results?.length || 0 });
});

// POST /api/maintenance - create new log
app.post('/', async (c) => {
  const body = await c.req.json<{
    station_charger_id: string;
    station_name?: string;
    issue_type: string;
    description?: string;
    assigned_to?: string;
  }>();

  if (!body.station_charger_id || !body.issue_type) {
    return c.json({ error: 'station_charger_id and issue_type are required' }, 400);
  }

  const validTypes = ['FAULTED', 'UNREACHABLE', 'DAMAGED', 'SCHEDULED', 'OTHER'];
  if (!validTypes.includes(body.issue_type)) {
    return c.json({ error: `issue_type must be one of: ${validTypes.join(', ')}` }, 400);
  }

  await createMaintenanceLog(c.env.DB, body);
  return c.json({ success: true }, 201);
});

// PUT /api/maintenance/:id - update status, notes, resolved_at
app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  const body = await c.req.json<{
    status?: string;
    notes?: string;
    resolved_at?: string;
    assigned_to?: string;
  }>();

  if (body.status) {
    const validStatuses = ['open', 'in_progress', 'resolved'];
    if (!validStatuses.includes(body.status)) {
      return c.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, 400);
    }
    // Auto-set resolved_at when marking resolved
    if (body.status === 'resolved' && !body.resolved_at) {
      body.resolved_at = new Date().toISOString();
    }
  }

  await updateMaintenanceLog(c.env.DB, id, body);
  return c.json({ success: true });
});

export default app;
