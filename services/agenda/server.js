import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = process.env.PORT || 3002;
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const notificationsServiceUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3003';
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

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Permisos insuficientes' });
  return next();
};

const notify = async (userId, subject, body) => {
  try {
    await fetch(`${notificationsServiceUrl}/internal/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
      body: JSON.stringify({ userId, subject, body })
    });
  } catch (error) {
    console.warn('notification failed', error.message);
  }
};

app.get('/health', (_req, res) => res.json({ service: 'agenda', status: 'ok' }));

app.get('/api/agenda/doctors', async (_req, res) => {
  const result = await pool.query(`
    SELECT d.id, d.specialty, d.license_number, d.office, u.name, u.email
    FROM agenda_doctors d
    JOIN auth_users u ON u.id = d.user_id
    ORDER BY u.name
  `);
  res.json({ doctors: result.rows });
});

app.post('/api/agenda/doctors', authRequired, requireRole('doctor', 'admin'), async (req, res) => {
  const { specialty, licenseNumber, office } = req.body;
  if (!specialty || !licenseNumber || !office) return res.status(400).json({ message: 'specialty, licenseNumber y office son obligatorios' });

  try {
    const result = await pool.query(
      `INSERT INTO agenda_doctors (user_id, specialty, license_number, office)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET specialty = EXCLUDED.specialty, license_number = EXCLUDED.license_number, office = EXCLUDED.office
       RETURNING *`,
      [req.user.id, specialty, licenseNumber, office]
    );
    res.status(201).json({ doctor: result.rows[0] });
  } catch {
    res.status(500).json({ message: 'No se pudo guardar el perfil medico' });
  }
});

app.post('/api/agenda/availability', authRequired, requireRole('doctor', 'admin'), async (req, res) => {
  const { startsAt, endsAt } = req.body;
  const doctor = await pool.query('SELECT id FROM agenda_doctors WHERE user_id = $1', [req.user.id]);
  if (!doctor.rows[0]) return res.status(404).json({ message: 'Primero registra el perfil medico' });

  const result = await pool.query(
    `INSERT INTO agenda_availability_slots (doctor_id, starts_at, ends_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [doctor.rows[0].id, startsAt, endsAt]
  );
  res.status(201).json({ slot: result.rows[0] });
});

app.get('/api/agenda/doctors/:doctorId/availability', async (req, res) => {
  const result = await pool.query(
    `SELECT id, doctor_id, starts_at, ends_at, status
     FROM agenda_availability_slots
     WHERE doctor_id = $1 AND status = 'available' AND starts_at > now()
     ORDER BY starts_at`,
    [req.params.doctorId]
  );
  res.json({ slots: result.rows });
});

app.post('/api/agenda/appointments', authRequired, requireRole('patient', 'admin'), async (req, res) => {
  const { doctorId, slotId, reason } = req.body;
  if (!doctorId || !slotId || !reason) return res.status(400).json({ message: 'doctorId, slotId y reason son obligatorios' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slot = await client.query(
      `SELECT id FROM agenda_availability_slots
       WHERE id = $1 AND doctor_id = $2 AND status = 'available'
       FOR UPDATE`,
      [slotId, doctorId]
    );
    if (!slot.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'El horario ya no esta disponible' });
    }
    const appointment = await client.query(
      `INSERT INTO agenda_appointments (patient_id, doctor_id, slot_id, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, doctorId, slotId, reason]
    );
    await client.query(`UPDATE agenda_availability_slots SET status = 'booked' WHERE id = $1`, [slotId]);
    await client.query('COMMIT');

    await notify(req.user.id, 'Cita agendada', 'Tu cita medica fue agendada correctamente.');
    res.status(201).json({ appointment: appointment.rows[0] });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'No se pudo agendar la cita' });
  } finally {
    client.release();
  }
});

app.get('/api/agenda/appointments/me', authRequired, async (req, res) => {
  let query = `
    SELECT a.*, u.name AS patient_name, du.name AS doctor_name, s.starts_at, s.ends_at
    FROM agenda_appointments a
    JOIN auth_users u ON u.id = a.patient_id
    JOIN agenda_doctors d ON d.id = a.doctor_id
    JOIN auth_users du ON du.id = d.user_id
    JOIN agenda_availability_slots s ON s.id = a.slot_id
  `;
  const params = [];

  if (req.user.role === 'patient') {
    query += ' WHERE a.patient_id = $1';
    params.push(req.user.id);
  } else if (req.user.role === 'doctor') {
    query += ' WHERE d.user_id = $1';
    params.push(req.user.id);
  }
  query += ' ORDER BY s.starts_at DESC';
  const result = await pool.query(query, params);
  res.json({ appointments: result.rows });
});

app.patch('/api/agenda/appointments/:id', authRequired, async (req, res) => {
  const { reason, status, slotId } = req.body;
  if (status && !['scheduled', 'rescheduled', 'cancelled', 'completed'].includes(status)) return res.status(400).json({ message: 'Estado invalido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT a.*, d.user_id AS doctor_user_id
       FROM agenda_appointments a
       JOIN agenda_doctors d ON d.id = a.doctor_id
       WHERE a.id = $1 AND (a.patient_id = $2 OR d.user_id = $2)
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    const appointment = current.rows[0];
    if (!appointment) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    let nextStatus = status || appointment.status;
    if (slotId && slotId !== appointment.slot_id) {
      const nextSlot = await client.query(
        `SELECT id FROM agenda_availability_slots
         WHERE id = $1 AND doctor_id = $2 AND status = 'available'
         FOR UPDATE`,
        [slotId, appointment.doctor_id]
      );
      if (!nextSlot.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'El nuevo horario no esta disponible' });
      }
      await client.query(`UPDATE agenda_availability_slots SET status = 'available' WHERE id = $1`, [appointment.slot_id]);
      await client.query(`UPDATE agenda_availability_slots SET status = 'booked' WHERE id = $1`, [slotId]);
      nextStatus = 'rescheduled';
    }

    const result = await client.query(
      `UPDATE agenda_appointments
       SET reason = COALESCE($1, reason),
           status = $2,
           slot_id = COALESCE($3, slot_id),
           updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [reason, nextStatus, slotId || null, req.params.id]
    );
    await client.query('COMMIT');

    if (slotId && slotId !== appointment.slot_id) {
      await notify(appointment.patient_id, 'Cita reprogramada', 'Tu cita medica fue reprogramada correctamente.');
    }
    res.json({ appointment: result.rows[0] });
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'No se pudo modificar la cita' });
  } finally {
    client.release();
  }
});

app.delete('/api/agenda/appointments/:id', authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE agenda_appointments
       SET status = 'cancelled', updated_at = now()
       WHERE id = $1 AND (patient_id = $2 OR EXISTS (
         SELECT 1 FROM agenda_doctors d WHERE d.id = doctor_id AND d.user_id = $2
       ))
       RETURNING slot_id, patient_id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cita no encontrada' });
    }
    await client.query(`UPDATE agenda_availability_slots SET status = 'available' WHERE id = $1`, [result.rows[0].slot_id]);
    await client.query('COMMIT');
    await notify(result.rows[0].patient_id, 'Cita cancelada', 'Tu cita medica fue cancelada.');
    res.status(204).send();
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'No se pudo cancelar la cita' });
  } finally {
    client.release();
  }
});

app.listen(port, () => console.log(`agenda-service listening on ${port}`));
