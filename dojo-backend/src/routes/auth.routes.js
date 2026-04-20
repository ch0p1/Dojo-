// src/routes/auth.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

// Públicas
router.post('/register',               ctrl.register);
router.post('/login',                  ctrl.login);
router.get('/verificar-email',         ctrl.verificarEmail);
router.post('/reenviar-verificacion',  ctrl.reenviarVerificacion);

// Privadas
router.get('/me', verificarToken, ctrl.getMe);

module.exports = router;
