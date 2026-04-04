// src/routes/admin.routes.js
// ─────────────────────────────────────────────────────────────
//  Panel de administración — TODAS las rutas requieren rol admin
// ─────────────────────────────────────────────────────────────
const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const { validarUUID } = require('../middleware/validateUUID');

// Todas las rutas de admin requieren token + rol admin
router.use(verificarToken, soloAdmin);

// ── Dashboard ─────────────────────────────────────────────────
router.get('/stats',              ctrl.stats);

// ── Usuarios ──────────────────────────────────────────────────
router.get('/usuarios',           ctrl.listarUsuarios);
router.get('/usuarios/:id',       validarUUID, ctrl.detalleUsuario);
router.patch('/usuarios/:id/bloquear',   validarUUID, ctrl.bloquearUsuario);
router.patch('/usuarios/:id/desbloquear',validarUUID, ctrl.desbloquearUsuario);

// ── Contenido ─────────────────────────────────────────────────
router.get('/escuelas',           ctrl.listarEscuelas);
router.patch('/escuelas/:id/desactivar',  validarUUID, ctrl.desactivarEscuela);
router.get('/entrenadores',       ctrl.listarEntrenadores);
router.patch('/entrenadores/:id/desactivar', validarUUID, ctrl.desactivarEntrenador);
router.get('/eventos',            ctrl.listarEventos);
router.patch('/eventos/:id/desactivar',   validarUUID, ctrl.desactivarEvento);

// ── Reseñas ───────────────────────────────────────────────────
router.get('/resenas',            ctrl.listarResenas);
router.patch('/resenas/:id/verificar',   validarUUID, ctrl.verificarResena);
router.delete('/resenas/:id',            validarUUID, ctrl.eliminarResena);

// ── Suscripciones ─────────────────────────────────────────────
router.get('/suscripciones',      ctrl.listarSuscripciones);
router.post('/suscripciones/activar', ctrl.activarPlanManual);

module.exports = router;
