// src/controllers/admin.controller.js
const pool = require('../db/connection');

const PRECIOS = { 'basic-personal':50000,'basic-escuela':70000,'premium':100000 };

// ── GET /admin/stats — dashboard números ─────────────────────
async function stats(req, res) {
  try {
    const [usuarios, escuelas, entrenadores, eventos, suscripciones, resenas] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE activo = TRUE'),
      pool.query('SELECT COUNT(*) FROM schools WHERE activo = TRUE'),
      pool.query('SELECT COUNT(*) FROM trainers WHERE activo = TRUE'),
      pool.query("SELECT COUNT(*) FROM events WHERE activo = TRUE AND fecha >= NOW()"),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE estado = 'activo' AND expira > NOW()"),
      pool.query('SELECT COUNT(*) FROM reviews WHERE activo = TRUE'),
    ]);

    const ingresoRes = await pool.query(
      `SELECT COALESCE(SUM(precio_cop),0) AS total
       FROM subscriptions
       WHERE estado = 'activo' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
    );

    res.json({
      usuarios:          parseInt(usuarios.rows[0].count),
      escuelas:          parseInt(escuelas.rows[0].count),
      entrenadores:      parseInt(entrenadores.rows[0].count),
      eventos_proximos:  parseInt(eventos.rows[0].count),
      suscripciones_activas: parseInt(suscripciones.rows[0].count),
      resenas:           parseInt(resenas.rows[0].count),
      ingresos_mes_cop:  parseInt(ingresoRes.rows[0].total),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

// ── GET /admin/usuarios ───────────────────────────────────────
async function listarUsuarios(req, res) {
  const { page = 1, limit = 20, q } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const lim    = Math.min(100, parseInt(limit));

  let where  = 'WHERE 1=1';
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (LOWER(u.email) LIKE LOWER($${params.length}) OR LOWER(u.nombre) LIKE LOWER($${params.length}))`;
  }

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params);
    params.push(lim, offset);
    const result = await pool.query(
      `SELECT u.id, u.email, u.nombre, u.ciudad, u.plan_activo, u.plan_expira,
              u.activo, u.created_at
       FROM users u ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({
      usuarios: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page), limit: lim,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

async function detalleUsuario(req, res) {
  try {
    const [usuario, escuelas, trainers, subs] = await Promise.all([
      pool.query('SELECT id,email,nombre,ciudad,plan_activo,plan_expira,activo,created_at FROM users WHERE id=$1', [req.params.id]),
      pool.query('SELECT id,nombre,activo,created_at FROM schools WHERE user_id=$1', [req.params.id]),
      pool.query('SELECT id,nombre,activo,created_at FROM trainers WHERE user_id=$1', [req.params.id]),
      pool.query('SELECT plan,precio_cop,inicio,expira,estado FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [req.params.id]),
    ]);
    if (usuario.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ...usuario.rows[0], escuelas: escuelas.rows, trainers: trainers.rows, suscripciones: subs.rows });
  } catch (err) { res.status(500).json({ error: 'Error al obtener usuario' }); }
}

async function bloquearUsuario(req, res) {
  try {
    await pool.query('UPDATE users SET activo=FALSE WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Usuario bloqueado' });
  } catch (err) { res.status(500).json({ error: 'Error al bloquear usuario' }); }
}

async function desbloquearUsuario(req, res) {
  try {
    await pool.query('UPDATE users SET activo=TRUE WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Usuario desbloqueado' });
  } catch (err) { res.status(500).json({ error: 'Error al desbloquear usuario' }); }
}

// ── Contenido — listados con paginación ──────────────────────
async function listarEscuelas(req, res) {
  await _listarContenido(res, 'schools', 'escuelas', ['id','nombre','ciudad','activo','rating','created_at']);
}
async function listarEntrenadores(req, res) {
  await _listarContenido(res, 'trainers', 'entrenadores', ['id','nombre','ciudad','activo','created_at']);
}
async function listarEventos(req, res) {
  await _listarContenido(res, 'events', 'eventos', ['id','nombre','ciudad','fecha','activo','created_at']);
}

async function _listarContenido(res, tabla, clave, campos) {
  try {
    const result = await pool.query(
      `SELECT ${campos.join(',')} FROM ${tabla} ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ [clave]: result.rows, total: result.rowCount });
  } catch (err) { res.status(500).json({ error: `Error al obtener ${clave}` }); }
}

async function desactivarEscuela(req, res) {
  await _desactivar(res, 'schools', req.params.id, 'Escuela');
}
async function desactivarEntrenador(req, res) {
  await _desactivar(res, 'trainers', req.params.id, 'Entrenador');
}
async function desactivarEvento(req, res) {
  await _desactivar(res, 'events', req.params.id, 'Evento');
}
async function _desactivar(res, tabla, id, label) {
  try {
    const r = await pool.query(`UPDATE ${tabla} SET activo=FALSE WHERE id=$1 RETURNING id`, [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: `${label} no encontrado` });
    res.json({ mensaje: `${label} desactivado` });
  } catch (err) { res.status(500).json({ error: `Error al desactivar ${label}` }); }
}

// ── Reseñas ───────────────────────────────────────────────────
async function listarResenas(req, res) {
  try {
    const result = await pool.query(
      `SELECT r.*, u.nombre AS autor,
              s.nombre AS escuela, t.nombre AS entrenador
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN schools s ON r.school_id = s.id
       LEFT JOIN trainers t ON r.trainer_id = t.id
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json({ resenas: result.rows });
  } catch (err) { res.status(500).json({ error: 'Error al obtener reseñas' }); }
}

async function verificarResena(req, res) {
  try {
    await pool.query('UPDATE reviews SET verificado=TRUE WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Reseña verificada' });
  } catch (err) { res.status(500).json({ error: 'Error al verificar' }); }
}

async function eliminarResena(req, res) {
  try {
    await pool.query('UPDATE reviews SET activo=FALSE WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Reseña eliminada' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar' }); }
}

// ── Suscripciones ─────────────────────────────────────────────
async function listarSuscripciones(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.*, u.nombre, u.email
       FROM subscriptions s JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC LIMIT 200`
    );
    res.json({ suscripciones: result.rows });
  } catch (err) { res.status(500).json({ error: 'Error al obtener suscripciones' }); }
}

async function activarPlanManual(req, res) {
  const { userId, plan, referencia_pago } = req.body;
  
  if (!userId || !PLANES_VALIDOS.includes(plan)) {
    return res.status(400).json({ error: 'userId y plan válido son requeridos' });
  }
  try {
    const inicio = new Date();
    const expira = new Date();
    expira.setDate(expira.getDate() + 30);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO subscriptions (user_id,plan,precio_cop,inicio,expira,referencia_pago,estado)
         VALUES ($1,$2,$3,$4,$5,$6,'activo') ON CONFLICT (referencia_pago) DO NOTHING`,
        [userId, plan, PRECIOS[plan], inicio, expira, referencia_pago || `manual-${Date.now()}`]
      );
      await client.query('UPDATE users SET plan_activo=$1, plan_expira=$2 WHERE id=$3', [plan, expira, userId]);
      await client.query('COMMIT');
      res.json({ mensaje: `Plan "${plan}" activado correctamente`, expira });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: 'Error al activar plan' });
  }
}

module.exports = {
  stats, listarUsuarios, detalleUsuario, bloquearUsuario, desbloquearUsuario,
  listarEscuelas, listarEntrenadores, listarEventos,
  desactivarEscuela, desactivarEntrenador, desactivarEvento,
  listarResenas, verificarResena, eliminarResena,
  listarSuscripciones, activarPlanManual,
};
