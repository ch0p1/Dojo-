// src/services/trainers.service.js
const pool = require('../db/connection');
const { generarSlug } = require('../utils/slug');

const LIMITE_TRAINERS = {
  'basic-personal': 1,
  'basic-escuela':  2,
  'premium':        2,
};

async function listar({ ciudad, disciplina, page = 1, limit = 20 }) {
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
  const lim    = Math.min(50, Math.max(1, parseInt(limit)));

  const params = [];
  let where    = 'WHERE t.activo = TRUE';

  if (ciudad) {
    params.push(ciudad.toLowerCase());
    where += ` AND LOWER(t.ciudad) = $${params.length}`;
  }
  if (disciplina) {
    params.push(`%${disciplina.toLowerCase()}%`);
    where += ` AND LOWER(t.disciplinas::text) LIKE $${params.length}`;
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM trainers t ${where}`, params
  );
  const total = parseInt(countRes.rows[0].count);

  params.push(lim, offset);
  const result = await pool.query(
    `SELECT t.id, t.slug, t.nombre, t.foto_url, t.disciplinas,
            t.whatsapp, t.ciudad, t.experiencia_anos, t.bio,
            t.horarios, u.nombre AS publicado_por
     FROM trainers t JOIN users u ON t.user_id = u.id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    trainers: result.rows, total,
    page: parseInt(page), limit: lim,
    total_pages: Math.ceil(total / lim),
    has_next: offset + lim < total,
    has_prev: offset > 0,
  };
}

async function obtenerPorIdOSlug(idOrSlug) {
  const esUUID = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const campo  = esUUID ? 't.id' : 't.slug';
  const result = await pool.query(
    `SELECT t.*, u.nombre AS publicado_por
     FROM trainers t JOIN users u ON t.user_id = u.id
     WHERE ${campo} = $1 AND t.activo = TRUE`,
    [idOrSlug]
  );
  return result.rows[0] || null;
}

async function crear(userId, esAdmin, planActivo, datos) {
  if (!esAdmin) {
    const limite = LIMITE_TRAINERS[planActivo] || 0;
    if (!limite) {
      throw { status: 403, error: 'Plan requerido',
              detalle: 'Necesitas un plan activo para publicar entrenadores.' };
    }
    const count = await pool.query(
      'SELECT COUNT(*) FROM trainers WHERE user_id = $1 AND activo = TRUE', [userId]
    );
    if (parseInt(count.rows[0].count) >= limite) {
      throw { status: 403, error: 'Límite alcanzado',
              detalle: `Tu plan permite máximo ${limite} entrenador(es).` };
    }
  }

  const { nombre, disciplinas, whatsapp, ciudad, experiencia_anos, bio, horarios } = datos;
  if (!nombre || !whatsapp || !ciudad) {
    throw { status: 400, error: 'nombre, whatsapp y ciudad son obligatorios' };
  }
  if (String(nombre).length > 150)      throw { status: 400, error: 'Nombre demasiado largo' };
  if (bio && String(bio).length > 2000) throw { status: 400, error: 'Bio demasiado larga' };

  const slugBase   = generarSlug(nombre + ' ' + ciudad);
  const existeSlug = await pool.query('SELECT id FROM trainers WHERE slug = $1', [slugBase]);
  const slug       = existeSlug.rows.length > 0 ? `${slugBase}-${Date.now()}` : slugBase;

  const anosNum = Math.min(70, Math.max(0, parseInt(experiencia_anos) || 0));
  const discSan = Array.isArray(disciplinas)
    ? disciplinas.slice(0, 10).map(d => String(d).trim().slice(0, 50)).filter(Boolean)
    : [];

  const result = await pool.query(
    `INSERT INTO trainers
       (user_id, slug, nombre, disciplinas, whatsapp, ciudad,
        experiencia_anos, bio, horarios)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [userId, slug,
     String(nombre).trim().slice(0, 150),
     discSan,
     whatsapp.replace(/\D/g,'').slice(0,15),
     String(ciudad).trim().slice(0,100),
     anosNum,
     bio ? String(bio).trim().slice(0,2000) : null,
     (horarios && typeof horarios === 'object') ? horarios : {}]
  );
  return result.rows[0];
}

module.exports = { listar, obtenerPorIdOSlug, crear };
