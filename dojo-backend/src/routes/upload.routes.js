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
  subirReglamentoEvento,
  eliminarFotoGaleria,
} = require('../controllers/upload.controller');
const {
  subirFotoEntrenador:  multerEntrenador,
  subirFotoEscuela:     multerEscuela,
  subirGaleriaEscuela:  multerGaleria,
  subirPosterEvento:    multerEvento,
  subirReglamento:      multerReglamento,
} = require('../middleware/upload');

// Foto de perfil del entrenador
router.post('/entrenador/:id/foto',    verificarToken, multerEntrenador,  subirFotoEntrenador);
router.post('/escuela/:id/foto',       verificarToken, multerEscuela,     subirFotoEscuela);
router.post('/escuela/:id/galeria',    verificarToken, multerGaleria,     subirGaleriaEscuela);
router.post('/evento/:id/poster',      verificarToken, multerEvento,      subirPosterEvento);
router.post('/evento/:id/reglamento',  verificarToken, multerReglamento,  subirReglamentoEvento);
router.delete('/escuela/:id/galeria/:index', verificarToken, eliminarFotoGaleria);

module.exports = router;
