// src/routes/auth.routes.js
const router     = require('express').Router();
const ctrl       = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

// Públicas
router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);

// Privadas — requieren token
router.get('/me', verificarToken, ctrl.getMe);

module.exports = router;
