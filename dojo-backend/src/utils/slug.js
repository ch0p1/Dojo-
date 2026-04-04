// src/utils/slug.js
// Genera slugs URL-safe a partir de texto en español
function generarSlug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')      // solo alfanumérico y guiones
    .trim()
    .replace(/\s+/g, '-')              // espacios → guiones
    .replace(/-+/g, '-')               // guiones dobles → uno
    .slice(0, 80);                     // máx 80 chars
}

module.exports = { generarSlug };
