// src/controllers/events.controller.js
const pool    = require('../db/connection');
const service = require('../services/events.service');

function handleError(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.error, detalle: err.detalle });
  console.error(err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
}

async function listar(req, res) {
  try { res.json(await service.listar(req.query)); }
  catch (err) { handleError(res, err); }
}

async function detalle(req, res) {
  try {
    const ev = await service.obtenerPorIdOSlug(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(ev);
  } catch (err) { handleError(res, err); }
}

async function crear(req, res) {
  try {
    const ev = await service.crear(req.usuario.userId, req.body);
    res.status(201).json({ mensaje: 'Evento publicado correctamente', event: ev });
  } catch (err) { handleError(res, err); }
}

async function editar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM events WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    const { nombre, disciplina, ciudad, fecha, organizador, whatsapp, descripcion, activo } = req.body;
    const result = await pool.query(
      `UPDATE events SET nombre=$1, disciplina=$2, ciudad=$3, fecha=$4,
       organizador=$5, whatsapp=$6, descripcion=$7, activo=$8 WHERE id=$9 RETURNING *`,
      [nombre, disciplina, ciudad, fecha, organizador, whatsapp, descripcion, activo, id]
    );
    res.json({ mensaje: 'Evento actualizado', event: result.rows[0] });
  } catch (err) { handleError(res, err); }
}

async function eliminar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM events WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    await pool.query('UPDATE events SET activo=FALSE WHERE id=$1', [id]);
    res.json({ mensaje: 'Evento eliminado correctamente' });
  } catch (err) { handleError(res, err); }
}

async function misEventos(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE user_id=$1 ORDER BY fecha DESC', [req.usuario.userId]
    );
    res.json({ events: result.rows });
  } catch (err) { handleError(res, err); }
}

module.exports = { listar, detalle, crear, editar, eliminar, misEventos };
