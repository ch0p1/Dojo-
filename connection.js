// src/db/connection.js
// ─────────────────────────────────────────────────────────────
//  Conexión a PostgreSQL usando el módulo pg (node-postgres)
//  Se exporta un Pool — permite múltiples conexiones simultáneas
// ─────────────────────────────────────────────────────────────
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En producción con SSL (Render, Railway, Supabase):
  // ssl: { rejectUnauthorized: false }
});

// Comprueba la conexión al arrancar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Error conectando a PostgreSQL:', err.message);
    return;
  }
  release();
  console.log('✅  PostgreSQL conectado correctamente');
});

module.exports = pool;
