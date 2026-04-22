// src/db/connection.js
// ─────────────────────────────────────────────────────────────
//  Conexión a PostgreSQL usando el módulo pg (node-postgres)
//  Se exporta un Pool — permite múltiples conexiones simultáneas
// ─────────────────────────────────────────────────────────────
const { Pool } = require('pg');
require('dotenv').config(); // Cargar variables de entorno

// Validación preventiva de variables críticas
if (!process.env.DB_PASSWORD) {
  console.warn('⚠️  Advertencia: DB_PASSWORD no detectada en el entorno.');
}

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : null,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
};

// Si la contraseña es nula, PostgreSQL fallará con un error de autenticación claro
if (dbConfig.password === null) {
  console.error('❌ Error Crítico: No se encontró DB_PASSWORD en las variables de entorno.');
}

const pool = new Pool(dbConfig);

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
