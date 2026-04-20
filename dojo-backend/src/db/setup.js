// src/db/setup.js — v2
require('dotenv').config();
const pool = require('./connection');

const SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  nombre            VARCHAR(150) NOT NULL,
  ciudad            VARCHAR(100),
  disciplinas       TEXT[]    DEFAULT '{}',
  horario_pref      VARCHAR(50),
  plan_activo       VARCHAR(50),
  plan_expira       TIMESTAMPTZ,
  email_verificado  BOOLEAN DEFAULT FALSE,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── verification_tokens ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  usado      BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vtokens_token   ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_vtokens_user_id ON verification_tokens(user_id);

-- ── subscriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan             VARCHAR(50) NOT NULL,
  precio_cop       INTEGER NOT NULL,
  inicio           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira           TIMESTAMPTZ NOT NULL,
  referencia_pago  VARCHAR(255) UNIQUE, -- UNIQUE previene doble activación
  estado           VARCHAR(50) DEFAULT 'activo',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
-- Índice para búsqueda rápida de referencia en webhook
CREATE INDEX IF NOT EXISTS idx_subs_referencia ON subscriptions(referencia_pago);

-- ── trainers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trainers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug              VARCHAR(100) UNIQUE,
  nombre            VARCHAR(150) NOT NULL,
  foto_url          VARCHAR(500),
  disciplinas       TEXT[] DEFAULT '{}',
  whatsapp          VARCHAR(15) NOT NULL,
  ciudad            VARCHAR(100) NOT NULL,
  horarios          JSONB DEFAULT '{}',
  experiencia_anos  INTEGER DEFAULT 0 CHECK (experiencia_anos >= 0 AND experiencia_anos <= 70),
  bio               TEXT,
  activo            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trainers_ciudad   ON trainers(ciudad);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id  ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainers_activo   ON trainers(activo);
CREATE INDEX IF NOT EXISTS idx_trainers_slug     ON trainers(slug);

-- ── schools ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug          VARCHAR(100) UNIQUE,
  nombre        VARCHAR(255) NOT NULL,
  descripcion   TEXT,
  ciudad        VARCHAR(100) NOT NULL,
  direccion     VARCHAR(255),
  disciplinas   TEXT[] DEFAULT '{}',
  whatsapp      VARCHAR(15) NOT NULL,
  foto_url      VARCHAR(500),
  galeria_urls  TEXT[] DEFAULT '{}',
  horarios      JSONB DEFAULT '{}',
  rating        NUMERIC(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_resenas INTEGER DEFAULT 0,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schools_ciudad    ON schools(ciudad);
CREATE INDEX IF NOT EXISTS idx_schools_user_id   ON schools(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_activo    ON schools(activo);
CREATE INDEX IF NOT EXISTS idx_schools_slug      ON schools(slug);

-- ── events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug            VARCHAR(100) UNIQUE,
  nombre          VARCHAR(200) NOT NULL,
  disciplina      VARCHAR(100) NOT NULL,
  ciudad          VARCHAR(100) NOT NULL,
  fecha           TIMESTAMPTZ NOT NULL,
  organizador     VARCHAR(200) NOT NULL,
  whatsapp        VARCHAR(15) NOT NULL,
  poster_url      VARCHAR(500),
  reglamento_url  VARCHAR(500),
  descripcion     TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_ciudad  ON events(ciudad);
CREATE INDEX IF NOT EXISTS idx_events_fecha   ON events(fecha);
CREATE INDEX IF NOT EXISTS idx_events_activo  ON events(activo);
CREATE INDEX IF NOT EXISTS idx_events_slug    ON events(slug);

-- ── reviews ──────────────────────────────────────────────────
-- Modelo claro de reseñas: quién, a qué, qué calificación, verificado?
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Referencia polimórfica: exactamente uno de los dos debe ser NOT NULL
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  trainer_id    UUID REFERENCES trainers(id) ON DELETE CASCADE,
  calificacion  SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario    TEXT,
  verificado    BOOLEAN DEFAULT FALSE, -- true = admin aprobó o comprobó asistencia
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- Un usuario solo puede dejar 1 reseña por entidad
  CONSTRAINT una_resena_por_usuario_escuela  UNIQUE (user_id, school_id),
  CONSTRAINT una_resena_por_usuario_trainer  UNIQUE (user_id, trainer_id),
  -- Al menos uno de los dos debe estar presente
  CONSTRAINT review_debe_tener_objetivo CHECK (
    (school_id IS NOT NULL AND trainer_id IS NULL) OR
    (school_id IS NULL   AND trainer_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_reviews_school_id   ON reviews(school_id)  WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_trainer_id  ON reviews(trainer_id) WHERE activo = TRUE;

-- ── Migraciones seguras para BDs existentes ──────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
-- Usuarios existentes quedan verificados para no romper acceso actual
UPDATE users SET email_verificado = TRUE WHERE email_verificado = FALSE OR email_verificado IS NULL;
ALTER TABLE schools     ADD COLUMN IF NOT EXISTS slug         VARCHAR(100);
ALTER TABLE schools     ADD COLUMN IF NOT EXISTS total_resenas INTEGER DEFAULT 0;
ALTER TABLE trainers    ADD COLUMN IF NOT EXISTS slug         VARCHAR(100);
ALTER TABLE events      ADD COLUMN IF NOT EXISTS slug         VARCHAR(100);
ALTER TABLE events      ADD COLUMN IF NOT EXISTS reglamento_url VARCHAR(500);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(255);

-- Crear índice único en referencia_pago solo si no existe (idempotencia pagos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_referencia_unique
  ON subscriptions(referencia_pago) WHERE referencia_pago IS NOT NULL;

-- Índice slug en tablas existentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_slug_unique  ON schools(slug)  WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainers_slug_unique ON trainers(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique   ON events(slug)   WHERE slug IS NOT NULL;
`;

async function setup() {
  try {
    await pool.connect();
    console.log('✅  PostgreSQL conectado correctamente');
    await pool.query(SQL);
    console.log('✅  Tablas creadas correctamente');
    console.log('    users, subscriptions, trainers, schools, events, reviews');
  } catch (err) {
    console.error('❌  Error creando tablas:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
setup();
