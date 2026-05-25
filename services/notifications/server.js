import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = process.env.PORT || 3003;
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const internalToken = process.env.INTERNAL_TOKEN || 'internal-dev-token';

app.use(express.json());

const authRequired = async (req, res, next) => {
  try {
    const response = await fetch(`${authServiceUrl}/internal/verify`, {
      headers: { Authorization: req.headers.authorization || '' }
    });
    if (!response.ok) return res.status(401).json({ message: 'Token invalido' });
    const { user } = await response.json();
    req.user = user;
    return next();
  } catch {
    return res.status(503).json({ message: 'No se pudo validar el token' });
  }
};

app.get('/health', (_req, res) => res.json({ service: 'notifications', status: 'ok' }));

app.post('/internal/notifications', async (req, res) => {
  if (req.headers['x-internal-token'] !== internalToken) return res.status(401).json({ message: 'Canal interno no autorizado' });
  const { userId, subject, body, channel = 'in_app' } = req.body;
  if (!userId || !subject || !body) return res.status(400).json({ message: 'userId, subject y body son obligatorios' });

  const result = await pool.query(
    `INSERT INTO notification_messages (user_id, subject, body, channel)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, subject, body, channel]
  );
  res.status(201).json({ notification: result.rows[0] });
});

app.get('/api/notifications/me', authRequired, async (req, res) => {
  const result = await pool.query(
    `SELECT id, channel, subject, body, status, created_at
     FROM notification_messages
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ notifications: result.rows });
});

app.patch('/api/notifications/:id/read', authRequired, async (req, res) => {
  const result = await pool.query(
    `UPDATE notification_messages SET status = 'read'
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Notificacion no encontrada' });
  res.json({ notification: result.rows[0] });
});

app.listen(port, () => console.log(`notifications-service listening on ${port}`));

