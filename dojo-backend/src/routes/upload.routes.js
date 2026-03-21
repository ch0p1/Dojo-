// src/routes/upload.routes.js
// ─────────────────────────────────────────────────────────────
//  Rutas de subida de imágenes
//  Todas requieren JWT válido y ser dueño del recurso (o admin)
//
//  POST   /api/upload/entrenador/:id/foto     ← foto de perfil
//  POST   /api/upload/escuela/:id/foto        ← foto principal
//  POST   /api/upload/escuela/:id/galeria     ← hasta 5 fotos
//  POST   /api/upload/evento/:id/poster       ← poster del evento
//  DELETE /api/upload/escuela/:id/galeria/:index
// ─────────────────────────────────────────────────────────────
const router = require('express').Router();
const { verificarToken } = require('../middleware/auth');
const {
  subirFotoEntrenador,
  subirFotoEscuela,
  subirGaleriaEscuela,
  subirPosterEvento,
  eliminarFotoGaleria,
} = require('../controllers/upload.controller');
const {
  subirFotoEntrenador:  multerEntrenador,
  subirFotoEscuela:     multerEscuela,
  subirGaleriaEscuela:  multerGaleria,
  subirPosterEvento:    multerEvento,
} = require('../middleware/upload');

// Foto de perfil del entrenador
router.post(
  '/entrenador/:id/foto',
  verificarToken,
  multerEntrenador,
  subirFotoEntrenador
);

// Foto principal de la escuela
router.post(
  '/escuela/:id/foto',
  verificarToken,
  multerEscuela,
  subirFotoEscuela
);

// Galería de fotos de la escuela (hasta 5 a la vez)
router.post(
  '/escuela/:id/galeria',
  verificarToken,
  multerGaleria,
  subirGaleriaEscuela
);

// Poster del evento
router.post(
  '/evento/:id/poster',
  verificarToken,
  multerEvento,
  subirPosterEvento
);

// Eliminar una foto de la galería por índice
router.delete(
  '/escuela/:id/galeria/:index',
  verificarToken,
  eliminarFotoGaleria
);

module.exports = router;
