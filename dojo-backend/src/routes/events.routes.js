// src/routes/events.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/events.controller');
const { verificarToken } = require('../middleware/auth');

// Públicas
router.get('/',          ctrl.listar);
router.get('/:id',       ctrl.detalle);

// Privadas
router.get('/mis-eventos', verificarToken, ctrl.misEventos);
router.post('/',           verificarToken, ctrl.crear);
router.put('/:id',         verificarToken, ctrl.editar);
router.delete('/:id',      verificarToken, ctrl.eliminar);

module.exports = router;
