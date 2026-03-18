// src/routes/trainers.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/trainers.controller');
const { verificarToken, requierePlan } = require('../middleware/auth');

// Públicas
router.get('/',     ctrl.listar);
router.get('/:id',  ctrl.detalle);

// Privadas
router.get('/mis-trainers',    verificarToken,              ctrl.misTrainers);
router.post('/',               verificarToken, requierePlan, ctrl.crear);
router.put('/:id',             verificarToken,              ctrl.editar);
router.delete('/:id',          verificarToken,              ctrl.eliminar);

module.exports = router;
