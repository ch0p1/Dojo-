// src/controllers/reviews.controller.js
// ─────────────────────────────────────────────────────────────
//  Reseñas verificadas — un usuario, una reseña por entidad
//  calificacion: 1–5 estrellas + comentario opcional
//  verificado: true cuando un admin lo aprueba
// ─────────────────────────────────────────────────────────────
const pool = require('../db/connection');

// ── GET /reviews?school_id=X o ?trainer_id=Y ─────────────────
async function listar(req, res) {
  const { school_id, trainer_id, page = 1, limit = 10 } = req.query;
  if (!school_id && !trainer_id) {
    return res.status(400).json({ error: 'Se requiere school_id o trainer_id' });
  }

  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(20, parseInt(limit));
  const lim    = Math.min(20, Math.max(1, parseInt(limit)));
  const campo  = school_id ? 'school_id' : 'trainer_id';
  const valor  = school_id || trainer_id;

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM reviews WHERE ${campo} = $1 AND activo = TRUE`, [valor]
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT r.id, r.calificacion, r.comentario, r.verificado, r.created_at,
              u.nombre AS autor
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.${campo} = $1 AND r.activo = TRUE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [valor, lim, offset]
    );

    res.json({
      reviews: result.rows, total,
      page: parseInt(page), limit: lim,
      total_pages: Math.ceil(total / lim),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
}

// ── POST /reviews — crear reseña ──────────────────────────────
async function crear(req, res) {
  const userId = req.usuario.userId;
  const { school_id, trainer_id, calificacion, comentario } = req.body;

  if (!school_id && !trainer_id) {
    return res.status(400).json({ error: 'Se requiere school_id o trainer_id' });
  }
  if (school_id && trainer_id) {
    return res.status(400).json({ error: 'Solo puedes reseñar una entidad a la vez' });
  }

  const cal = parseInt(calificacion);
  if (isNaN(cal) || cal < 1 || cal > 5) {
    return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
  }
  if (comentario && String(comentario).length > 1000) {
    return res.status(400).json({ error: 'Comentario demasiado largo (máx 1000 caracteres)' });
  }

  try {
    // Verificar que la entidad existe
    if (school_id) {
      const ex = await pool.query('SELECT id FROM schools WHERE id=$1 AND activo=TRUE', [school_id]);
      if (ex.rows.length === 0) return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    if (trainer_id) {
      const ex = await pool.query('SELECT id FROM trainers WHERE id=$1 AND activo=TRUE', [trainer_id]);
      if (ex.rows.length === 0) return res.status(404).json({ error: 'Entrenador no encontrado' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (user_id, school_id, trainer_id, calificacion, comentario)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, school_id || null, trainer_id || null, cal,
       comentario ? String(comentario).trim().slice(0, 1000) : null]
    );

    // Actualizar rating promedio en la entidad
    if (school_id) await actualizarRatingEscuela(school_id);
    if (trainer_id) await actualizarRatingEntrenador(trainer_id);

    res.status(201).json({
      mensaje: 'Reseña publicada. Gracias por tu opinión.',
      review: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Ya dejaste una reseña para esta entidad' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Error al publicar reseña' });
  }
}

// ── PATCH /reviews/:id/verificar — solo admin ─────────────────
async function verificar(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE reviews SET verificado = TRUE WHERE id = $1 RETURNING *`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ mensaje: 'Reseña verificada', review: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar reseña' });
  }
}

// ── DELETE /reviews/:id — el autor o admin puede eliminar ─────
async function eliminar(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  try {
    const ex = await pool.query('SELECT user_id, school_id, trainer_id FROM reviews WHERE id=$1', [id]);
    if (ex.rows.length === 0) return res.status(404).json({ error: 'Reseña no encontrada' });
    if (!esAdmin && ex.rows[0].user_id !== userId)
      return res.status(403).json({ error: 'Sin permiso' });

    await pool.query('UPDATE reviews SET activo=FALSE WHERE id=$1', [id]);

    // Re-calcular rating tras eliminar
    if (ex.rows[0].school_id)   await actualizarRatingEscuela(ex.rows[0].school_id);
    if (ex.rows[0].trainer_id)  await actualizarRatingEntrenador(ex.rows[0].trainer_id);

    res.json({ mensaje: 'Reseña eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
}

// ── Helpers internos ──────────────────────────────────────────
async function actualizarRatingEscuela(schoolId) {
  await pool.query(
    `UPDATE schools SET
       rating       = (SELECT COALESCE(AVG(calificacion),0) FROM reviews WHERE school_id=$1 AND activo=TRUE),
       total_resenas = (SELECT COUNT(*) FROM reviews WHERE school_id=$1 AND activo=TRUE)
     WHERE id = $1`,
    [schoolId]
  );
}

async function actualizarRatingEntrenador(trainerId) {
  // Trainers no tienen campo rating en el schema actual, pero lo dejamos preparado
  // Si se agrega en el futuro, activar este código
}

module.exports = { listar, crear, verificar, eliminar };
