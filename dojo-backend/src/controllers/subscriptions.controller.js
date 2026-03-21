// src/controllers/subscriptions.controller.js
// ─────────────────────────────────────────────────────────────
//  Gestión de planes y pagos
//  Wompi envía un webhook cuando el pago se confirma →
//  activarPlan actualiza el usuario y registra en subscriptions
// ─────────────────────────────────────────────────────────────
const pool = require('../db/connection');

const PLANES = {
  'basic-personal': { precio: 50000, nombre: 'Basic Personalizado' },
  'basic-escuela':  { precio: 70000, nombre: 'Basic Escuela'       },
  'premium':        { precio: 100000, nombre: 'Premium'            },
};

// ── POST /subscriptions/activar ───────────────────────────────
//    Llamada interna cuando el pago Wompi es confirmado
//    En producción esto lo dispara el webhook de Wompi
async function activarPlan(req, res) {
  const { userId, plan, referencia_pago } = req.body;

  if (!PLANES[plan]) {
    return res.status(400).json({ error: 'Plan no válido' });
  }

  const inicio  = new Date();
  const expira  = new Date();
  expira.setDate(expira.getDate() + 30); // 30 días desde hoy

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Registrar en historial de pagos
    await client.query(
      `INSERT INTO subscriptions
         (user_id, plan, precio_cop, inicio, expira, referencia_pago, estado)
       VALUES ($1,$2,$3,$4,$5,$6,'activo')`,
      [userId, plan, PLANES[plan].precio, inicio, expira, referencia_pago || null]
    );

    // Actualizar el usuario con el plan activo
    await client.query(
      `UPDATE users SET plan_activo = $1, plan_expira = $2 WHERE id = $3`,
      [plan, expira, userId]
    );

    await client.query('COMMIT');

    res.json({
      mensaje: `Plan "${PLANES[plan].nombre}" activado correctamente`,
      plan,
      expira: expira.toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error activando plan:', err.message);
    res.status(500).json({ error: 'Error al activar el plan' });
  } finally {
    client.release();
  }
}

// ── GET /subscriptions/mi-plan ────────────────────────────────
async function miPlan(req, res) {
  try {
    const result = await pool.query(
      `SELECT plan_activo, plan_expira,
              plan_expira > NOW() AS vigente
       FROM users WHERE id = $1`,
      [req.usuario.userId]
    );

    const u = result.rows[0];
    res.json({
      plan_activo:  u.plan_activo,
      plan_expira:  u.plan_expira,
      vigente:      u.vigente,
      dias_restantes: u.vigente
        ? Math.ceil((new Date(u.plan_expira) - new Date()) / 86400000)
        : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar plan' });
  }
}

// ── GET /subscriptions/historial ─────────────────────────────
async function historial(req, res) {
  try {
    const result = await pool.query(
      `SELECT plan, precio_cop, inicio, expira, estado, referencia_pago
       FROM subscriptions WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.usuario.userId]
    );
    res.json({ pagos: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

// ── POST /subscriptions/webhook-wompi ────────────────────────
//    Wompi llama a esta ruta cuando un pago es aprobado
//    En producción: verificar la firma del webhook con WOMPI_WEBHOOK_SECRET
async function webhookWompi(req, res) {
  const { event, data } = req.body;

  // Solo procesar transacciones aprobadas
  if (event !== 'transaction.updated') return res.sendStatus(200);
  if (data?.transaction?.status !== 'APPROVED') return res.sendStatus(200);

  const referencia = data.transaction.reference; // formato: userId_plan
  const [userId, plan] = referencia.split('_');

  if (!userId || !plan || !PLANES[plan]) return res.sendStatus(200);

  try {
    await activarPlan(
      { body: { userId, plan, referencia_pago: data.transaction.id } },
      { json: () => {} } // mock res para reutilizar la función
    );
    console.log(`✅ Plan ${plan} activado para usuario ${userId}`);
  } catch (err) {
    console.error('Error en webhook Wompi:', err.message);
  }

  res.sendStatus(200);
}

// ── Admin: GET /subscriptions/todas ──────────────────────────
async function todasLasSuscripciones(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.*, u.nombre, u.email
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT 100`
    );
    res.json({ suscripciones: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
}

module.exports = {
  activarPlan,
  miPlan,
  historial,
  webhookWompi,
  todasLasSuscripciones,
};
