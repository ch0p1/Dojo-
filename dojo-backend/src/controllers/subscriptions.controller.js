// src/controllers/subscriptions.controller.js
// ─────────────────────────────────────────────────────────────
//  Gestión de planes y pagos con Wompi
//
//  Flujo completo:
//  1. Usuario elige plan → POST /subscriptions/crear-pago
//  2. Backend genera firma de integridad y devuelve config de Wompi
//  3. Frontend abre el widget de Wompi con esa config
//  4. Usuario paga → Wompi llama al webhook
//  5. Backend verifica firma del evento y activa el plan
// ─────────────────────────────────────────────────────────────
const pool   = require('../db/connection');
const crypto = require('crypto');

const PLANES = {
  'basic-personal': { precio: 50000,  nombre: 'Basic Personalizado' },
  'basic-escuela':  { precio: 70000,  nombre: 'Basic Escuela'       },
  'premium':        { precio: 100000, nombre: 'Premium'             },
};

// ── Genera la firma de integridad requerida por Wompi ─────────
//  Wompi exige: SHA256( referencia + monto_centavos + moneda + integrityKey )
function generarFirmaIntegridad(referencia, montoCentavos, moneda = 'COP') {
  const cadena = `${referencia}${montoCentavos}${moneda}${process.env.WOMPI_INTEGRITY_KEY}`;
  return crypto.createHash('sha256').update(cadena).digest('hex');
}

// ── Verifica la firma que llega en el webhook de Wompi ────────
//  Wompi firma: SHA256( transactionId + status + monto + moneda + eventsKey )
//  Usa comparación en tiempo constante para prevenir timing attacks
function verificarFirmaEvento(datos, firmaRecibida) {
  if (!process.env.WOMPI_EVENTS_KEY) return false; // Rechazar si no está configurado
  const { id, status, amount_in_cents, currency } = datos.transaction;
  const cadena = `${id}${status}${amount_in_cents}${currency}${process.env.WOMPI_EVENTS_KEY}`;
  const firmaCalculada = crypto.createHash('sha256').update(cadena).digest('hex');
  // Comparación en tiempo constante — previene timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(firmaCalculada, 'hex'),
      Buffer.from(firmaRecibida,  'hex')
    );
  } catch {
    return false; // Longitudes distintas u otro error
  }
}

// ── POST /subscriptions/crear-pago ───────────────────────────
//  El frontend llama aquí antes de abrir el widget de Wompi
//  Devuelve la config necesaria para inicializar el pago
async function crearPago(req, res) {
  const { plan } = req.body;
  const userId   = req.usuario.userId;

  if (!PLANES[plan]) {
    return res.status(400).json({ error: 'Plan no válido' });
  }

  // Referencia única: userId_plan_timestamp
  // El guion bajo como separador nos permite recuperar userId y plan del webhook
  const timestamp  = Date.now();
  const referencia = `${userId}_${plan}_${timestamp}`;
  const monto      = PLANES[plan].precio;
  const centavos   = monto * 100; // Wompi trabaja en centavos

  const firma = generarFirmaIntegridad(referencia, centavos);

  res.json({
    // Configuración que el frontend usa para abrir el widget de Wompi
    public_key:        process.env.WOMPI_PUBLIC_KEY,
    currency:          'COP',
    amount_in_cents:   centavos,
    reference:         referencia,
    signature:         firma,
    redirect_url:      process.env.WOMPI_REDIRECT_URL,
    // Info del plan para mostrar en la UI
    plan,
    plan_nombre: PLANES[plan].nombre,
    monto_cop:   monto,
  });
}

// ── POST /subscriptions/webhook-wompi ─────────────────────────
//  Wompi llama aquí automáticamente cuando un pago cambia de estado
//  DEBE responder 200 rápido — el procesamiento es síncrono
async function webhookWompi(req, res) {
  // Wompi siempre responde 200 primero para no generar reintentos
  res.sendStatus(200);

  const { event, data, signature } = req.body;

  // Solo procesar pagos aprobados
  if (event !== 'transaction.updated') return;
  if (data?.transaction?.status !== 'APPROVED') return;

  // Verificar firma de Wompi — SIEMPRE obligatorio
  if (!signature?.checksum) {
    console.error('❌ Webhook sin firma — rechazado');
    return;
  }
  const esValido = verificarFirmaEvento(data, signature.checksum);
  if (!esValido) {
    console.error('❌ Webhook firma inválida — posible fraude o WOMPI_EVENTS_KEY no configurada');
    return;
  }

  // Extraer userId y plan de la referencia: "userId_plan_timestamp"
  const referencia = data.transaction.reference;
  const partes     = referencia.split('_');

  // La referencia tiene formato UUID_plan_timestamp
  // El UUID tiene guiones pero no guiones bajos, así que:
  // partes[0] = userId, partes[1] = plan (puede ser basic-personal, basic-escuela, premium)
  // partes[2] = timestamp
  const userId = partes[0];
  const plan   = partes[1];

  if (!userId || !plan || !PLANES[plan]) {
    console.error('❌ Webhook Wompi: referencia inválida:', referencia);
    return;
  }

  try {
    await _activarPlanInterno(userId, plan, data.transaction.id);
    console.log(`✅ Plan "${plan}" activado para usuario ${userId} — ref: ${referencia}`);
  } catch (err) {
    console.error('❌ Error activando plan desde webhook:', err.message);
  }
}

// ── GET /subscriptions/verificar-pago ─────────────────────────
//  El frontend llama aquí cuando Wompi redirige de vuelta
//  con ?id=TRANSACTION_ID en la URL para verificar el resultado
async function verificarPago(req, res) {
  const { id: transactionId } = req.query;

  if (!transactionId) {
    return res.status(400).json({ error: 'Se requiere el ID de transacción' });
  }

  try {
    // Consultar el estado de la transacción en la API de Wompi
    const wompiUrl = `https://sandbox.wompi.co/v1/transactions/${transactionId}`;
    const resp = await fetch(wompiUrl, {
      headers: { Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY}` },
    });
    const wompiData = await resp.json();
    const tx = wompiData.data;

    if (!tx) {
      return res.status(404).json({ error: 'Transacción no encontrada en Wompi' });
    }

    res.json({
      estado:      tx.status,                    // APPROVED | DECLINED | PENDING | VOIDED
      aprobado:    tx.status === 'APPROVED',
      referencia:  tx.reference,
      monto_cop:   tx.amount_in_cents / 100,
      metodo_pago: tx.payment_method_type,
      fecha:       tx.created_at,
    });
  } catch (err) {
    console.error('Error verificando pago en Wompi:', err.message);
    res.status(500).json({ error: 'No se pudo verificar el pago' });
  }
}

// ── Lógica interna de activación de plan (sin respuesta HTTP) ─
async function _activarPlanInterno(userId, plan, referencia_pago) {
  const inicio = new Date();
  const expira = new Date();
  expira.setDate(expira.getDate() + 30);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Registrar en historial
    await client.query(
      `INSERT INTO subscriptions
         (user_id, plan, precio_cop, inicio, expira, referencia_pago, estado)
       VALUES ($1,$2,$3,$4,$5,$6,'activo')`,
      [userId, plan, PLANES[plan].precio, inicio, expira, referencia_pago]
    );

    // Activar el plan en el usuario
    await client.query(
      `UPDATE users SET plan_activo = $1, plan_expira = $2 WHERE id = $3`,
      [plan, expira, userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── POST /subscriptions/activar — activación manual (admin) ──
async function activarPlan(req, res) {
  const { userId, plan, referencia_pago } = req.body;

  if (!PLANES[plan]) {
    return res.status(400).json({ error: 'Plan no válido' });
  }

  try {
    await _activarPlanInterno(userId, plan, referencia_pago || 'manual-admin');
    const expira = new Date();
    expira.setDate(expira.getDate() + 30);
    res.json({
      mensaje: `Plan "${PLANES[plan].nombre}" activado correctamente`,
      plan,
      expira: expira.toISOString(),
    });
  } catch (err) {
    console.error('Error activando plan manualmente:', err.message);
    res.status(500).json({ error: 'Error al activar el plan' });
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
      plan_activo:    u.plan_activo,
      plan_expira:    u.plan_expira,
      vigente:        u.vigente,
      dias_restantes: u.vigente
        ? Math.ceil((new Date(u.plan_expira) - new Date()) / 86400000)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar plan' });
  }
}

// ── GET /subscriptions/historial ─────────────────────────────
async function historial(req, res) {
  try {
    const result = await pool.query(
      `SELECT plan, precio_cop, inicio, expira, estado, referencia_pago, created_at
       FROM subscriptions WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.usuario.userId]
    );
    res.json({ pagos: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

// ── GET /subscriptions/todas — solo admin ─────────────────────
async function todasLasSuscripciones(req, res) {
  try {
    const result = await pool.query(
      `SELECT s.*, u.nombre, u.email
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT 200`
    );
    res.json({ suscripciones: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
}

module.exports = {
  crearPago,
  webhookWompi,
  verificarPago,
  activarPlan,
  miPlan,
  historial,
  todasLasSuscripciones,
};

