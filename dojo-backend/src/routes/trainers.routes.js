// src/routes/trainers.routes.js
const router = require('express').Router();
const { validarUUID } = require('../middleware/validateUUID');
const ctrl   = require('../controllers/trainers.controller');
const { verificarToken, requierePlan } = require('../middleware/auth');

// Públicas
router.get('/',     ctrl.listar);
router.get('/:id',  validarUUID, ctrl.detalle);

// Privadas
router.get('/mis-trainers',    verificarToken,              ctrl.misTrainers);
router.post('/',               verificarToken, requierePlan, ctrl.crear);
router.put('/:id',             validarUUID, verificarToken,              ctrl.editar);
router.delete('/:id',          validarUUID, verificarToken,              ctrl.eliminar);

module.exports = router;
