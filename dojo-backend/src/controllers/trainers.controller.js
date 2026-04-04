// src/controllers/trainers.controller.js
const pool    = require('../db/connection');
const service = require('../services/trainers.service');

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
    const t = await service.obtenerPorIdOSlug(req.params.id);
    if (!t) return res.status(404).json({ error: 'Entrenador no encontrado' });
    res.json(t);
  } catch (err) { handleError(res, err); }
}

async function crear(req, res) {
  try {
    const t = await service.crear(
      req.usuario.userId, req.usuario.rol === 'admin',
      req.usuario.plan_activo, req.body
    );
    res.status(201).json({ mensaje: 'Entrenador publicado correctamente', trainer: t });
  } catch (err) { handleError(res, err); }
}

async function editar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM trainers WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    const { nombre, disciplinas, whatsapp, ciudad, experiencia_anos, bio, horarios, foto_url, activo } = req.body;
    const result = await pool.query(
      `UPDATE trainers SET nombre=COALESCE($1,nombre), foto_url=COALESCE($2,foto_url),
       disciplinas=COALESCE($3,disciplinas), whatsapp=COALESCE($4,whatsapp),
       ciudad=COALESCE($5,ciudad), experiencia_anos=COALESCE($6,experiencia_anos),
       bio=COALESCE($7,bio), horarios=COALESCE($8,horarios), activo=COALESCE($9,activo)
       WHERE id=$10 RETURNING *`,
      [nombre, foto_url, disciplinas, whatsapp, ciudad, experiencia_anos, bio, horarios, activo, id]
    );
    res.json({ mensaje: 'Entrenador actualizado', trainer: result.rows[0] });
  } catch (err) { handleError(res, err); }
}

async function eliminar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id FROM trainers WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!esAdmin && ex.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sin permiso' });
    await pool.query('UPDATE trainers SET activo=FALSE WHERE id=$1', [id]);
    res.json({ mensaje: 'Entrenador eliminado correctamente' });
  } catch (err) { handleError(res, err); }
}

async function misTrainers(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM trainers WHERE user_id=$1 ORDER BY created_at DESC',
      [req.usuario.userId]
    );
    res.json({ trainers: result.rows });
  } catch (err) { handleError(res, err); }
}

module.exports = { listar, detalle, crear, editar, eliminar, misTrainers };
