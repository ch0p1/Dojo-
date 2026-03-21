// src/routes/subscriptions.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/subscriptions.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// ── Webhook de Wompi — SIN autenticación JWT ──────────────────
//    Wompi llama aquí automáticamente tras cada transacción
router.post('/webhook-wompi', ctrl.webhookWompi);

// ── Usuario autenticado ───────────────────────────────────────
router.post('/crear-pago',    verificarToken, ctrl.crearPago);
router.get('/verificar-pago', verificarToken, ctrl.verificarPago);
router.get('/mi-plan',        verificarToken, ctrl.miPlan);
router.get('/historial',      verificarToken, ctrl.historial);

// ── Solo admin ────────────────────────────────────────────────
router.post('/activar',  verificarToken, soloAdmin, ctrl.activarPlan);
router.get('/todas',     verificarToken, soloAdmin, ctrl.todasLasSuscripciones);

module.exports = router;
