CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agenda_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth_users(id),
  specialty VARCHAR(100) NOT NULL,
  license_number VARCHAR(60) NOT NULL,
  office VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agenda_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES agenda_doctors(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS agenda_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth_users(id),
  doctor_id UUID NOT NULL REFERENCES agenda_doctors(id),
  slot_id UUID NOT NULL UNIQUE REFERENCES agenda_availability_slots(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'rescheduled', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id),
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  subject VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS record_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES agenda_appointments(id),
  patient_id UUID NOT NULL REFERENCES auth_users(id),
  doctor_id UUID NOT NULL REFERENCES auth_users(id),
  summary TEXT NOT NULL,
  prescription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO auth_users (name, email, password_hash, role)
VALUES
  ('Dra. Ana Morales', 'ana.doctor@demo.com', 'demo-password', 'doctor'),
  ('Luis Perez', 'luis.paciente@demo.com', 'demo-password', 'patient')
ON CONFLICT (email) DO NOTHING;

INSERT INTO agenda_doctors (user_id, specialty, license_number, office)
SELECT id, 'Medicina general', 'COL-12345', 'Clinica Central 204'
FROM auth_users
WHERE email = 'ana.doctor@demo.com'
ON CONFLICT (user_id) DO NOTHING;

