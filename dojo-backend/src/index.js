// src/index.js
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// ── 1. Helmet — cabeceras de seguridad HTTP ───────────────────
// Activa: X-Frame-Options, X-Content-Type-Options, HSTS (en prod),
// Referrer-Policy, Permissions-Policy, Content-Security-Policy básico
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado para no romper el frontend SPA en dev
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by'); // No revelar que es Express

// ── 2. CORS estricto ─────────────────────────────────────────
const origenesPermitidos = [
  process.env.FRONTEND_URL,
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// ── 3. Límite de tamaño de body — previene DoS ────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── 4. Rate limiting global ───────────────────────────────────
const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,                  // máx 200 requests por IP en 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta en unos minutos' },
});

// Rate limit estricto para autenticación — previene fuerza bruta
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,   // máx 20 intentos de login/registro por IP en 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.' },
  skipSuccessfulRequests: true, // Solo cuenta los fallidos
});

app.use(limiteGeneral);
app.use('/api/auth', limiteAuth); // Doble límite en auth

// Servir archivos subidos (temporal hasta Cloudinary en producción)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rutas de la API ───────────────────────────────────────────
// ── API v1 — versionada desde el inicio ──────────────────────
// Permite hacer cambios breaking en v2 sin romper clientes v1
const v1 = require('express').Router();
v1.use('/auth',          require('./routes/auth.routes'));
v1.use('/trainers',      require('./routes/trainers.routes'));
v1.use('/schools',       require('./routes/schools.routes'));
v1.use('/events',        require('./routes/events.routes'));
v1.use('/reviews',       require('./routes/reviews.routes'));
v1.use('/subscriptions', require('./routes/subscriptions.routes'));
v1.use('/upload',        require('./routes/upload.routes'));
v1.use('/admin',         require('./routes/admin.routes'));

app.use('/api/v1', v1);

// Compatibilidad con rutas sin versión — redirige a v1
// (mantiene funcionando el frontend actual sin cambios)
app.use('/api', v1);

// ── 5. Health check — sin exponer rutas internas en producción ─
app.get('/', (req, res) => {
  if (isProd) {
    return res.json({ api:'DOJX', estado:'online' });
  }
  res.json({
    api:'DOJX Backend (dev)', version:'1.0.0', estado:'online',
    rutas:[
      'POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me',
      'GET/POST/PUT/DELETE /api/trainers',
      'GET/POST/PUT/DELETE /api/schools',
      'GET/POST/PUT/DELETE /api/events',
      'GET /api/subscriptions/mi-plan',
      'POST /api/upload/entrenador/:id/foto',
    ]
  });
});

// ── Rutas no encontradas ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error global — sin exponer detalles internos en producción ─
app.use((err, req, res, next) => {
  // Error de CORS
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  console.error('Error no manejado:', err.message);
  res.status(500).json({
    error: 'Error interno del servidor',
    // Solo incluir detalle en desarrollo
    ...(isProd ? {} : { detalle: err.message }),
  });
});

// ── Iniciar servidor ──────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('  ██████╗  ██████╗      ██╗██╗  ██╗');
  console.log('  ██╔══██╗██╔═══██╗     ██║╚██╗██╔╝');
  console.log('  ██║  ██║██║   ██║     ██║ ╚███╔╝ ');
  console.log('  ██║  ██║██║   ██║██   ██║ ██╔██╗ ');
  console.log('  ██████╔╝╚██████╔╝╚█████╔╝██╔╝ ██╗');
  console.log('  ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝');
  console.log('');
  console.log(`  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Admin:   ${process.env.ADMIN_EMAIL || '(no configurado)'}`);
  console.log('');
});
