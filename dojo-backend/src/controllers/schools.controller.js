// src/controllers/schools.controller.js
// Controller delegado — solo HTTP. Lógica en services/schools.service.js
const pool    = require('../db/connection');
const service = require('../services/schools.service');

function handleError(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.error, detalle: err.detalle });
  console.error(err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
}

async function listar(req, res) {
  try {
    const data = await service.listar(req.query);
    res.json(data);
  } catch (err) { handleError(res, err); }
}

async function detalle(req, res) {
  try {
    const school = await service.obtenerPorIdOSlug(req.params.id);
    if (!school) return res.status(404).json({ error: 'Escuela no encontrada' });
    res.json(school);
  } catch (err) { handleError(res, err); }
}

async function crear(req, res) {
  try {
    const school = await service.crear(
      req.usuario.userId, req.usuario.rol === 'admin',
      req.usuario.plan_activo, req.body
    );
    res.status(201).json({ mensaje: 'Escuela publicada correctamente', school });
  } catch (err) { handleError(res, err); }
}

async function editar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM schools WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Escuela no encontrada' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    const { nombre, descripcion, ciudad, direccion, disciplinas, whatsapp, horarios, foto_url, activo } = req.body;
    const result = await pool.query(
      `UPDATE schools SET nombre=COALESCE($1,nombre), descripcion=COALESCE($2,descripcion),
       ciudad=COALESCE($3,ciudad), direccion=COALESCE($4,direccion),
       disciplinas=COALESCE($5,disciplinas), whatsapp=COALESCE($6,whatsapp),
       horarios=COALESCE($7,horarios), foto_url=COALESCE($8,foto_url),
       activo=COALESCE($9,activo) WHERE id=$10 RETURNING *`,
      [nombre, descripcion, ciudad, direccion, disciplinas, whatsapp, horarios, foto_url, activo, id]
    );
    res.json({ mensaje: 'Escuela actualizada', school: result.rows[0] });
  } catch (err) { handleError(res, err); }
}

async function eliminar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM schools WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Escuela no encontrada' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    await pool.query('UPDATE schools SET activo=FALSE WHERE id=$1', [id]);
    res.json({ mensaje: 'Escuela eliminada correctamente' });
  } catch (err) { handleError(res, err); }
}

async function miEscuela(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM schools WHERE user_id=$1 AND activo=TRUE ORDER BY created_at DESC LIMIT 1',
      [req.usuario.userId]
    );
    res.json({ school: result.rows[0] || null });
  } catch (err) { handleError(res, err); }
}

module.exports = { listar, detalle, crear, editar, eliminar, miEscuela };
