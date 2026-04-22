const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configuración centralizada
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Sube una imagen a una carpeta específica
 * @param {string} filePath - Ruta temporal del archivo
 * @param {string} folder - Carpeta de destino (ej: 'escuelas', 'eventos')
 */
async function subirImagen(filePath, folder = 'dojo-plus') {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: 'auto'
        });
        return result;
    } catch (error) {
        console.error('❌ Error en Cloudinary Upload:', error.message);
        throw new Error('No se pudo subir la imagen al servidor de medios');
    }
}

async function eliminarImagen(publicId) {
    return cloudinary.uploader.destroy(publicId);
}

module.exports = { subirImagen, eliminarImagen, cloudinary };