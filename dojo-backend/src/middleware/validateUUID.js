// src/middleware/validateUUID.js
// ─────────────────────────────────────────────────────────────
//  Valida que los parámetros :id sean UUIDs válidos
//  Previene inyección de strings maliciosos en parámetros de ruta
// ─────────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarUUID(req, res, next) {
  const { id, index } = req.params;

  if (id && !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  if (index !== undefined) {
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0 || idx > 99) {
      return res.status(400).json({ error: 'Índice inválido' });
    }
  }

  next();
}

module.exports = { validarUUID };
