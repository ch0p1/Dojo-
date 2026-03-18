// src/middleware/auth.js
// ─────────────────────────────────────────────────────────────
//  Middleware de autenticación JWT
//  Uso: router.get('/ruta', verificarToken, controlador)
//  Uso admin: router.delete('/ruta', verificarToken, soloAdmin, controlador)
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

// ── Verifica que el token sea válido ─────────────────────────
function verificarToken(req, res, next) {
  // El token llega en el header: Authorization: Bearer eyJ...
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado',
      detalle: 'Se requiere token de autenticación'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { userId, rol, plan_activo, plan_expira, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sesión expirada',
        detalle: 'Por favor inicia sesión nuevamente'
      });
    }
    return res.status(401).json({
      error: 'Token inválido',
      detalle: 'El token de autenticación no es válido'
    });
  }
}

// ── Solo administradores ──────────────────────────────────────
function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado',
      detalle: 'Esta acción requiere permisos de administrador'
    });
  }
  next();
}

// ── Verifica que el usuario tenga un plan activo ──────────────
function requierePlan(req, res, next) {
  // Los admins siempre pasan
  if (req.usuario?.rol === 'admin') return next();

  const { plan_activo, plan_expira } = req.usuario;

  if (!plan_activo) {
    return res.status(403).json({
      error: 'Plan requerido',
      detalle: 'Necesitas un plan activo para realizar esta acción'
    });
  }

  if (new Date(plan_expira) < new Date()) {
    return res.status(403).json({
      error: 'Plan vencido',
      detalle: 'Tu plan ha expirado. Renuévalo para continuar publicando'
    });
  }

  next();
}

module.exports = { verificarToken, soloAdmin, requierePlan };
