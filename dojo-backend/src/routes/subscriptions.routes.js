// src/routes/subscriptions.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/subscriptions.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Webhook de Wompi — sin autenticación JWT (viene del servidor de Wompi)
router.post('/webhook-wompi', ctrl.webhookWompi);

// Usuario autenticado
router.get('/mi-plan',    verificarToken,             ctrl.miPlan);
router.get('/historial',  verificarToken,             ctrl.historial);

// Activación manual (útil para testing y para ti como admin)
router.post('/activar',   verificarToken, soloAdmin,  ctrl.activarPlan);

// Solo admin — ver todas las suscripciones
router.get('/todas',      verificarToken, soloAdmin,  ctrl.todasLasSuscripciones);

module.exports = router;
