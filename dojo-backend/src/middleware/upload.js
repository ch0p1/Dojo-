// src/middleware/upload.js
// ─────────────────────────────────────────────────────────────
//  Subida de imágenes con Cloudinary v2 + multer memoryStorage
//  NO usa multer-storage-cloudinary (incompatible con cloudinary v2)
//  Flujo: multer guarda el archivo en RAM → se sube con upload_stream
// ─────────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
const multer     = require('multer');
const streamifier = require('streamifier');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Validar tipo de archivo (imágenes + PDF) ─────────────────
function fileFilterImagen(req, file, cb) {
  const permitidos = ['image/jpeg','image/jpg','image/png','image/webp'];
  if (!permitidos.includes(file.mimetype)) return cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
  cb(null, true);
}
function fileFilterPDF(req, file, cb) {
  if (file.mimetype !== 'application/pdf') return cb(new Error('Solo se permiten archivos PDF'), false);
  cb(null, true);
}

// multer con memoria — no escribe nada en disco
const memStorage = multer.memoryStorage();
const limites    = { fileSize: 15 * 1024 * 1024 }; // 15 MB (PDFs pueden ser grandes)

// ── Subir buffer a Cloudinary con upload_stream ──────────────
function subirACloudinary(buffer, opciones) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(opciones, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// ── Perfiles de subida ───────────────────────────────────────
const PERFILES = {
  entrenador:  { folder:'dojx/entrenadores', resource_type:'image', transformation:[{width:500,height:500,crop:'fill',gravity:'face',quality:'auto',fetch_format:'auto'}] },
  escuela:     { folder:'dojx/escuelas',     resource_type:'image', transformation:[{width:800,height:600,crop:'fill',quality:'auto',fetch_format:'auto'}] },
  galeria:     { folder:'dojx/escuelas/galeria', resource_type:'image', transformation:[{width:1000,height:750,crop:'limit',quality:'auto',fetch_format:'auto'}] },
  evento:      { folder:'dojx/eventos',      resource_type:'image', transformation:[{width:600,height:900,crop:'limit',quality:'auto',fetch_format:'auto'}] },
  reglamento:  { folder:'dojx/reglamentos',  resource_type:'raw',   transformation:[] },
};

// ── Middleware factory ────────────────────────────────────────
function crearMiddleware(perfil, campo, esArray = false, filterFn = fileFilterImagen) {
  const multerMiddleware = esArray
    ? multer({ storage:memStorage, fileFilter:filterFn, limits:limites }).array(campo, 10)
    : multer({ storage:memStorage, fileFilter:filterFn, limits:limites }).single(campo);

  return async (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE')
          return res.status(400).json({ error: 'Archivo muy grande', detalle: 'Máximo 15 MB' });
        if (err.message?.includes('Solo se permiten'))
          return res.status(400).json({ error: 'Formato no válido', detalle: err.message });
        return res.status(500).json({ error: 'Error procesando archivo', detalle: err.message });
      }

      const archivos = esArray ? (req.files || []) : (req.file ? [req.file] : []);
      if (archivos.length === 0) return next();

      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        console.warn('⚠️  Cloudinary no configurado — archivo no subido');
        return next();
      }

      try {
        const p = PERFILES[perfil];
        const resultados = await Promise.all(
          archivos.map(archivo => subirACloudinary(archivo.buffer, {
            folder:         p.folder,
            resource_type:  p.resource_type,
            transformation: p.transformation?.length ? p.transformation : undefined,
          }))
        );

        if (esArray) {
          req.cloudinaryUrls = resultados.map(r => r.secure_url);
          archivos.forEach((f, i) => { f.path = resultados[i].secure_url; });
        } else {
          req.cloudinaryUrl = resultados[0].secure_url;
          req.file.path     = resultados[0].secure_url;
        }
        next();
      } catch (uploadErr) {
        console.error('Error subiendo a Cloudinary:', uploadErr.message);
        res.status(500).json({ error: 'Error al subir archivo a Cloudinary', detalle: uploadErr.message });
      }
    });
  };
}

module.exports = {
  cloudinary,
  subirFotoEntrenador:  crearMiddleware('entrenador', 'foto'),
  subirFotoEscuela:     crearMiddleware('escuela',    'foto'),
  subirGaleriaEscuela:  crearMiddleware('galeria',    'galeria', true),
  subirPosterEvento:    crearMiddleware('evento',     'foto'),
  subirReglamento:      crearMiddleware('reglamento', 'reglamento', false, fileFilterPDF),
};
