// src/services/schools.service.js
// ─────────────────────────────────────────────────────────────
//  Lógica de negocio de escuelas — separada del controller
//  El controller recibe/responde HTTP. El service decide qué hacer.
// ─────────────────────────────────────────────────────────────
const pool = require('../db/connection');
const { generarSlug } = require('../utils/slug');

const PLANES_CON_ESCUELA = ['basic-escuela', 'premium'];

// ── Listar con paginación y filtros ──────────────────────────
async function listar({ ciudad, disciplina, page = 1, limit = 20, orden = 'rating' }) {
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
  const lim    = Math.min(50, Math.max(1, parseInt(limit)));

  const params  = [];
  let where     = 'WHERE s.activo = TRUE';

  if (ciudad) {
    params.push(ciudad.toLowerCase());
    where += ` AND LOWER(s.ciudad) = $${params.length}`;
  }
  if (disciplina) {
    params.push(`%${disciplina.toLowerCase()}%`);
    where += ` AND LOWER(s.disciplinas::text) LIKE $${params.length}`;
  }

  const ordenMap = {
    rating:   's.rating DESC, s.created_at DESC',
    reciente: 's.created_at DESC',
    nombre:   's.nombre ASC',
  };
  const orderBy = ordenMap[orden] || ordenMap.rating;

  // Total sin paginación
  const countRes = await pool.query(
    `SELECT COUNT(*) FROM schools s ${where}`, params
  );
  const total = parseInt(countRes.rows[0].count);

  params.push(lim, offset);
  const result = await pool.query(
    `SELECT s.id, s.slug, s.nombre, s.descripcion, s.ciudad,
            s.disciplinas, s.whatsapp, s.foto_url, s.rating,
            s.horarios, s.galeria_urls, s.created_at
     FROM schools s ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    schools: result.rows,
    total,
    page:        parseInt(page),
    limit:       lim,
    total_pages: Math.ceil(total / lim),
    has_next:    offset + lim < total,
    has_prev:    offset > 0,
  };
}

// ── Detalle por ID o slug ────────────────────────────────────
async function obtenerPorIdOSlug(idOrSlug) {
  const esUUID = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const campo  = esUUID ? 's.id' : 's.slug';

  const result = await pool.query(
    `SELECT s.*, u.nombre AS publicado_por
     FROM schools s JOIN users u ON s.user_id = u.id
     WHERE ${campo} = $1 AND s.activo = TRUE`,
    [idOrSlug]
  );
  return result.rows[0] || null;
}

// ── Crear escuela ─────────────────────────────────────────────
async function crear(userId, esAdmin, planActivo, datos) {
  // Verificar permisos de plan
  if (!esAdmin) {
    if (!PLANES_CON_ESCUELA.includes(planActivo)) {
      throw { status: 403, error: 'Plan insuficiente',
              detalle: 'Necesitas plan Basic Escuela o Premium para publicar una escuela.' };
    }
    const count = await pool.query(
      'SELECT COUNT(*) FROM schools WHERE user_id = $1 AND activo = TRUE', [userId]
    );
    if (parseInt(count.rows[0].count) >= 1) {
      throw { status: 403, error: 'Límite alcanzado',
              detalle: 'Solo puedes publicar una escuela por cuenta.' };
    }
  }

  const { nombre, disciplinas, whatsapp, ciudad, descripcion,
          direccion, horarios, foto_url } = datos;

  if (!nombre || !whatsapp || !ciudad) {
    throw { status: 400, error: 'nombre, whatsapp y ciudad son obligatorios' };
  }

  // Generar slug único
  const slugBase   = generarSlug(nombre + ' ' + ciudad);
  const existeSlug = await pool.query('SELECT id FROM schools WHERE slug = $1', [slugBase]);
  const slug       = existeSlug.rows.length > 0 ? `${slugBase}-${Date.now()}` : slugBase;

  const result = await pool.query(
    `INSERT INTO schools
       (user_id, slug, nombre, descripcion, ciudad, direccion,
        disciplinas, whatsapp, foto_url, horarios)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [userId, slug,
     String(nombre).trim().slice(0, 255),
     descripcion ? String(descripcion).trim().slice(0, 3000) : null,
     String(ciudad).trim(),
     direccion  ? String(direccion).trim().slice(0, 255) : null,
     Array.isArray(disciplinas) ? disciplinas.slice(0, 10) : [],
     whatsapp.replace(/\D/g, '').slice(0, 15),
     foto_url || null,
     (horarios && typeof horarios === 'object') ? horarios : {}]
  );
  return result.rows[0];
}

module.exports = { listar, obtenerPorIdOSlug, crear };
