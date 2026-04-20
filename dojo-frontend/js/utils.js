/**
 * utils.js
 * Utilidades generales para toda la aplicación.
 */

// Sanitización de strings (Prevención de XSS)
export function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Función debounce para búsquedas u otras operaciones frecuentes
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Normalización de números telefónicos (Colombia)
export function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('57') && digits.length >= 11) return digits;
  if (digits.startsWith('3') && digits.length === 10) return '57' + digits;
  return '57' + digits;
}

// Construye URL de WhatsApp
export function buildWaUrl(phone, nombre, tipo) {
  const num = normalizePhone(phone);
  if (!num) return '#';
  const mensajes = {
    escuela:    `Hola, vi el perfil de *${nombre}* en DOJX y me gustaría obtener más información sobre sus clases y horarios. 🥋`,
    entrenador: `Hola *${nombre}*, encontré tu perfil en DOJX y me interesa agendar una sesión contigo. ¿Tienes disponibilidad? 🥊`,
    evento:     `Hola, vi el evento *${nombre}* en DOJX y me gustaría más información sobre la inscripción. 🏆`,
  };
  const msg = encodeURIComponent(mensajes[tipo] || `Hola, te contacto desde DOJX sobre *${nombre}*.`);
  return `https://wa.me/${num}?text=${msg}`;
}

// Formateo de fechas
export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
}

// Navegación MPA
export function goTo(page) {
  const fileMap = {
    home: 'screen-1-home-search.html',
    schools: 'screen-escuelas-listado.html',
    trainers: 'screen-entrenadores-listado.html',
    events: 'screen-eventos-listado.html',
    login: 'screen-5-login-register.html',
    plans: 'screen-6-plans-pricing.html',
    profile: 'screen-perfil-de-usuario.html',
    admin: 'screen-panel-admin.html'
  };
  
  if (fileMap[page]) {
    window.location.href = fileMap[page];
  } else {
    window.location.href = page; // fallback para URLs directas
  }
}
