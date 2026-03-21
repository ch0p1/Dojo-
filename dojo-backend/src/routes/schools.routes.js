// src/routes/schools.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/schools.controller');
const { verificarToken, requierePlan } = require('../middleware/auth');

// Públicas
router.get('/',    ctrl.listar);
router.get('/:id', ctrl.detalle);

// Privadas
router.get('/mi-escuela',  verificarToken,               ctrl.miEscuela);
router.post('/',           verificarToken, requierePlan,  ctrl.crear);
router.put('/:id',         verificarToken,               ctrl.editar);
router.delete('/:id',      verificarToken,               ctrl.eliminar);

module.exports = router;
