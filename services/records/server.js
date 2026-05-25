import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = process.env.PORT || 3004;
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

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

const requireDoctor = (req, res, next) => {
  if (!['doctor', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Solo medicos pueden registrar resultados' });
  return next();
};

app.get('/health', (_req, res) => res.json({ service: 'records', status: 'ok' }));

app.post('/api/records/results', authRequired, requireDoctor, async (req, res) => {
  const { patientId, appointmentId, summary, prescription } = req.body;
  if (!patientId || !summary) return res.status(400).json({ message: 'patientId y summary son obligatorios' });

  const result = await pool.query(
    `INSERT INTO record_results (appointment_id, patient_id, doctor_id, summary, prescription)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [appointmentId || null, patientId, req.user.id, summary, prescription || null]
  );
  res.status(201).json({ result: result.rows[0] });
});

app.get('/api/records/me', authRequired, async (req, res) => {
  const params = [req.user.id];
  const filter = req.user.role === 'patient' ? 'r.patient_id = $1' : 'r.doctor_id = $1';
  const result = await pool.query(
    `SELECT r.*, p.name AS patient_name, d.name AS doctor_name
     FROM record_results r
     JOIN auth_users p ON p.id = r.patient_id
     JOIN auth_users d ON d.id = r.doctor_id
     WHERE ${filter}
     ORDER BY r.created_at DESC`,
    params
  );
  res.json({ results: result.rows });
});

app.listen(port, () => console.log(`records-service listening on ${port}`));

