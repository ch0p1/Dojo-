// src/controllers/upload.controller.js
// ─────────────────────────────────────────────────────────────
//  Controladores para subida de imágenes
//  Cada ruta recibe el archivo ya subido a Cloudinary por el
//  middleware, y actualiza la URL en la base de datos
// ─────────────────────────────────────────────────────────────
const pool      = require('../db/connection');
const { cloudinary } = require('../middleware/upload');

// ── POST /upload/entrenador/:id/foto ─────────────────────────
async function subirFotoEntrenador(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  try {
    // Verificar propiedad
    const existente = await pool.query(
      'SELECT user_id, foto_url FROM trainers WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Entrenador no encontrado' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso para editar este entrenador' });
    }

    // Si tenía foto anterior, eliminarla de Cloudinary
    const fotoAnterior = existente.rows[0].foto_url;
    if (fotoAnterior) {
      const publicId = extraerPublicId(fotoAnterior);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    // La URL ya viene en req.file.path (multer-storage-cloudinary la pone ahí)
    const fotoUrl = req.file.path;

    await pool.query(
      'UPDATE trainers SET foto_url = $1 WHERE id = $2',
      [fotoUrl, id]
    );

    res.json({
      mensaje:  'Foto subida correctamente',
      foto_url: fotoUrl,
    });
  } catch (err) {
    console.error('Error subiendo foto entrenador:', err.message);
    res.status(500).json({ error: 'Error al guardar la foto' });
  }
}

// ── POST /upload/escuela/:id/foto ─────────────────────────────
async function subirFotoEscuela(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  try {
    const existente = await pool.query(
      'SELECT user_id, foto_url FROM schools WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso para editar esta escuela' });
    }

    const fotoAnterior = existente.rows[0].foto_url;
    if (fotoAnterior) {
      const publicId = extraerPublicId(fotoAnterior);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    const fotoUrl = req.file.path;
    await pool.query('UPDATE schools SET foto_url = $1 WHERE id = $2', [fotoUrl, id]);

    res.json({ mensaje: 'Foto subida correctamente', foto_url: fotoUrl });
  } catch (err) {
    console.error('Error subiendo foto escuela:', err.message);
    res.status(500).json({ error: 'Error al guardar la foto' });
  }
}

// ── POST /upload/escuela/:id/galeria ──────────────────────────
async function subirGaleriaEscuela(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No se recibieron imágenes' });
  }

  try {
    const existente = await pool.query(
      'SELECT user_id, galeria_urls FROM schools WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    // Agregar las nuevas fotos a las existentes (máx 10 total)
    const urlsActuales  = existente.rows[0].galeria_urls || [];
    const urlsNuevas    = req.files.map(f => f.path);
    const urlsTotal     = [...urlsActuales, ...urlsNuevas].slice(0, 10);

    await pool.query(
      'UPDATE schools SET galeria_urls = $1 WHERE id = $2',
      [urlsTotal, id]
    );

    res.json({
      mensaje:      'Imágenes subidas correctamente',
      galeria_urls: urlsTotal,
      agregadas:    urlsNuevas.length,
    });
  } catch (err) {
    console.error('Error subiendo galería:', err.message);
    res.status(500).json({ error: 'Error al guardar las imágenes' });
  }
}

// ── POST /upload/evento/:id/poster ────────────────────────────
async function subirPosterEvento(req, res) {
  const { id }  = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  try {
    const existente = await pool.query(
      'SELECT user_id, poster_url FROM events WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    const posterAnterior = existente.rows[0].poster_url;
    if (posterAnterior) {
      const publicId = extraerPublicId(posterAnterior);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    const posterUrl = req.file.path;
    await pool.query('UPDATE events SET poster_url = $1 WHERE id = $2', [posterUrl, id]);

    res.json({ mensaje: 'Poster subido correctamente', poster_url: posterUrl });
  } catch (err) {
    console.error('Error subiendo poster:', err.message);
    res.status(500).json({ error: 'Error al guardar el poster' });
  }
}

// ── DELETE /upload/escuela/:id/galeria/:index ─────────────────
async function eliminarFotoGaleria(req, res) {
  const { id, index } = req.params;
  const userId  = req.usuario.userId;
  const esAdmin = req.usuario.rol === 'admin';
  const idx     = parseInt(index);

  try {
    const existente = await pool.query(
      'SELECT user_id, galeria_urls FROM schools WHERE id = $1', [id]
    );
    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'Escuela no encontrada' });
    }
    if (!esAdmin && existente.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    const urls = existente.rows[0].galeria_urls || [];
    if (idx < 0 || idx >= urls.length) {
      return res.status(400).json({ error: 'Índice de imagen inválido' });
    }

    // Eliminar de Cloudinary
    const publicId = extraerPublicId(urls[idx]);
    if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});

    // Eliminar del array
    urls.splice(idx, 1);
    await pool.query('UPDATE schools SET galeria_urls = $1 WHERE id = $2', [urls, id]);

    res.json({ mensaje: 'Imagen eliminada', galeria_urls: urls });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la imagen' });
  }
}

// ── Helper: extrae el public_id de una URL de Cloudinary ─────
//  URL ejemplo: https://res.cloudinary.com/dojx/image/upload/v123/dojx/entrenadores/abc.jpg
//  public_id   : dojx/entrenadores/abc
function extraerPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const partes = url.split('/upload/');
    if (partes.length < 2) return null;
    // Quitar versión (v123/) y extensión (.jpg)
    const sinVersion = partes[1].replace(/^v\d+\//, '');
    const sinExt     = sinVersion.replace(/\.[^.]+$/, '');
    return sinExt;
  } catch {
    return null;
  }
}

module.exports = {
  subirFotoEntrenador,
  subirFotoEscuela,
  subirGaleriaEscuela,
  subirPosterEvento,
  eliminarFotoGaleria,
};
