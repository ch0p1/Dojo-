// src/controllers/auth.controller.js
// ─────────────────────────────────────────────────────────────
//  Registro, login y perfil del usuario autenticado
// ─────────────────────────────────────────────────────────────
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const pool      = require('../db/connection');

const SALT_ROUNDS = 12;

// ── Emite un JWT con los datos del usuario ────────────────────
function emitirToken(usuario) {
  // Determina si es admin comparando email con la variable de entorno
  const esAdmin = usuario.email === process.env.ADMIN_EMAIL;

  const payload = {
    userId:      usuario.id,
    email:       usuario.email,
    nombre:      usuario.nombre,
    rol:         esAdmin ? 'admin' : 'usuario',
    ciudad:      usuario.ciudad,
    plan_activo: usuario.plan_activo  || null,
    plan_expira: usuario.plan_expira  || null,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

// ── POST /auth/register ───────────────────────────────────────
async function register(req, res) {
  const { nombre, email, password, ciudad, disciplinas, horario_pref } = req.body;

  // Validaciones básicas (el frontend ya las hace, pero el backend
  // siempre debe validar independientemente)
  if (!nombre || !email || !password || !ciudad) {
    return res.status(400).json({
      error: 'Faltan campos',
      detalle: 'nombre, email, password y ciudad son obligatorios'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Contraseña muy corta',
      detalle: 'La contraseña debe tener al menos 8 caracteres'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    // Verificar que el email no esté ya registrado
    const existe = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existe.rows.length > 0) {
      return res.status(409).json({
        error: 'Email ya registrado',
        detalle: 'Ya existe una cuenta con este correo electrónico'
      });
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nombre, ciudad, disciplinas, horario_pref)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, nombre, ciudad, plan_activo, plan_expira`,
      [
        email.toLowerCase(),
        password_hash,
        nombre.trim(),
        ciudad,
        disciplinas || [],
        horario_pref || null
      ]
    );

    const nuevoUsuario = result.rows[0];
    const token = emitirToken(nuevoUsuario);

    res.status(201).json({
      mensaje: '¡Bienvenido a DOJX!',
      token,
      usuario: {
        id:          nuevoUsuario.id,
        nombre:      nuevoUsuario.nombre,
        email:       nuevoUsuario.email,
        ciudad:      nuevoUsuario.ciudad,
        rol:         nuevoUsuario.email === process.env.ADMIN_EMAIL ? 'admin' : 'usuario',
        plan_activo: null,
        plan_expira: null,
      }
    });

  } catch (err) {
    console.error('Error en register:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── POST /auth/login ──────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    // Buscar usuario por email
    const result = await pool.query(
      `SELECT id, email, nombre, ciudad, password_hash,
              plan_activo, plan_expira
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Mensaje genérico — no revelar si el email existe o no
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    // Comparar contraseña con el hash
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Emitir token
    const token = emitirToken(usuario);
    const esAdmin = usuario.email === process.env.ADMIN_EMAIL;

    res.json({
      mensaje: `¡Bienvenido de vuelta, ${usuario.nombre.split(' ')[0]}!`,
      token,
      usuario: {
        id:          usuario.id,
        nombre:      usuario.nombre,
        email:       usuario.email,
        ciudad:      usuario.ciudad,
        rol:         esAdmin ? 'admin' : 'usuario',
        plan_activo: usuario.plan_activo,
        plan_expira: usuario.plan_expira,
      }
    });

  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── GET /auth/me — perfil del usuario autenticado ────────────
async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email, nombre, ciudad, disciplinas,
              horario_pref, plan_activo, plan_expira, created_at
       FROM users WHERE id = $1`,
      [req.usuario.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const u = result.rows[0];
    res.json({
      ...u,
      rol: u.email === process.env.ADMIN_EMAIL ? 'admin' : 'usuario',
      plan_vigente: u.plan_activo && new Date(u.plan_expira) > new Date()
    });

  } catch (err) {
    console.error('Error en getMe:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { register, login, getMe };
