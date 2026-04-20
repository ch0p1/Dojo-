/**
 * api.js
 * Capa de red y comunicación con el backend.
 */

export const API_URL = (() => {
  const h = window.location.hostname;
  if (h === '127.0.0.1' || h === 'localhost') return 'http://localhost:3001/api';
  return (window.DOJX_API_URL || `https://api.${h.replace('www.','')}`);
})();

export const getToken = () => localStorage.getItem('dojx_token');
export const saveToken = (t) => localStorage.setItem('dojx_token', t);
export const removeToken = () => localStorage.removeItem('dojx_token');

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    const res = await fetch(API_URL + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      throw {
        status: res.status,
        message: data.error || data.detalle || 'Error de servidor',
        codigo: data.codigo || null,
        email: data.email || null,
      };
    }
    return data;
  } catch (err) {
    // Manejo de errores centralizado (errores de red vs HTTP)
    if (!err.status) {
      // Error de red puro
      console.error('Network Error:', err);
      throw { status: 0, message: 'No se pudo conectar con el servidor. Verifica tu conexión.' };
    }
    throw err;
  }
}
