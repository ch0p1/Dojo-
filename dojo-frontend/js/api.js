/**
 * api.js
 * Configuración base y cliente de red para peticiones al backend.
 */

export const API_URL = (() => {
  const h = window.location.hostname;
  // Sincronizamos con el backend usando el prefijo /v1
  if (h === '127.0.0.1' || h === 'localhost') return 'http://localhost:3001/api/v1';
  return (window.DOJX_API_URL || `https://api.${h.replace('www.', '')}/v1`);
})();

export const getToken = () => localStorage.getItem('dojx_token');
export const saveToken = (t) => localStorage.setItem('dojx_token', t);
export const removeToken = () => localStorage.removeItem('dojx_token');

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_URL + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw {
    status: res.status,
    message: data.error || data.detalle || 'Error de servidor',
    codigo: data.codigo || null,
    email: data.email || null,
  };
  return data;
}