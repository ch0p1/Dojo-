// src/services/events.service.js
const pool = require('../db/connection');
const { generarSlug } = require('../utils/slug');

async function listar({ ciudad, disciplina, page = 1, limit = 20 }) {
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));
  const lim    = Math.min(50, Math.max(1, parseInt(limit)));

  const params = [];
  let where    = "WHERE e.activo = TRUE AND e.fecha >= NOW() - INTERVAL '1 day'";

  if (ciudad) {
    params.push(ciudad.toLowerCase());
    where += ` AND LOWER(e.ciudad) = $${params.length}`;
  }
  if (disciplina) {
    params.push(`%${disciplina.toLowerCase()}%`);
    where += ` AND LOWER(e.disciplina) LIKE $${params.length}`;
  }

  const countRes = await pool.query(`SELECT COUNT(*) FROM events e ${where}`, params);
  const total    = parseInt(countRes.rows[0].count);

  params.push(lim, offset);
  const result = await pool.query(
    `SELECT e.id, e.slug, e.nombre, e.disciplina, e.ciudad, e.fecha,
            e.organizador, e.whatsapp, e.poster_url, e.reglamento_url, e.descripcion
     FROM events e ${where}
     ORDER BY e.fecha ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    events: result.rows, total,
    page: parseInt(page), limit: lim,
    total_pages: Math.ceil(total / lim),
    has_next: offset + lim < total,
    has_prev: offset > 0,
  };
}

async function obtenerPorIdOSlug(idOrSlug) {
  const esUUID = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const campo  = esUUID ? 'e.id' : 'e.slug';
  const result = await pool.query(
    `SELECT e.*, u.nombre AS publicado_por
     FROM events e JOIN users u ON e.user_id = u.id
     WHERE ${campo} = $1 AND e.activo = TRUE`,
    [idOrSlug]
  );
  return result.rows[0] || null;
}

async function crear(userId, datos) {
  const { nombre, disciplina, ciudad, fecha, organizador,
          whatsapp, descripcion } = datos;

  if (!nombre || !disciplina || !ciudad || !fecha || !organizador || !whatsapp) {
    throw { status: 400, error: 'Faltan campos obligatorios' };
  }
  if (String(nombre).length > 200)
    throw { status: 400, error: 'Nombre demasiado largo (máx 200)' };

  const fechaDate = new Date(fecha);
  if (isNaN(fechaDate.getTime()))
    throw { status: 400, error: 'Fecha inválida' };

  const slugBase   = generarSlug(nombre + ' ' + ciudad);
  const existeSlug = await pool.query('SELECT id FROM events WHERE slug = $1', [slugBase]);
  const slug       = existeSlug.rows.length > 0 ? `${slugBase}-${Date.now()}` : slugBase;

  const result = await pool.query(
    `INSERT INTO events (user_id, slug, nombre, disciplina, ciudad, fecha,
       organizador, whatsapp, descripcion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [userId, slug,
     String(nombre).trim().slice(0,200),
     String(disciplina).trim(),
     String(ciudad).trim(),
     fechaDate,
     String(organizador).trim().slice(0,200),
     whatsapp.replace(/\D/g,'').slice(0,15),
     descripcion ? String(descripcion).trim().slice(0,3000) : null]
  );
  return result.rows[0];
}

module.exports = { listar, obtenerPorIdOSlug, crear };
