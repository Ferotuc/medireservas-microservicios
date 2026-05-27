import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const port = process.env.PORT || 3001;
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

const base64url = (value) => Buffer.from(value).toString('base64url');
const sign = (payload) => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }));
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('Malformed token');
  const expected = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired token');
  return payload;
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
};

const checkPassword = (password, storedHash) => {
  if (storedHash === 'demo-password') return password === 'Demo123!';
  const [salt, hash] = storedHash.split(':');
  const candidate = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
};

const authRequired = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalido o expirado' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Permisos insuficientes' });
  return next();
};

const ensureDoctorProfile = async (user) => {
  if (user.role !== 'doctor') return;
  await pool.query(
    `INSERT INTO agenda_doctors (user_id, specialty, license_number, office)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO NOTHING`,
    [user.id, 'Medicina general', `PEND-${user.id.slice(0, 8)}`, 'Consultorio por definir']
  );
};

app.get('/health', (_req, res) => res.json({ service: 'auth', status: 'ok' }));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role = 'patient' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email y password son obligatorios' });
  if (!['patient', 'doctor', 'admin'].includes(role)) return res.status(400).json({ message: 'Rol invalido' });

  try {
    const result = await pool.query(
      'INSERT INTO auth_users (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashPassword(password), role]
    );
    const user = result.rows[0];
    await ensureDoctorProfile(user);
    res.status(201).json({ user, token: sign(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'El correo ya esta registrado' });
    res.status(500).json({ message: 'Error registrando usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email y password son obligatorios' });

  const result = await pool.query('SELECT id, name, email, role, password_hash FROM auth_users WHERE email = lower($1)', [email]);
  const user = result.rows[0];
  if (!user || !checkPassword(password, user.password_hash)) return res.status(401).json({ message: 'Credenciales invalidas' });

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ user: safeUser, token: sign(safeUser) });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, role, created_at FROM auth_users WHERE id = $1', [req.user.id]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json({ user: result.rows[0] });
});

app.get('/api/auth/users', authRequired, requireRole('doctor', 'admin'), async (req, res) => {
  const { role = 'patient' } = req.query;
  if (!['patient', 'doctor', 'admin'].includes(role)) return res.status(400).json({ message: 'Rol invalido' });

  const result = await pool.query(
    'SELECT id, name, email, role, created_at FROM auth_users WHERE role = $1 ORDER BY created_at DESC',
    [role]
  );
  res.json({ users: result.rows });
});

app.post('/api/auth/users', authRequired, requireRole('doctor', 'admin'), async (req, res) => {
  const { name, email, password, role = 'patient' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email y password son obligatorios' });
  if (!['patient', 'doctor', 'admin'].includes(role)) return res.status(400).json({ message: 'Rol invalido' });

  try {
    const result = await pool.query(
      'INSERT INTO auth_users (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashPassword(password), role]
    );
    await ensureDoctorProfile(result.rows[0]);
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'El correo ya esta registrado' });
    res.status(500).json({ message: 'Error creando usuario' });
  }
});

app.get('/internal/verify', authRequired, (req, res) => res.json({ user: req.user }));

app.listen(port, () => console.log(`auth-service listening on ${port}`));
