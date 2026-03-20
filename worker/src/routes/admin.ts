import { Hono } from 'hono';
import type { Env } from '../types';
import { getUsers, createUser, updateUser, getSyncLogs } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

// GET /api/users - list all users (without password hashes)
app.get('/users', async (c) => {
  const result = await getUsers(c.env.DB);
  return c.json({ users: result.results || [] });
});

// POST /api/users - create a new user
app.post('/users', async (c) => {
  const body = await c.req.json<{ email: string; name: string; role: string; password: string }>();
  if (!body.email || !body.name || !body.role || !body.password) {
    return c.json({ error: 'email, name, role, and password are required' }, 400);
  }

  const validRoles = ['admin', 'operations', 'finance', 'leadership'];
  if (!validRoles.includes(body.role)) {
    return c.json({ error: `role must be one of: ${validRoles.join(', ')}` }, 400);
  }

  // Hash password with SHA-256
  const data = new TextEncoder().encode(body.password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const password_hash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  try {
    await createUser(c.env.DB, { email: body.email, name: body.name, role: body.role, password_hash });
    return c.json({ success: true }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return c.json({ error: 'Email already exists' }, 409);
    }
    throw e;
  }
});

// PUT /api/users/:id - update user
app.put('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid user ID' }, 400);

  const body = await c.req.json<{ name?: string; role?: string; is_active?: boolean }>();
  await updateUser(c.env.DB, id, body);
  return c.json({ success: true });
});

// GET /api/sync-logs - recent sync logs
app.get('/sync-logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const result = await getSyncLogs(c.env.DB, Math.min(limit, 200));
  return c.json({ logs: result.results || [] });
});

export default app;
