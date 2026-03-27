// src/controllers/events.controller.js
const pool = require('../db/connection');

// ── GET /events — listado público ────────────────────────────
async function listar(req, res) {
  const { ciudad, disciplina } = req.query;
  let query = `
    SELECT e.id, e.nombre, e.disciplina, e.ciudad, e.fecha,
           e.organizador, e.whatsapp, e.poster_url, e.descripcion
    FROM events e
    WHERE e.activo = TRUE AND e.fecha >= NOW() - INTERVAL '1 day'
  `;
  const params = [];
  if (ciudad) { params.push(ciudad); query += ` AND LOWER(e.ciudad) = LOWER($${params.length})`; }
  if (disciplina) { params.push(`%${disciplina}%`); query += ` AND LOWER(e.disciplina) LIKE LOWER($${params.length})`; }
  query += ' ORDER BY e.fecha ASC';
  try {
    const result = await pool.query(query, params);
    res.json({ events: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('Error listando eventos:', err.message);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
}

// ── GET /events/:id — detalle ────────────────────────────────
async function detalle(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.*, u.nombre AS publicado_por
       FROM events e JOIN users u ON e.user_id = u.id
       WHERE e.id = $1 AND e.activo = TRUE`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al obtener evento' }); }
}

// ── POST /events — crear ──────────────────────────────────────
async function crear(req, res) {
  const { nombre, disciplina, ciudad, fecha, organizador, whatsapp, descripcion } = req.body;
  if (!nombre || !disciplina || !ciudad || !fecha || !organizador || !whatsapp) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Validaciones de longitud
  if (String(nombre).length > 200)        return res.status(400).json({ error: 'Nombre demasiado largo (máx 200)' });
  if (String(organizador).length > 200)   return res.status(400).json({ error: 'Organizador demasiado largo (máx 200)' });
  if (descripcion && String(descripcion).length > 3000) return res.status(400).json({ error: 'Descripción demasiado larga (máx 3000)' });

  // Validar fecha
  const fechaDate = new Date(fecha);
  if (isNaN(fechaDate.getTime())) return res.status(400).json({ error: 'Fecha inválida' });
  try {
    const result = await pool.query(
      `INSERT INTO events (user_id, nombre, disciplina, ciudad, fecha, organizador, whatsapp, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.usuario.userId, nombre.trim(), disciplina, ciudad, fecha,
       organizador.trim(), whatsapp.replace(/\D/g,''), descripcion||null]
    );
    res.status(201).json({ mensaje: 'Evento publicado correctamente', event: result.rows[0] });
  } catch (err) {
    console.error('Error creando evento:', err.message);
    res.status(500).json({ error: 'Error al publicar evento' });
  }
}

// ── PUT /events/:id — editar ──────────────────────────────────
async function editar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM events WHERE id = $1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    const { nombre, disciplina, ciudad, fecha, organizador, whatsapp, descripcion, activo } = req.body;
    const result = await pool.query(
      `UPDATE events SET
         nombre=$1, disciplina=$2, ciudad=$3, fecha=$4,
         organizador=$5, whatsapp=$6, descripcion=$7, activo=$8
       WHERE id=$9 RETURNING *`,
      [nombre, disciplina, ciudad, fecha, organizador, whatsapp, descripcion, activo, id]
    );
    res.json({ mensaje: 'Evento actualizado', event: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Error al editar evento' }); }
}

// ── DELETE /events/:id — soft delete ─────────────────────────
async function eliminar(req, res) {
  const { id } = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM events WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    await pool.query('UPDATE events SET activo=FALSE WHERE id=$1', [id]);
    res.json({ mensaje: 'Evento eliminado correctamente' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar evento' }); }
}

// ── GET /events/mis-eventos ───────────────────────────────────
async function misEventos(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE user_id=$1 ORDER BY fecha DESC',
      [req.usuario.userId]
    );
    res.json({ events: result.rows });
  } catch (err) { res.status(500).json({ error: 'Error al obtener tus eventos' }); }
}

module.exports = { listar, detalle, crear, editar, eliminar, misEventos };
