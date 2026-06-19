// src/middleware/auth.js
// ─────────────────────────────────────────────────────────────
//  Middleware de autenticación JWT
//  Uso: router.get('/ruta', verificarToken, controlador)
//  Uso admin: router.delete('/ruta', verificarToken, soloAdmin, controlador)
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');
const validator = require('validator');

/**
 * Normaliza el email de forma consistente (igual que en auth.controller.js)
 */
function normalizarEmail(email) {
  if (!email) return '';
  const limpio = String(email).trim().toLowerCase();
  return validator.normalizeEmail(limpio) || limpio;
}

/**
 * Re-evalúa si el usuario del payload es admin comparando con ADMIN_EMAIL.
 * Esto garantiza que tokens emitidos antes de configurar ADMIN_EMAIL
 * también reciban los privilegios de administrador correctamente.
 */
function resolverRol(payload) {
  if (!process.env.ADMIN_EMAIL || !payload.email) return payload.rol || 'usuario';
  return normalizarEmail(payload.email) === normalizarEmail(process.env.ADMIN_EMAIL)
    ? 'admin'
    : (payload.rol || 'usuario');
}

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
    // Re-evaluar el rol en cada request para que tokens viejos (pre-ADMIN_EMAIL)
    // también reciban privilegios de administrador si el email coincide.
    req.usuario = { ...payload, rol: resolverRol(payload) };
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
