// src/controllers/trainers.controller.js
// ─────────────────────────────────────────────────────────────
//  CRUD de entrenadores con validación de plan y límites
// ─────────────────────────────────────────────────────────────
const pool = require('../db/connection');

// Límite de entrenadores por plan
const LIMITE_TRAINERS = {
  'basic-personal': 1,
  'basic-escuela':  2,
  'premium':        2,
};

// ── GET /trainers — listado público ──────────────────────────
async function listar(req, res) {
  const { ciudad, disciplina } = req.query;

  let query = `
    SELECT t.id, t.nombre, t.foto_url, t.disciplinas,
           t.whatsapp, t.ciudad, t.experiencia_anos, t.bio,
           t.horarios, u.nombre AS publicado_por
    FROM trainers t
    JOIN users u ON t.user_id = u.id
    WHERE t.activo = TRUE
  `;
  const params = [];

  if (ciudad) {
    params.push(ciudad);
    query += ` AND LOWER(t.ciudad) = LOWER($${params.length})`;
  }
  if (disciplina) {
    params.push(`%${disciplina}%`);
    query += ` AND LOWER(t.disciplinas::text) LIKE LOWER($${params.length})`;
  }

  query += ' ORDER BY t.created_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json({ trainers: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('Error listando trainers:', err.message);
    res.status(500).json({ error: 'Error al obtener entrenadores' });
  }
}

// ── GET /trainers/:id — detalle público ──────────────────────
async function detalle(req, res) {
  try {
    const result = await pool.query(
      `SELECT t.*, u.nombre AS publicado_por
       FROM trainers t JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.activo = TRUE`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener entrenador' });
  }
}

// ── POST /trainers — crear (requiere plan activo) ─────────────
async function crear(req, res) {
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  // Admins no tienen límites
  if (!esAdmin) {
    // Verificar cuántos trainers tiene este usuario
    const count = await pool.query(
      'SELECT COUNT(*) FROM trainers WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(count.rows[0].count);
    const limite = LIMITE_TRAINERS[req.usuario.plan_activo] || 0;

    if (total >= limite) {
      return res.status(403).json({
        error: 'Límite alcanzado',
        detalle: `Tu plan "${req.usuario.plan_activo}" permite máximo ${limite} entrenador(es). Actualiza tu plan para agregar más.`
      });
    }
  }

  const {
    nombre, disciplinas, whatsapp, ciudad,
    experiencia_anos, bio, horarios, foto_url
  } = req.body;

  if (!nombre || !whatsapp || !ciudad) {
    return res.status(400).json({
      error: 'Faltan campos',
      detalle: 'nombre, whatsapp y ciudad son obligatorios'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO trainers
         (user_id, nombre, foto_url, disciplinas, whatsapp, ciudad,
          experiencia_anos, bio, horarios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        userId,
        nombre.trim(),
        foto_url   || null,
        disciplinas || [],
        whatsapp.replace(/\D/g, ''),  // solo dígitos
        ciudad,
        experiencia_anos || 0,
        bio   || null,
        horarios || {}
      ]
    );

    res.status(201).json({
      mensaje: 'Entrenador publicado correctamente',
      trainer: result.rows[0]
    });
  } catch (err) {
    console.error('Error creando trainer:', err.message);
    res.status(500).json({ error: 'Error al publicar entrenador' });
  }
}

// ── PUT /trainers/:id — editar (solo el dueño o admin) ───────
async function editar(req, res) {
  const { id }   = req.params;
  const userId   = req.usuario.userId;
  const esAdmin  = req.usuario.rol === 'admin';

  try {
    // Verificar propiedad
    const existente = await pool.query(
      'SELECT user_id FROM trainers WHERE id = $1',
      [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso para editar este entrenador' });
    }

    const {
      nombre, disciplinas, whatsapp, ciudad,
      experiencia_anos, bio, horarios, foto_url, activo
    } = req.body;

    const result = await pool.query(
      `UPDATE trainers SET
         nombre = COALESCE($1, nombre),
         foto_url = COALESCE($2, foto_url),
         disciplinas = COALESCE($3, disciplinas),
         whatsapp = COALESCE($4, whatsapp),
         ciudad = COALESCE($5, ciudad),
         experiencia_anos = COALESCE($6, experiencia_anos),
         bio = COALESCE($7, bio),
         horarios = COALESCE($8, horarios),
         activo = COALESCE($9, activo)
       WHERE id = $10
       RETURNING *`,
      [
        nombre, foto_url, disciplinas, whatsapp,
        ciudad, experiencia_anos, bio, horarios, activo, id
      ]
    );

    res.json({ mensaje: 'Entrenador actualizado', trainer: result.rows[0] });
  } catch (err) {
    console.error('Error editando trainer:', err.message);
    res.status(500).json({ error: 'Error al editar entrenador' });
  }
}

// ── DELETE /trainers/:id — eliminar (solo dueño o admin) ─────
async function eliminar(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  try {
    const existente = await pool.query(
      'SELECT user_id FROM trainers WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso para eliminar este entrenador' });
    }

    // Soft delete — marcar como inactivo en vez de borrar
    await pool.query('UPDATE trainers SET activo = FALSE WHERE id = $1', [id]);
    res.json({ mensaje: 'Entrenador eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar entrenador' });
  }
}

// ── GET /trainers/mis-trainers — los del usuario autenticado ─
async function misTrainers(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM trainers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.usuario.userId]
    );
    res.json({ trainers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus entrenadores' });
  }
}

module.exports = { listar, detalle, crear, editar, eliminar, misTrainers };
