// src/db/setup.js
// ─────────────────────────────────────────────────────────────
//  Crea todas las tablas si no existen.
//  Ejecutar UNA VEZ: npm run db:setup
// ─────────────────────────────────────────────────────────────
require('dotenv').config();
const pool = require('./connection');

const SQL = `

-- ── Extensión UUID ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabla: users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  nombre          VARCHAR(255) NOT NULL,
  ciudad          VARCHAR(100),
  disciplinas     TEXT[]    DEFAULT '{}',
  horario_pref    VARCHAR(50),
  -- Plan de suscripción
  plan_activo     VARCHAR(50),   -- 'basic-personal' | 'basic-escuela' | 'premium' | NULL
  plan_expira     TIMESTAMPTZ,   -- NULL si no tiene plan
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: subscriptions (historial de pagos) ────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan             VARCHAR(50) NOT NULL,
  precio_cop       INTEGER NOT NULL,
  inicio           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira           TIMESTAMPTZ NOT NULL,
  referencia_pago  VARCHAR(255),   -- ID de transacción de Wompi
  estado           VARCHAR(50) DEFAULT 'activo',  -- 'activo' | 'vencido' | 'cancelado'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: trainers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre            VARCHAR(255) NOT NULL,
  foto_url          VARCHAR(500),
  disciplinas       TEXT[] DEFAULT '{}',
  whatsapp          VARCHAR(20) NOT NULL,
  ciudad            VARCHAR(100) NOT NULL,
  horarios          JSONB,         -- { lunes: ['mañana','noche'], martes: [...] }
  experiencia_anos  INTEGER DEFAULT 0,
  bio               TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: schools ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre        VARCHAR(255) NOT NULL,
  descripcion   TEXT,
  ciudad        VARCHAR(100) NOT NULL,
  direccion     VARCHAR(255),
  disciplinas   TEXT[] DEFAULT '{}',
  whatsapp      VARCHAR(20) NOT NULL,
  foto_url      VARCHAR(500),
  galeria_urls  TEXT[] DEFAULT '{}',
  horarios      JSONB,
  rating        NUMERIC(2,1) DEFAULT 0,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre       VARCHAR(255) NOT NULL,
  disciplina   VARCHAR(100) NOT NULL,
  ciudad       VARCHAR(100) NOT NULL,
  fecha        TIMESTAMPTZ NOT NULL,
  organizador  VARCHAR(255) NOT NULL,
  whatsapp     VARCHAR(20) NOT NULL,
  poster_url   VARCHAR(500),
  descripcion  TEXT,
  activo       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices para búsquedas frecuentes ────────────────────────
CREATE INDEX IF NOT EXISTS idx_trainers_ciudad   ON trainers(ciudad);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id  ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_activo   ON trainers(activo);

CREATE INDEX IF NOT EXISTS idx_schools_ciudad    ON schools(ciudad);
CREATE INDEX IF NOT EXISTS idx_schools_user_id   ON schools(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_activo    ON schools(activo);

CREATE INDEX IF NOT EXISTS idx_events_ciudad     ON events(ciudad);
CREATE INDEX IF NOT EXISTS idx_events_fecha      ON events(fecha);
CREATE INDEX IF NOT EXISTS idx_events_activo     ON events(activo);

CREATE INDEX IF NOT EXISTS idx_subs_user_id      ON subscriptions(user_id);
`;

async function setup() {
  try {
    await pool.query(SQL);
    console.log('✅  Tablas creadas correctamente');
    console.log('    users, subscriptions, trainers, schools, events');
  } catch (err) {
    console.error('❌  Error creando tablas:', err.message);
  } finally {
    await pool.end();
  }
}

setup();
