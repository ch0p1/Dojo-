// src/index.js
// ─────────────────────────────────────────────────────────────
//  Punto de entrada del servidor DOJX
//  Levanta Express, conecta middlewares y registra todas las rutas
// ─────────────────────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middlewares globales ──────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true,
}));

app.use(express.json());           // parsear JSON en el body
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos subidos (temporal hasta integrar Cloudinary)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rutas de la API ───────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/trainers',      require('./routes/trainers.routes'));
app.use('/api/schools',       require('./routes/schools.routes'));
app.use('/api/events',        require('./routes/events.routes'));
app.use('/api/subscriptions', require('./routes/subscriptions.routes'));
app.use('/api/upload',        require('./routes/upload.routes'));

// ── Ruta raíz — health check ──────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    api:     'DOJX Backend',
    version: '1.0.0',
    estado:  'online',
    rutas: [
      'POST   /api/auth/register',
      'POST   /api/auth/login',
      'GET    /api/auth/me',
      'GET    /api/trainers',
      'POST   /api/trainers',
      'PUT    /api/trainers/:id',
      'DELETE /api/trainers/:id',
      'GET    /api/schools',
      'POST   /api/schools',
      'PUT    /api/schools/:id',
      'DELETE /api/schools/:id',
      'GET    /api/subscriptions/mi-plan',
      'POST   /api/subscriptions/activar   (solo admin)',
      'POST   /api/upload/entrenador/:id/foto',
      'POST   /api/upload/escuela/:id/foto',
      'POST   /api/upload/escuela/:id/galeria',
      'POST   /api/upload/evento/:id/poster',
      'DELETE /api/upload/escuela/:id/galeria/:index',
    ]
  });
});

// ── Manejo de rutas no encontradas ───────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` });
});

// ── Manejo global de errores ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
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
