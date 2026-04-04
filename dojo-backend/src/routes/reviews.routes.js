// src/routes/reviews.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/reviews.controller');
const { verificarToken, soloAdmin } = require('../middleware/auth');
const { validarUUID } = require('../middleware/validateUUID');

// GET  /api/v1/reviews?school_id=X   — público
router.get('/',                     ctrl.listar);

// POST /api/v1/reviews               — requiere login
router.post('/',   verificarToken,  ctrl.crear);

// PATCH /api/v1/reviews/:id/verificar — solo admin
router.patch('/:id/verificar', validarUUID, verificarToken, soloAdmin, ctrl.verificar);

// DELETE /api/v1/reviews/:id         — autor o admin
router.delete('/:id', validarUUID, verificarToken, ctrl.eliminar);

module.exports = router;
