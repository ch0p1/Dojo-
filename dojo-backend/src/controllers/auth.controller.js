// src/controllers/auth.controller.js
const bcrypt       = require('bcrypt');
const jwt          = require('jsonwebtoken');
const crypto       = require('crypto');
const pool         = require('../db/connection');
const validator    = require('validator');
const emailService = require('../services/email.service');

const SALT_ROUNDS       = 12;
const TOKEN_EXPIRA_HORAS = 24;

function limpia(str) {
  if (!str) return '';
  return validator.escape(String(str).trim());
}

function emitirToken(usuario) {
  const esAdmin = usuario.email === process.env.ADMIN_EMAIL;
  return jwt.sign({
    userId:      usuario.id,
    email:       usuario.email,
    nombre:      usuario.nombre,
    rol:         esAdmin ? 'admin' : 'usuario',
    ciudad:      usuario.ciudad,
    plan_activo: usuario.plan_activo  || null,
    plan_expira: usuario.plan_expira  || null,
  }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// ── Genera token de verificación y lo guarda en la BD ────────
async function crearTokenVerificacion(userId) {
  // Invalidar tokens anteriores del mismo usuario
  await pool.query('UPDATE verification_tokens SET usado=TRUE WHERE user_id=$1', [userId]);

  const token    = crypto.randomBytes(48).toString('hex'); // 96 chars URL-safe
  const expira   = new Date(Date.now() + TOKEN_EXPIRA_HORAS * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expira]
  );
  return token;
}

// ── POST /auth/register ───────────────────────────────────────
async function register(req, res) {
  const { nombre, email, password, ciudad, disciplinas, horario_pref } = req.body;

  if (!nombre || !email || !password || !ciudad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (String(nombre).trim().length < 2 || String(nombre).trim().length > 100)
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
  if (!validator.isEmail(String(email)))
    return res.status(400).json({ error: 'Email inválido' });
  if (String(password).length < 8 || String(password).length > 128)
    return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres' });
  if (!validator.isLength(String(ciudad).trim(), { min:2, max:100 }))
    return res.status(400).json({ error: 'Ciudad inválida' });

  const disciplinasSanitizadas = Array.isArray(disciplinas)
    ? disciplinas.map(d => limpia(String(d))).filter(Boolean).slice(0, 10)
    : [];

  try {
    const existe = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Email ya registrado' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nombre, ciudad, disciplinas, horario_pref, email_verificado)
       VALUES ($1,$2,$3,$4,$5,$6, FALSE) RETURNING id, email, nombre, ciudad`,
      [
        validator.normalizeEmail(email) || email.toLowerCase(),
        password_hash,
        limpia(nombre),
        limpia(ciudad),
        disciplinasSanitizadas,
        horario_pref ? limpia(String(horario_pref)) : null,
      ]
    );

    const nuevoUsuario = result.rows[0];

    // Crear token y enviar email de verificación
    const token       = await crearTokenVerificacion(nuevoUsuario.id);
    const appUrl      = process.env.APP_URL || 'http://127.0.0.1:3000';
    const linkVerificar = `${appUrl}/dojo-plus.html?verificar=${token}`;

    // Enviar email (no bloqueante — si falla el email, el registro igual fue exitoso)
    emailService.enviarVerificacion(nuevoUsuario.email, nuevoUsuario.nombre, linkVerificar)
      .catch(err => console.error('⚠️  Error enviando email verificación:', err.message));

    res.status(201).json({
      mensaje: `Registro exitoso. Revisa tu correo (${nuevoUsuario.email}) para verificar tu cuenta.`,
      requiere_verificacion: true,
      email: nuevoUsuario.email,
    });

  } catch (err) {
    console.error('Error en register:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── POST /auth/login ──────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  try {
    const result = await pool.query(
      `SELECT id, email, nombre, ciudad, password_hash,
              plan_activo, plan_expira, email_verificado
       FROM users WHERE email=$1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const usuario = result.rows[0];
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    // ── Verificar email ──────────────────────────────────────
    if (!usuario.email_verificado) {
      return res.status(403).json({
        error: 'Email no verificado',
        codigo: 'EMAIL_NO_VERIFICADO',
        mensaje: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
        email: usuario.email,
      });
    }

    const token   = emitirToken(usuario);
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

// ── GET /auth/verificar-email?token=xxx ───────────────────────
async function verificarEmail(req, res) {
  const { token } = req.query;
  if (!token)
    return res.status(400).json({ error: 'Token requerido' });

  try {
    const result = await pool.query(
      `SELECT vt.user_id, vt.expires_at, vt.usado, u.email, u.nombre
       FROM verification_tokens vt
       JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1`,
      [token]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Token inválido' });

    const { user_id, expires_at, usado, email, nombre } = result.rows[0];

    if (usado)
      return res.status(400).json({ error: 'Este enlace ya fue usado. Inicia sesión directamente.' });

    if (new Date(expires_at) < new Date())
      return res.status(400).json({
        error: 'Enlace expirado',
        codigo: 'TOKEN_EXPIRADO',
        mensaje: 'El enlace expiró. Inicia sesión y solicita uno nuevo.',
        email,
      });

    // Marcar email como verificado y token como usado
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET email_verificado=TRUE WHERE id=$1', [user_id]);
      await client.query('UPDATE verification_tokens SET usado=TRUE WHERE token=$1', [token]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }

    res.json({
      mensaje: `¡Cuenta verificada! Bienvenido a DOJX, ${nombre.split(' ')[0]}.`,
      verificado: true,
      email,
    });

  } catch (err) {
    console.error('Error verificando email:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── POST /auth/reenviar-verificacion ─────────────────────────
async function reenviarVerificacion(req, res) {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ error: 'Email requerido' });

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, email_verificado FROM users WHERE email=$1',
      [email.toLowerCase()]
    );

    // Siempre responder igual — no revelar si el email existe
    if (result.rows.length === 0)
      return res.json({ mensaje: 'Si existe una cuenta con ese correo, recibirás un nuevo enlace.' });

    const usuario = result.rows[0];

    if (usuario.email_verificado)
      return res.json({ mensaje: 'Esta cuenta ya está verificada. Puedes iniciar sesión.' });

    // Verificar que no se abuse del reenvío (máx 1 token nuevo cada 2 min)
    const reciente = await pool.query(
      `SELECT created_at FROM verification_tokens
       WHERE user_id=$1 AND usado=FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [usuario.id]
    );
    if (reciente.rows.length > 0) {
      const hace = (Date.now() - new Date(reciente.rows[0].created_at)) / 1000;
      if (hace < 120) {
        return res.status(429).json({
          error: 'Espera un momento',
          mensaje: `Puedes solicitar un nuevo enlace en ${Math.ceil(120 - hace)} segundos.`
        });
      }
    }

    const token         = await crearTokenVerificacion(usuario.id);
    const appUrl        = process.env.APP_URL || 'http://127.0.0.1:3000';
    const linkVerificar = `${appUrl}/dojo-plus.html?verificar=${token}`;

    emailService.enviarReenvioVerificacion(usuario.email, usuario.nombre, linkVerificar)
      .catch(err => console.error('⚠️  Error reenviando verificación:', err.message));

    res.json({ mensaje: 'Si existe una cuenta con ese correo, recibirás un nuevo enlace.' });

  } catch (err) {
    console.error('Error en reenviarVerificacion:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── GET /auth/me ──────────────────────────────────────────────
async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, email, nombre, ciudad, disciplinas,
              horario_pref, plan_activo, plan_expira, email_verificado, created_at
       FROM users WHERE id=$1`,
      [req.usuario.userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });

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

module.exports = { register, login, verificarEmail, reenviarVerificacion, getMe };
