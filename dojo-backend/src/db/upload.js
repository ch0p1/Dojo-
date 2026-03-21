// src/middleware/upload.js
// ─────────────────────────────────────────────────────────────
//  Middleware de subida de imágenes con Cloudinary
//  Usa multer-storage-cloudinary para subir directo a la nube
//  sin guardar nada en el disco del servidor
// ─────────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Función para crear storage según la carpeta destino ──────
function crearStorage(carpeta, transformaciones = []) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder:         `dojx/${carpeta}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: transformaciones,
      // El public_id lo genera Cloudinary automáticamente (único)
    },
  });
}

// ── Validar tipo y tamaño del archivo ────────────────────────
function fileFilter(req, file, cb) {
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
  }
  cb(null, true);
}

const limites = { fileSize: 5 * 1024 * 1024 }; // 5 MB máximo

// ── Middlewares de subida por tipo de contenido ───────────────

// Foto de perfil de entrenador — cuadrada 500x500, optimizada
const uploadFotoEntrenador = multer({
  storage: crearStorage('entrenadores', [
    { width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' },
  ]),
  fileFilter,
  limits: limites,
}).single('foto'); // campo del formulario: "foto"

// Foto principal de escuela — 800x600, panorámica
const uploadFotoEscuela = multer({
  storage: crearStorage('escuelas', [
    { width: 800, height: 600, crop: 'fill', quality: 'auto' },
  ]),
  fileFilter,
  limits: limites,
}).single('foto');

// Galería de escuela — hasta 5 fotos
const uploadGaleriaEscuela = multer({
  storage: crearStorage('escuelas/galeria', [
    { width: 1000, height: 750, crop: 'limit', quality: 'auto' },
  ]),
  fileFilter,
  limits: limites,
}).array('galeria', 5); // campo "galeria", máx 5 archivos

// Poster de evento — vertical tipo afiche 600x900
const uploadPosterEvento = multer({
  storage: crearStorage('eventos', [
    { width: 600, height: 900, crop: 'limit', quality: 'auto' },
  ]),
  fileFilter,
  limits: limites,
}).single('poster');

// ── Wrapper que convierte el callback de multer a promesa ────
//  y maneja errores con respuestas JSON claras
function manejarSubida(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (!err) return next();

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Imagen muy grande',
          detalle: 'El tamaño máximo permitido es 5 MB',
        });
      }
      if (err.message?.includes('Solo se permiten')) {
        return res.status(400).json({
          error: 'Formato no válido',
          detalle: err.message,
        });
      }
      if (err.message?.includes('Must supply api_key') ||
          err.message?.includes('cloud_name')) {
        return res.status(500).json({
          error: 'Cloudinary no configurado',
          detalle: 'Configura CLOUDINARY_CLOUD_NAME, API_KEY y API_SECRET en el .env',
        });
      }

      console.error('Error de subida:', err.message);
      return res.status(500).json({ error: 'Error al subir la imagen' });
    });
  };
}

// ── Exportar middlewares listos para usar en rutas ───────────
module.exports = {
  cloudinary,
  subirFotoEntrenador: manejarSubida(uploadFotoEntrenador),
  subirFotoEscuela:    manejarSubida(uploadFotoEscuela),
  subirGaleriaEscuela: manejarSubida(uploadGaleriaEscuela),
  subirPosterEvento:   manejarSubida(uploadPosterEvento),
};
