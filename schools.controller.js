// src/controllers/schools.controller.js
// ─────────────────────────────────────────────────────────────
//  CRUD de escuelas — máximo 1 por usuario con plan activo
// ─────────────────────────────────────────────────────────────
const pool = require('../db/connection');

// ── GET /schools — listado público ───────────────────────────
async function listar(req, res) {
  const { ciudad, disciplina } = req.query;

  let query = `
    SELECT s.id, s.nombre, s.descripcion, s.ciudad, s.disciplinas,
           s.whatsapp, s.foto_url, s.rating, s.horarios, s.galeria_urls
    FROM schools s
    WHERE s.activo = TRUE
  `;
  const params = [];

  if (ciudad) {
    params.push(ciudad);
    query += ` AND LOWER(s.ciudad) = LOWER($${params.length})`;
  }
  if (disciplina) {
    params.push(`%${disciplina.toLowerCase()}%`);
    query += ` AND LOWER(s.disciplinas::text) LIKE $${params.length}`;
  }

  query += ' ORDER BY s.rating DESC, s.created_at DESC';

  try {
    const result = await pool.query(query, params);
    res.json({ schools: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('Error listando schools:', err.message);
    res.status(500).json({ error: 'Error al obtener escuelas' });
  }
}

// ── GET /schools/:id — detalle público ───────────────────────
async function detalle(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.*, u.nombre AS publicado_por
       FROM schools s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.activo = TRUE`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener escuela' });
  }
}

// ── POST /schools — crear (requiere plan, máx 1 por usuario) ─
async function crear(req, res) {
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  // Verificar plan — solo basic-escuela y premium pueden crear escuelas
  if (!esAdmin) {
    const plan = req.usuario.plan_activo;
    if (plan === 'basic-personal') {
      return res.status(403).json({
        error: 'Plan insuficiente',
        detalle: 'El plan Basic Personal no incluye publicar escuelas. Actualiza al plan Basic Escuela o Premium.'
      });
    }

    // Verificar que no tenga ya una escuela
    const count = await pool.query(
      'SELECT COUNT(*) FROM schools WHERE user_id = $1',
      [userId]
    );
    if (parseInt(count.rows[0].count) >= 1) {
      return res.status(403).json({
        error: 'Límite alcanzado',
        detalle: 'Solo puedes publicar una escuela por cuenta.'
      });
    }
  }

  const {
    nombre, descripcion, ciudad, direccion,
    disciplinas, whatsapp, foto_url, galeria_urls, horarios
  } = req.body;

  if (!nombre || !ciudad || !whatsapp) {
    return res.status(400).json({
      error: 'Faltan campos',
      detalle: 'nombre, ciudad y whatsapp son obligatorios'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO schools
         (user_id, nombre, descripcion, ciudad, direccion,
          disciplinas, whatsapp, foto_url, galeria_urls, horarios)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        userId,
        nombre.trim(),
        descripcion || null,
        ciudad,
        direccion  || null,
        disciplinas || [],
        whatsapp.replace(/\D/g, ''),
        foto_url    || null,
        galeria_urls || [],
        horarios    || {}
      ]
    );

    res.status(201).json({
      mensaje: 'Escuela publicada correctamente',
      school: result.rows[0]
    });
  } catch (err) {
    console.error('Error creando school:', err.message);
    res.status(500).json({ error: 'Error al publicar escuela' });
  }
}

// ── PUT /schools/:id — editar ─────────────────────────────────
async function editar(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  try {
    const existente = await pool.query(
      'SELECT user_id FROM schools WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso para editar esta escuela' });
    }

    const {
      nombre, descripcion, ciudad, direccion, disciplinas,
      whatsapp, foto_url, galeria_urls, horarios, activo
    } = req.body;

    const result = await pool.query(
      `UPDATE schools SET
         nombre       = COALESCE($1,  nombre),
         descripcion  = COALESCE($2,  descripcion),
         ciudad       = COALESCE($3,  ciudad),
         direccion    = COALESCE($4,  direccion),
         disciplinas  = COALESCE($5,  disciplinas),
         whatsapp     = COALESCE($6,  whatsapp),
         foto_url     = COALESCE($7,  foto_url),
         galeria_urls = COALESCE($8,  galeria_urls),
         horarios     = COALESCE($9,  horarios),
         activo       = COALESCE($10, activo)
       WHERE id = $11
       RETURNING *`,
      [
        nombre, descripcion, ciudad, direccion, disciplinas,
        whatsapp, foto_url, galeria_urls, horarios, activo, id
      ]
    );

    res.json({ mensaje: 'Escuela actualizada', school: result.rows[0] });
  } catch (err) {
    console.error('Error editando school:', err.message);
    res.status(500).json({ error: 'Error al editar escuela' });
  }
}

// ── DELETE /schools/:id — soft delete ────────────────────────
async function eliminar(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  try {
    const existente = await pool.query(
      'SELECT user_id FROM schools WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso para eliminar esta escuela' });
    }

    await pool.query('UPDATE schools SET activo = FALSE WHERE id = $1', [id]);
    res.json({ mensaje: 'Escuela eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar escuela' });
  }
}

// ── GET /schools/mi-escuela — la escuela del usuario ─────────
async function miEscuela(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM schools WHERE user_id = $1 LIMIT 1',
      [req.usuario.userId]
    );
    res.json({ school: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tu escuela' });
  }
}

module.exports = { listar, detalle, crear, editar, eliminar, miEscuela };
