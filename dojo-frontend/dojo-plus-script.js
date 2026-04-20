/* ============================================================
   DOJX — Scripts  |  dojo-plus-script.js
   Conectado al backend en: http://localhost:3001
   ============================================================ */

// ===== CONFIG API ===========================================
// API_URL se detecta automáticamente según el entorno
// En local apunta a localhost:3001, en producción al mismo dominio/subdominio
const API_URL = (() => {
  const h = window.location.hostname;
  if (h === '127.0.0.1' || h === 'localhost') return 'http://localhost:3001/api';
  // En producción: ajustar a la URL real del backend en Railway/Render
  return (window.DOJX_API_URL || `https://api.${h.replace('www.', '')}`);
})();

// ── Sanitización — previene XSS al inyectar datos en innerHTML ─
// Escapa los 5 caracteres HTML peligrosos antes de insertarlos en el DOM
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const getToken = () => localStorage.getItem('dojx_token');
const saveToken = (t) => localStorage.setItem('dojx_token', t);
const removeToken = () => localStorage.removeItem('dojx_token');

let currentUser = null;

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API_URL + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw {
    status: res.status,
    message: data.error || data.detalle || 'Error de servidor',
    codigo: data.codigo || null,   // ej: 'EMAIL_NO_VERIFICADO'
    email: data.email || null,   // email del usuario si lo devuelve el servidor
  };
  return data;
}

// ===== NAVIGATION ===========================================
function goTo(screenName, item = null) {
  // Guardar el item activo si viene con datos
  if (item) activeDetail[screenName] = item;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + screenName);
  if (!screen) return;
  screen.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  const navMap = {
    home: 0, schools: 1, school: 1, trainers: 2, trainer: 2,
    events: 3, event: 3, plans: 4, profile: -1, login: -1, publish: -1
  };
  if (navMap[screenName] !== undefined && navMap[screenName] >= 0)
    document.querySelectorAll('.nav-links li')[navMap[screenName]]?.classList.add('active');

  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');
  screen.querySelector('.fixed-wa') && (screen.querySelector('.fixed-wa').style.display = 'block');

  if (screenName === 'schools') loadSchools();
  if (screenName === 'trainers') loadTrainers();
  if (screenName === 'events') loadEvents();
  if (screenName === 'profile' && currentUser) loadProfileData();
  if (screenName === 'admin' && currentUser?.rol === 'admin') {
    loadAdminStats();
    adminBuscarUsuarios();
  }

  // Renderizar detalles con datos reales
  if (screenName === 'school') renderSchoolDetail(activeDetail.school);
  if (screenName === 'trainer') renderTrainerDetail(activeDetail.trainer);
  if (screenName === 'event') renderEventDetail(activeDetail.event);

  // Actualizar botón WA flotante
  if (screenName === 'school') wireDetailWa('school');
  if (screenName === 'trainer') wireDetailWa('trainer');
  if (screenName === 'event') wireDetailWa('event');
}

// ===== MOBILE MENU ==========================================
function toggleMobileMenu() {
  const isOpen = document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.body.style.overflow = '';
}
function goToMobile(n) { closeMobileMenu(); setTimeout(() => goTo(n), 120); }

// ===== AUTH — REGISTRO ======================================
// ===== REGISTRO — PASOS =====================================
function nextStep(step) {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = n === step ? 'block' : 'none';
  });
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'none';
}

function showLogin() {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = 'none';
  });
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'block';
}

function showRegister() {
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'none';
  const s1 = document.getElementById('reg-step-1');
  if (s1) s1.style.display = 'block';
  [2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = 'none';
  });
}

function resetRegisterForm() {
  ['reg-nombre', 'reg-email', 'reg-pwd', 'reg-pwd2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error', 'valid'); }
  });
  const c = document.getElementById('reg-ciudad'); if (c) c.value = '';
  document.querySelectorAll('#reg-step-2 .disc-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#reg-step-3 .sched-opt').forEach(c => {
    c.classList.remove('selected');
    const st = c.querySelector('.sched-time');
    if (st) st.style.color = '';
  });
  const pwdBar = document.getElementById('pwd-strength-bar');
  if (pwdBar) pwdBar.classList.remove('visible');
  nextStep(1);
}

// ===== VALIDACIÓN FORMULARIO =================================
function showFieldError(inputId, errorId) {
  document.getElementById(inputId)?.classList.add('error');
  document.getElementById(inputId)?.classList.remove('valid');
  document.getElementById(errorId)?.classList.add('visible');
}

function clearFieldError(inputId) {
  document.getElementById(inputId)?.classList.remove('error');
  document.getElementById(inputId)?.classList.add('valid');
  document.getElementById(inputId.replace('reg-', 'err-'))?.classList.remove('visible');
}

function checkPwdStrength() {
  const pwd = document.getElementById('reg-pwd')?.value || '';
  const bar = document.getElementById('pwd-strength-bar');
  const fill = document.getElementById('pwd-strength-fill');
  if (!bar || !fill) return;
  bar.classList.add('visible');
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  fill.style.width = ['25%', '50%', '75%', '100%'][s - 1] || '0%';
  fill.style.background = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60'][s - 1] || '#E74C3C';
}

function validateStep1() {
  let ok = true;
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pwd = document.getElementById('reg-pwd').value;
  const pwd2 = document.getElementById('reg-pwd2').value;
  const ciudad = document.getElementById('reg-ciudad').value;

  if (nombre.length < 2) { showFieldError('reg-nombre', 'err-nombre'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('reg-email', 'err-email'); ok = false; }
  if (pwd.length < 8) { showFieldError('reg-pwd', 'err-pwd'); ok = false; }
  if (pwd !== pwd2 || !pwd2) { showFieldError('reg-pwd2', 'err-pwd2'); ok = false; }
  if (!ciudad) { showFieldError('reg-ciudad', 'err-ciudad'); ok = false; }
  if (ok) nextStep(2);
}

async function finishRegister() {
  const btn = document.querySelector('#reg-step-3 .btn-red');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }

  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pwd').value;
  const ciudad = document.getElementById('reg-ciudad').value;
  const disciplinas = [...document.querySelectorAll('#reg-step-2 .disc-card.selected')]
    .map(c => c.querySelector('.disc-name').textContent.trim());
  const schedEl = document.querySelector('#reg-step-3 .sched-opt.selected');
  const horario_pref = schedEl?.querySelector('.sched-time').textContent.trim() || null;

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password, ciudad, disciplinas, horario_pref })
    });
    if (btn) { btn.disabled = false; btn.textContent = '🎉 Finalizar Registro'; }
    resetRegisterForm();
    mostrarPantallaVerificacion(data.email || email, nombre);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🎉 Finalizar Registro'; }
    if (err.status === 409) {
      nextStep(1);
      document.getElementById('err-email').textContent = 'Este email ya está registrado.';
      showFieldError('reg-email', 'err-email');
    } else {
      showToast('❌ ' + (err.message || 'Error al crear la cuenta'));
    }
  }
}

// ===== AUTH — LOGIN ==========================================
async function doLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');

  if (!email || !password) {
    if (errEl) { errEl.textContent = 'Ingresa tu email y contraseña.'; errEl.classList.add('visible'); }
    return;
  }
  if (errEl) errEl.classList.remove('visible');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    saveToken(data.token);
    currentUser = data.usuario;
    renderUserUI(data.usuario);
    showToast('👋 ' + data.mensaje);
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    goTo('home');
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
    // Caso especial: email no verificado
    if (err.status === 403 && err.codigo === 'EMAIL_NO_VERIFICADO') {
      mostrarPantallaVerificacion(err.email || email, null, true);
      return;
    }
    if (errEl) { errEl.textContent = err.message || 'Credenciales incorrectas'; errEl.classList.add('visible'); }
  }
}

// ===== AUTH — LOGOUT =========================================
function logoutUser() {
  removeToken();
  currentUser = null;
  document.getElementById('navAuth').innerHTML =
    `<button class="btn-login" onclick="goTo('login')">Ingresar</button>`;
  const mf = document.querySelector('.nav-mobile-footer');
  if (mf) mf.innerHTML = `<span class="nav-mobile-city">📍 Cali · Bogotá</span>
    <button class="btn-login" onclick="goToMobile('login')">Ingresar</button>`;
  resetRegisterForm();
  showToast('👋 Sesión cerrada.');
  goTo('home');
}

async function loadUserFromToken() {
  if (!getToken()) return;
  try {
    const data = await apiFetch('/auth/me');
    currentUser = data;
    renderUserUI(data);
  } catch (err) {
    // Solo eliminar el token si el servidor lo rechazó (401/403)
    // NO eliminarlo si es error de red (servidor apagado, sin conexión)
    if (err.status === 401 || err.status === 403) {
      removeToken();
    } else {
      // Error de red — mantener el token, restaurar UI con datos del token local
      const token = getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // El token no ha expirado aún
          if (payload.exp * 1000 > Date.now()) {
            currentUser = {
              userId: payload.userId,
              nombre: payload.nombre,
              email: payload.email,
              rol: payload.rol,
              ciudad: payload.ciudad,
              plan_activo: payload.plan_activo,
              plan_expira: payload.plan_expira,
            };
            renderUserUI(currentUser);
          } else {
            removeToken(); // Token expirado
          }
        } catch { /* token malformado */ }
      }
    }
  }
}

// ── Actualizar nav + perfil ───────────────────────────────────
function renderUserUI(user) {
  if (!user) return;
  const initials = user.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const esAdmin = user.rol === 'admin';

  document.getElementById('navAuth').innerHTML = esAdmin
    ? `<button class="btn-login" style="background:rgba(212,172,13,0.12);border:1px solid rgba(212,172,13,0.35);color:var(--gold);font-size:12px;padding:6px 14px" onclick="goTo('admin')">⚙️ Admin</button>
       <div class="avatar" onclick="goTo('profile')" title="Mi Perfil">${initials}</div>`
    : `<div class="avatar" onclick="goTo('profile')" title="Mi Perfil">${initials}</div>`;

  const mf = document.querySelector('.nav-mobile-footer');
  if (mf) mf.innerHTML = `<span class="nav-mobile-city">📍 ${esc(user.ciudad || 'Colombia')}</span>
    <div class="avatar" onclick="goToMobile('profile')" style="width:36px;height:36px">${initials}</div>`;

  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent = user.nombre.toUpperCase();
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileCity').textContent = '📍 ' + (user.ciudad || 'Colombia');

  const badgesEl = document.getElementById('profile-badges-extra');
  if (badgesEl) {
    const vigente = user.plan_activo && new Date(user.plan_expira) > new Date();
    const dias = vigente ? Math.ceil((new Date(user.plan_expira) - new Date()) / 86400000) : 0;
    badgesEl.innerHTML = esAdmin
      ? `<span class="profile-member-badge" style="background:rgba(212,172,13,0.12);border-color:rgba(212,172,13,0.3);color:var(--gold)">⭐ Admin DOJX</span>`
      : vigente
        ? `<span class="profile-member-badge">🔒 ${esc(user.plan_activo)} · ${dias}d restantes</span>`
        : `<span class="profile-member-badge" style="background:rgba(136,136,136,0.1);border-color:var(--gray2);color:var(--gray)">🥋 Miembro DOJX</span>`;
  }
  updateProfileButtons(user);
}

function updateProfileButtons(user) {
  const el = document.getElementById('profile-plan-section');
  if (!el) return;
  const esAdmin = user.rol === 'admin';
  const planActivo = user.plan_activo && new Date(user.plan_expira) > new Date();
  const puedeEscuela = esAdmin || ['basic-escuela', 'premium'].includes(user.plan_activo);

  if (esAdmin || planActivo) {
    el.innerHTML = `
      <div class="profile-section-title">🚀 Publicar contenido</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn-red" style="justify-content:center" onclick="openPublishModal('trainer')">🥊 Publicar entrenador</button>
        ${puedeEscuela
        ? `<button class="btn-outline-red" style="justify-content:center" onclick="openPublishModal('school')">🏫 Publicar escuela</button>`
        : `<div style="font-size:12px;color:var(--gray);text-align:center;padding:8px 0">Necesitas plan <strong style="color:var(--gold)">Basic Escuela</strong> para publicar academia</div>`}
        <button class="btn-outline-red" style="justify-content:center;border-color:rgba(212,172,13,0.4);color:var(--gold)" onclick="openPublishModal('event')">🏆 Publicar evento</button>`;
  } else {
    el.innerHTML = `
      <div class="profile-section-title">🔒 Publicar contenido</div>
      <p style="font-size:13px;color:var(--gray);margin-bottom:14px;line-height:1.6">Activa un plan mensual para publicar tu perfil de entrenador o tu escuela en DOJX.</p>
      <button class="btn-red" style="width:100%;justify-content:center" onclick="goTo('plans')">Ver planes desde $50.000 COP →</button>`;
  }
}

// ── Perfil — cargar datos desde API ──────────────────────────
async function loadProfileData() {
  if (!currentUser) return;
  try {
    const user = await apiFetch('/auth/me');
    currentUser = { ...currentUser, ...user };

    const iconMap = { BJJ: '🥋', Boxeo: '🥊', 'Muay Thai': '🦵', Karate: '🎌', Taekwondo: '🏅', Wrestling: '💪', MMA: '⚔️', Judo: '🎯', Kickboxing: '🔥', Capoeira: '🌊' };
    const discGrid = document.getElementById('profileDiscs');
    if (user.disciplinas?.length) {
      discGrid.innerHTML = user.disciplinas.map(d =>
        `<span class="profile-disc-chip"><span>${iconMap[d] || '🥋'}</span>${d}</span>`).join('');
    } else {
      discGrid.innerHTML = '<span class="profile-no-disc">Sin disciplinas guardadas.</span>';
    }

    const schedMap = { Mañana: { icon: '🌅', range: '6am – 12pm' }, Tarde: { icon: '☀️', range: '12pm – 6pm' }, Noche: { icon: '🌙', range: '6pm – 10pm' } };
    const schedEl = document.getElementById('profileSchedule');
    if (user.horario_pref && schedMap[user.horario_pref]) {
      const s = schedMap[user.horario_pref];
      schedEl.innerHTML = `<div class="profile-schedule-icon">${s.icon}</div>
        <div><div class="profile-schedule-label">${esc(user.horario_pref)}</div>
        <div class="profile-schedule-range">${s.range}</div></div>`;
    }
    await loadMisTrainers();
    updateProfileButtons(user);
  } catch (e) { console.warn('loadProfileData:', e.message); }
}

async function loadMisTrainers() {
  const el = document.getElementById('profile-mis-trainers');
  if (!el) return;
  try {
    const data = await apiFetch('/trainers/mis-trainers');
    el.innerHTML = data.trainers.length === 0
      ? '<span class="profile-no-disc">No has publicado entrenadores aún.</span>'
      : data.trainers.map(t => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            <div style="width:38px;height:38px;border-radius:50%;background:var(--card-bg);border:1px solid var(--gray2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🥋</div>
            <div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(t.nombre)}</div>
            <div style="font-size:11px;color:var(--gray)">${esc(t.ciudad)} · ${esc(t.experiencia_anos)} años</div></div>
            <button onclick="deleteTrainer('${t.id}')" style="background:none;border:none;color:var(--gray);cursor:pointer;font-size:14px;padding:4px" title="Eliminar">🗑</button>
          </div>`).join('');
  } catch { el.innerHTML = '<span class="profile-no-disc">Sin conexión al servidor.</span>'; }
}

// ===== WHATSAPP =============================================

// Normaliza el número colombiano al formato internacional
function normalizePhone(phone) {
  if (!phone) return null;
  // Quitar todo lo que no sea dígito
  const digits = phone.replace(/\D/g, '');
  // Si ya tiene código de país 57 y empieza con 57
  if (digits.startsWith('57') && digits.length >= 11) return digits;
  // Si empieza con 3 (móvil colombiano) → agregar 57
  if (digits.startsWith('3') && digits.length === 10) return '57' + digits;
  // Si empieza con 60 o 601 etc (fijo Colombia)
  return '57' + digits;
}

// Construye la URL de wa.me con mensaje prellenado
function buildWaUrl(phone, nombre, tipo) {
  const num = normalizePhone(phone);
  if (!num) return '#';
  const mensajes = {
    escuela: `Hola, vi el perfil de *${nombre}* en DOJX y me gustaría obtener más información sobre sus clases y horarios. 🥋`,
    entrenador: `Hola *${nombre}*, encontré tu perfil en DOJX y me interesa agendar una sesión contigo. ¿Tienes disponibilidad? 🥊`,
    evento: `Hola, vi el evento *${nombre}* en DOJX y me gustaría más información sobre la inscripción. 🏆`,
  };
  const msg = encodeURIComponent(mensajes[tipo] || `Hola, te contacto desde DOJX sobre *${nombre}*.`);
  return `https://wa.me/${num}?text=${msg}`;
}

// Abre WhatsApp desde el botón flotante del detalle
function openWa(phone, nombre, tipo) {
  const url = buildWaUrl(phone, nombre, tipo);
  if (url !== '#') window.open(url, '_blank');
}

// Estado del elemento activo en las pantallas de detalle
let activeDetail = { school: null, trainer: null, event: null };

// Actualiza el botón flotante de WA en las pantallas de detalle
function wireDetailWa(tipo) {
  const item = activeDetail[tipo];
  const btn = document.getElementById('wa-btn-' + tipo);
  if (!btn) return;

  if (item && item.whatsapp) {
    const url = buildWaUrl(item.whatsapp, item.nombre, tipo === 'school' ? 'escuela' : tipo === 'trainer' ? 'entrenador' : 'evento');
    btn.href = url;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  } else {
    // Sin número disponible todavía — deshabilitar visualmente
    btn.href = '#';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }
}

// ── Render detalle de escuela ─────────────────────────────────
function renderSchoolDetail(s) {
  if (!s) return; // Sin datos — mantiene el placeholder estático
  const el = document.getElementById('screen-school');
  if (!el) return;

  // Hero
  const heroName = el.querySelector('.hero-detail-content h1');
  if (heroName) heroName.textContent = s.nombre;

  const heroCity = el.querySelector('.city-badge');
  if (heroCity) heroCity.textContent = '📍 ' + s.ciudad;

  // Foto de fondo del hero
  const heroBg = el.querySelector('.hero-detail-bg');
  if (heroBg) {
    if (s.foto_url) {
      heroBg.style.backgroundImage = `url(${s.foto_url})`;
      heroBg.style.backgroundSize = 'cover';
      heroBg.style.backgroundPosition = 'center';
      heroBg.textContent = '';
    } else {
      heroBg.style.backgroundImage = '';
      heroBg.textContent = '🏫';
    }
  }

  // Tags de disciplinas
  const tagsWrap = el.querySelector('.hero-detail-content .tags-wrap') ||
    el.querySelector('.hero-detail-content div[style*="gap:8px"]');
  if (tagsWrap && s.disciplinas?.length) {
    tagsWrap.innerHTML = s.disciplinas.map(d => `<span class="tag">${esc(d)}</span>`).join('');
  }

  // Tab Descripción
  const descP = el.querySelector('#tab-school-desc .section-card p');
  if (descP && s.descripcion) descP.textContent = s.descripcion;

  // Tab Instalaciones — galería
  const photoGrid = el.querySelector('.photo-grid');
  if (photoGrid) {
    if (s.galeria_urls?.length) {
      photoGrid.innerHTML = s.galeria_urls.slice(0, 4).map(url =>
        `<div class="photo-grid-item" style="background-image:url('${url}');background-size:cover;background-position:center"></div>`
      ).join('');
    } else {
      photoGrid.innerHTML = `
        <div class="photo-grid-item" style="background:var(--card-bg)">🏫<br><span style="font-size:12px;color:var(--gray)">Sin fotos aún</span></div>`;
    }
  }

  // Tab Horarios
  const horTabla = el.querySelector('#tab-school-hor .schedule-table tbody');
  if (horTabla && s.horarios && Object.keys(s.horarios).length) {
    const dias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
    const turnos = ['manana', 'tarde', 'noche'];
    const iconos = { manana: '🌅', tarde: '☀️', noche: '🌙' };
    const labels = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
    const clases = { manana: 'sched-morning', tarde: 'sched-afternoon', noche: 'sched-night' };

    horTabla.innerHTML = turnos.map(t => `
      <tr>
        <td><span style="font-size:11px">${iconos[t]} ${labels[t]}</span></td>
        ${dias.map(d => {
      const hora = s.horarios[d]?.[t];
      return hora
        ? `<td><span class="${clases[t]}">${hora}</span></td>`
        : `<td><span class="sched-empty">—</span></td>`;
    }).join('')}
      </tr>`).join('');
  }

  // Profesores (trainers de la escuela)
  // Por ahora mantenemos los placeholder si no hay datos
}

// ── Render detalle de entrenador ──────────────────────────────
function renderTrainerDetail(t) {
  if (!t) return;
  const el = document.getElementById('screen-trainer');
  if (!el) return;

  const nameEl = el.querySelector('.trainer-hero-name');
  if (nameEl) nameEl.textContent = t.nombre.toUpperCase();

  const photoEl = el.querySelector('.trainer-hero-photo');
  if (photoEl) {
    if (t.foto_url) {
      photoEl.style.backgroundImage = `url(${t.foto_url})`;
      photoEl.style.backgroundSize = 'cover';
      photoEl.style.backgroundPosition = 'center';
      photoEl.textContent = '';
    } else {
      photoEl.style.backgroundImage = '';
      photoEl.textContent = '🥋';
    }
  }

  const tagsDiv = el.querySelector('.trainer-hero div[style*="gap:8px"]');
  if (tagsDiv && t.disciplinas?.length) {
    tagsDiv.innerHTML = t.disciplinas.map(d => `<span class="tag">${esc(d)}</span>`).join('');
  }

  const bioP = el.querySelector('.trainer-hero p');
  if (bioP && t.bio) bioP.textContent = t.bio;
}

// ── Render detalle de evento ──────────────────────────────────
function renderEventDetail(ev) {
  if (!ev) return;
  const el = document.getElementById('screen-event');
  if (!el) return;

  // Poster
  const posterEl = el.querySelector('.event-poster-detail');
  if (posterEl) {
    if (ev.poster_url) {
      posterEl.style.backgroundImage = `url(${ev.poster_url})`;
      posterEl.style.backgroundSize = 'cover';
      posterEl.style.backgroundPosition = 'center';
      posterEl.textContent = '';
    } else {
      posterEl.style.backgroundImage = '';
      posterEl.textContent = '🏆';
    }
  }

  const titleEl = el.querySelector('.event-detail-title');
  if (titleEl) titleEl.textContent = ev.nombre.toUpperCase();

  const orgEl = el.querySelector('.event-detail-org');
  if (orgEl) orgEl.textContent = ev.organizador;

  // Detalles
  const detalles = {
    ciudad: ev.ciudad,
    fecha: ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—',
    disciplina: ev.disciplina,
    organizador: ev.organizador,
  };
  const detItems = el.querySelectorAll('.event-detail-item');
  const keys = ['ciudad', 'fecha', 'disciplina', 'organizador'];
  detItems.forEach((item, i) => {
    const val = item.querySelector('.event-detail-val');
    if (val && detalles[keys[i]]) val.textContent = detalles[keys[i]];
  });

  // Botón de reglamento
  const regBtn = document.getElementById('reglamento-btn');
  if (regBtn) {
    if (ev.reglamento_url) {
      regBtn.href = ev.reglamento_url;
      regBtn.style.opacity = '1';
      regBtn.style.pointerEvents = 'auto';
    } else {
      regBtn.href = '#';
      regBtn.style.opacity = '0.4';
      regBtn.style.pointerEvents = 'none';
    }
  }
}

// ===== STORE DE ITEMS — evita JSON en atributos onclick =======
// Los datos se guardan en este mapa y se recuperan por ID al hacer clic
const itemStore = { schools: {}, trainers: {}, events: {} };

function storeItem(tipo, item) {
  itemStore[tipo][item.id] = item;
  return item.id;
}

function openDetail(tipo, id) {
  const item = itemStore[tipo][id];
  // tipo → screenName mapping
  const screen = { schools: 'school', trainers: 'trainer', events: 'event' }[tipo];
  if (screen) goTo(screen, item || null);
}

// ===== LISTADOS — CARGAR DESDE API ==========================
function renderSchoolCard(s) {
  const waUrl = buildWaUrl(s.whatsapp, s.nombre, 'escuela');
  const sid = storeItem('schools', s);
  const imgHtml = s.foto_url
    ? `<div class="school-card-img" style="background-image:url('${s.foto_url}');background-size:cover;background-position:center;font-size:0"></div>`
    : `<div class="school-card-img" style="font-size:64px">🏫</div>`;
  return `<div class="card listing-school-card"
    data-city="${s.ciudad?.toLowerCase()}"
    data-disciplines="${(s.disciplinas || []).join(' ').toLowerCase()}"
    onclick="openDetail('schools','${sid}')">
    ${imgHtml}
    <div class="school-card-body">
      <div class="school-card-name">${esc(s.nombre)}</div>
      <div class="school-card-city">📍 ${esc(s.ciudad)}</div>
      <div style="margin-bottom:4px">${(s.disciplinas || []).slice(0, 3).map(d => `<span class="tag">${d}</span>`).join(' ')}</div>
      <div class="school-card-foot">
        <div class="stars">${'★'.repeat(Math.round(s.rating || 0))}${'☆'.repeat(5 - Math.round(s.rating || 0))}</div>
        <a class="wa-icon" href="${waUrl}" target="_blank"
           onclick="event.stopPropagation()" title="Contactar por WhatsApp">📲</a>
      </div>
    </div></div>`;
}

function renderTrainerCard(t) {
  const waUrl = buildWaUrl(t.whatsapp, t.nombre, 'entrenador');
  const tid = storeItem('trainers', t);
  const fotoHtml = t.foto_url
    ? `<div class="trainer-photo" style="background-image:url('${t.foto_url}');background-size:cover;background-position:center;font-size:0"></div>`
    : `<div class="trainer-photo" style="font-size:28px">🥋</div>`;
  return `<div class="card trainer-card"
    data-city="${t.ciudad?.toLowerCase()}"
    data-disciplines="${(t.disciplinas || []).join(' ').toLowerCase()}"
    onclick="openDetail('trainers','${tid}')">
    <div class="trainer-photo-wrap">${fotoHtml}</div>
    <div class="trainer-card-body">
      <div class="trainer-name">${esc(t.nombre)}</div>
      <div class="tags-wrap">${(t.disciplinas || []).slice(0, 2).map(d => `<span class="tag">${d}</span>`).join('')}</div>
      <div class="trainer-exp">⚡ ${esc(t.experiencia_anos)} años de exp.</div>
      <a class="wa-trainer-btn" href="${waUrl}" target="_blank"
         onclick="event.stopPropagation()" title="Agendar por WhatsApp">
        📲 Agendar
      </a>
    </div></div>`;
}

function renderEventCard(ev) {
  const waUrl = buildWaUrl(ev.whatsapp, ev.nombre, 'evento');
  const eid = storeItem('events', ev);
  const fecha = ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '';
  return `<div class="card event-card"
    data-city="${ev.ciudad?.toLowerCase()}"
    data-disciplines="${ev.disciplina?.toLowerCase()}"
    onclick="openDetail('events','${eid}')">
    <div class="event-poster" ${ev.poster_url ? `style="background-image:url('${ev.poster_url}');background-size:cover;background-position:center;font-size:0"` : ''}>
      ${ev.poster_url ? '' : '🏆'}
    </div>
    <div class="event-card-body">
      <div class="event-name">${esc(ev.nombre)}</div>
      <span class="tag">${esc(ev.disciplina)}</span>
      <div class="event-date">📅 ${fecha} · ${esc(ev.ciudad)}</div>
    </div></div>`;
}

async function loadSchools() {
  const grid = document.getElementById('grid-schools');
  const count = document.getElementById('count-schools');
  if (!grid || grid.dataset.loaded === 'true') {
    if (grid) listingFilterApply('schools', 'sl');
    return;
  }
  const skeleton = '<div class="listing-skeleton">Cargando...</div>';
  const hadCards = grid.querySelectorAll('[data-city]').length > 0;
  if (!hadCards) grid.innerHTML = skeleton;
  try {
    const data = await apiFetch('/schools');
    if (!hadCards) grid.innerHTML = '';
    if (data.schools.length) {
      const html = data.schools.map(renderSchoolCard).join('');
      grid.insertAdjacentHTML('beforeend', html);
    }
    grid.dataset.loaded = 'true';
    if (count) count.innerHTML = `<strong>${data.total}</strong> escuelas encontradas`;
    document.getElementById('empty-schools')?.classList.toggle('visible', data.schools.length === 0);
    listingFilterApply('schools', 'sl');
  } catch {
    if (!hadCards) grid.innerHTML = '';
  }
}

async function loadTrainers() {
  const grid = document.getElementById('grid-trainers');
  const count = document.getElementById('count-trainers');
  if (!grid || grid.dataset.loaded === 'true') {
    if (grid) listingFilterApply('trainers', 'tr');
    return;
  }
  const hadCards = grid.querySelectorAll('[data-city]').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando...</div>';
  try {
    const data = await apiFetch('/trainers');
    if (!hadCards) grid.innerHTML = '';
    if (data.trainers.length) {
      const html = data.trainers.map(renderTrainerCard).join('');
      grid.insertAdjacentHTML('beforeend', html);
    }
    grid.dataset.loaded = 'true';
    if (count) count.innerHTML = `<strong>${data.total}</strong> entrenadores encontrados`;
    document.getElementById('empty-trainers')?.classList.toggle('visible', data.trainers.length === 0);
    listingFilterApply('trainers', 'tr');
  } catch {
    if (!hadCards) grid.innerHTML = '';
  }
}

async function loadEvents() {
  const grid = document.getElementById('grid-events');
  const count = document.getElementById('count-events');
  if (!grid || grid.dataset.loaded === 'true') {
    if (grid) listingFilterApply('events', 'ev');
    return;
  }
  const hadCards = grid.querySelectorAll('[data-city]').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando eventos...</div>';
  try {
    const data = await apiFetch('/events');
    if (!hadCards) grid.innerHTML = '';
    if (data.events.length) {
      const html = data.events.map(renderEventCard).join('');
      grid.insertAdjacentHTML('beforeend', html);
    }
    grid.dataset.loaded = 'true';
    if (count) count.innerHTML = `<strong>${data.total}</strong> eventos encontrados`;
    document.getElementById('empty-events')?.classList.toggle('visible', data.events.length === 0);
    listingFilterApply('events', 'ev');
  } catch {
    if (!hadCards) grid.innerHTML = '';
  }
}

function listingFilterApply(listId, prefix) {
  const screenEl = document.getElementById('screen-' + listId);
  if (!screenEl) return;

  // Buscamos las pills activas SOLO dentro de la pantalla actual para evitar conflictos entre pantallas
  const activeCiudad = (screenEl.querySelector(`.pill.active[data-group*="ciudad"]`)?.dataset.value || 'todas').toLowerCase().trim();
  const activeDisc = (screenEl.querySelector(`.pill.active[data-group*="disc"]`)?.dataset.value || 'todas').toLowerCase().trim();

  const gridEl = document.getElementById('grid-' + listId);
  const countEl = document.getElementById('count-' + listId);
  if (!gridEl) return;
  let visible = 0;
  gridEl.querySelectorAll('.card[data-city]').forEach(card => {
    const city = (card.dataset.city || '').toLowerCase();
    const disc = (card.dataset.disciplines || '').toLowerCase();
    const ok = (activeCiudad === 'todas' || city === activeCiudad) &&
      (activeDisc === 'todas' || disc.includes(activeDisc));
    card.classList.toggle('card-hidden', !ok);
    if (ok) visible++;
  });
  const noun = { schools: 'escuelas', trainers: 'entrenadores', events: 'eventos' }[listId];
  if (countEl) countEl.innerHTML = `<strong>${visible}</strong> ${noun} encontrad${listId === 'events' ? 'o' : 'a'}s`;
}

function listingFilter(el, group, listId) {
  const wasActive = el.classList.contains('active');

  // Buscamos los botones del grupo SOLO dentro de su contenedor de pantalla
  const container = el.closest('.screen') || document;
  container.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));

  // Si NO estaba activa, la activamos. Si YA estaba activa, el código de arriba ya la limpió (toggle off)
  if (!wasActive) el.classList.add('active');

  const prefix = { schools: 'sl', trainers: 'tr', events: 'ev' }[listId] || '';
  listingFilterApply(listId, prefix);
  const emptyEl = document.getElementById('empty-' + listId);
  const visible = document.getElementById('grid-' + listId)?.querySelectorAll('.card[data-city]:not(.card-hidden)').length || 0;
  if (emptyEl) emptyEl.classList.toggle('visible', visible === 0);
}

// ===== PUBLISH MODAL =========================================
let publishType = null;

function openPublishModal(type) {
  publishType = type;
  const modal = document.getElementById('publishModal');
  if (!modal) return;
  const titles = { trainer: '🥊 Publicar entrenador', school: '🏫 Publicar escuela', event: '🏆 Publicar evento' };
  document.getElementById('publishModalTitle').textContent = titles[type] || 'Publicar';
  if (type === 'trainer') document.getElementById('publishForm').innerHTML = buildTrainerForm();
  else if (type === 'school') document.getElementById('publishForm').innerHTML = buildSchoolForm();
  else if (type === 'event') document.getElementById('publishForm').innerHTML = buildEventForm();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function buildTrainerForm() {
  return `
    <div class="form-group">
      <label class="form-label">Foto de perfil</label>
      <div class="foto-upload-wrap" onclick="document.getElementById('pub-foto-input').click()">
        <div class="foto-preview" id="pub-foto-preview">
          <span style="font-size:32px">🥋</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir foto</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp"
               style="display:none" onchange="previewFoto(this,'pub-foto-preview')">
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">JPG, PNG o WebP · máx 5 MB · se sube al guardar</div>
    </div>
    <div class="form-group"><label class="form-label">Nombre completo <span style="color:var(--red)">*</span></label>
      <input id="pub-nombre" class="form-input" type="text" placeholder="Ej: Carlos Medina"></div>
    <div class="form-group"><label class="form-label">WhatsApp <span style="color:var(--red)">*</span></label>
      <input id="pub-whatsapp" class="form-input" type="tel" placeholder="+57 300 123 4567"></div>
    <div class="form-group"><label class="form-label">Ciudad <span style="color:var(--red)">*</span></label>
      <select id="pub-ciudad" class="form-input"><option value="">Ciudad</option><option>Cali</option><option>Bogotá</option></select></div>
    <div class="form-group"><label class="form-label">Disciplinas</label>
      <input id="pub-disciplinas" class="form-input" type="text" placeholder="BJJ, Muay Thai, MMA (separar con comas)"></div>
    <div class="form-group"><label class="form-label">Años de experiencia</label>
      <input id="pub-exp" class="form-input" type="number" min="0" max="50" placeholder="0"></div>
    <div class="form-group"><label class="form-label">Biografía</label>
      <textarea id="pub-bio" class="form-input" rows="3" placeholder="Describe tu experiencia..." style="resize:vertical;min-height:80px"></textarea></div>
    <div id="pub-error" class="form-error" style="margin-bottom:12px"></div>
    <button class="btn-red" style="width:100%;justify-content:center" onclick="submitPublish()">Publicar entrenador</button>`;
}

function buildSchoolForm() {
  const dias = [
    { key: 'lun', label: 'Lun' }, { key: 'mar', label: 'Mar' },
    { key: 'mie', label: 'Mié' }, { key: 'jue', label: 'Jue' },
    { key: 'vie', label: 'Vie' }, { key: 'sab', label: 'Sáb' },
  ];

  // Cada día arranca con 1 slot vacío + botón "+"
  const diaBlocks = dias.map(d => `
    <div class="sched-day-block" data-day="${d.key}">
      <div class="sched-day-label">${d.label}</div>
      <div class="sched-slots" id="slots-${d.key}">
        <div class="sched-slot">
          <input type="text" class="sched-slot-input" data-day="${d.key}"
            placeholder="7:00 AM"
            style="flex:1;background:var(--black3);border:1px solid var(--gray2);color:var(--white);border-radius:4px;padding:5px 8px;font-size:12px;font-family:'Outfit',sans-serif">
          <button type="button" class="sched-slot-remove" onclick="removeSchedSlot(this)" title="Quitar">×</button>
        </div>
      </div>
      <button type="button" class="sched-add-slot" onclick="addSchedSlot('${d.key}')" title="Agregar horario">+</button>
    </div>`).join('');

  return `
    <div class="form-group">
      <label class="form-label">Foto principal</label>
      <div class="foto-upload-wrap" onclick="document.getElementById('pub-foto-input').click()">
        <div class="foto-preview foto-preview--wide" id="pub-foto-preview">
          <span style="font-size:32px">🏫</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir foto</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp"
               style="display:none" onchange="previewFoto(this,'pub-foto-preview')">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Galería de instalaciones <span style="color:var(--gray);font-size:11px">(máx 4 fotos)</span></label>
      <div class="galeria-preview-wrap" id="galeria-preview-wrap">
        <div class="galeria-add-btn" onclick="document.getElementById('pub-galeria-input').click()">
          <span style="font-size:20px">+</span>
          <span style="font-size:11px;color:var(--gray)">Agregar foto</span>
        </div>
      </div>
      <input id="pub-galeria-input" type="file" accept="image/jpeg,image/png,image/webp"
             multiple style="display:none" onchange="addGaleriaPreview(this)">
    </div>

    <div class="form-group"><label class="form-label">Nombre de la escuela <span style="color:var(--red)">*</span></label>
      <input id="pub-nombre" class="form-input" type="text" placeholder="Ej: Alliance BJJ Cali"></div>
    <div class="form-group"><label class="form-label">WhatsApp <span style="color:var(--red)">*</span></label>
      <input id="pub-whatsapp" class="form-input" type="tel" placeholder="+57 300 123 4567"></div>
    <div class="form-group"><label class="form-label">Ciudad <span style="color:var(--red)">*</span></label>
      <select id="pub-ciudad" class="form-input"><option value="">Ciudad</option><option>Cali</option><option>Bogotá</option></select></div>
    <div class="form-group"><label class="form-label">Dirección</label>
      <input id="pub-direccion" class="form-input" type="text" placeholder="Av. 6N #28-15, San Fernando"></div>
    <div class="form-group"><label class="form-label">Disciplinas</label>
      <input id="pub-disciplinas" class="form-input" type="text" placeholder="BJJ, Boxeo, Muay Thai (separar con comas)"></div>
    <div class="form-group"><label class="form-label">Descripción</label>
      <textarea id="pub-bio" class="form-input" rows="3" placeholder="Describe tu academia, logros, años de experiencia..." style="resize:vertical;min-height:80px"></textarea></div>

    <div class="form-group">
      <label class="form-label">Horarios por día
        <span style="font-size:11px;color:var(--gray);font-weight:400"> — usa el botón <strong style="color:var(--red)">+</strong> para añadir más franjas</span>
      </label>
      <div class="sched-days-grid">${diaBlocks}</div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">Ej: "7:00 AM", "12:30 PM – 2:00 PM". Deja vacío si no hay clase ese día.</div>
    </div>

    <div id="pub-error" class="form-error" style="margin-bottom:12px"></div>
    <button class="btn-red" style="width:100%;justify-content:center" onclick="submitPublish()">Publicar escuela</button>`;
}

function buildEventForm() {
  return `
    <div class="form-group">
      <label class="form-label">Poster del evento</label>
      <div class="foto-upload-wrap" onclick="document.getElementById('pub-foto-input').click()">
        <div class="foto-preview foto-preview--poster" id="pub-foto-preview">
          <span style="font-size:32px">🏆</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir poster</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp"
               style="display:none" onchange="previewFoto(this,'pub-foto-preview')">
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">JPG, PNG o WebP · máx 5 MB</div>
    </div>

    <div class="form-group">
      <label class="form-label">Reglamento del campeonato <span style="color:var(--gray);font-size:11px">(PDF)</span></label>
      <div class="reglamento-upload-wrap" id="reglamento-wrap">
        <div class="reglamento-add-btn" onclick="document.getElementById('pub-reglamento-input').click()">
          <span style="font-size:22px">📄</span>
          <span style="font-size:12px;color:var(--gray)">Subir PDF del reglamento</span>
        </div>
        <div class="reglamento-file-name" id="reglamento-file-name" style="display:none;font-size:12px;color:var(--wa);padding:10px 14px;background:var(--black3);border-radius:6px;display:flex;align-items:center;gap:8px">
          <span>📄</span><span id="reglamento-name-text"></span>
          <button type="button" onclick="removeReglamento()" style="margin-left:auto;background:none;border:none;color:var(--gray);cursor:pointer;font-size:16px">×</button>
        </div>
      </div>
      <input id="pub-reglamento-input" type="file" accept="application/pdf"
             style="display:none" onchange="previewReglamento(this)">
      <div style="font-size:11px;color:var(--gray);margin-top:4px">Solo PDF · máx 15 MB</div>
    </div>

    <div class="form-group"><label class="form-label">Nombre del evento <span style="color:var(--red)">*</span></label>
      <input id="pub-nombre" class="form-input" type="text" placeholder="Ej: Copa Valle BJJ Open 2025"></div>
    <div class="form-group"><label class="form-label">Organizador <span style="color:var(--red)">*</span></label>
      <input id="pub-organizador" class="form-input" type="text" placeholder="Ej: Federación Colombiana de BJJ"></div>
    <div class="form-group"><label class="form-label">WhatsApp del organizador <span style="color:var(--red)">*</span></label>
      <input id="pub-whatsapp" class="form-input" type="tel" placeholder="+57 300 123 4567"></div>
    <div class="form-group"><label class="form-label">Ciudad <span style="color:var(--red)">*</span></label>
      <select id="pub-ciudad" class="form-input"><option value="">Ciudad</option><option>Cali</option><option>Bogotá</option></select></div>
    <div class="form-group"><label class="form-label">Disciplina <span style="color:var(--red)">*</span></label>
      <select id="pub-disciplina" class="form-input">
        <option value="">Selecciona disciplina</option>
        <option>BJJ</option><option>Boxeo</option><option>Muay Thai</option>
        <option>MMA</option><option>Karate</option><option>Judo</option>
        <option>Taekwondo</option><option>Wrestling</option><option>Kickboxing</option>
      </select></div>
    <div class="form-group"><label class="form-label">Fecha y hora <span style="color:var(--red)">*</span></label>
      <input id="pub-fecha" class="form-input" type="datetime-local"></div>
    <div class="form-group"><label class="form-label">Descripción</label>
      <textarea id="pub-bio" class="form-input" rows="3" placeholder="Describe el evento, categorías, requisitos de inscripción..." style="resize:vertical;min-height:80px"></textarea></div>

    <div id="pub-error" class="form-error" style="margin-bottom:12px"></div>
    <button class="btn-red" style="width:100%;justify-content:center" onclick="submitPublish()">Publicar evento</button>`;
}

// Galería de instalaciones — archivos en memoria
let galeriaFiles = [];

function closePublishModal() {
  document.getElementById('publishModal')?.classList.remove('open');
  document.body.style.overflow = '';
  publishType = null;
  galeriaFiles = [];
  reglamentoFile = null;
}

// Agrega thumbnails al wrap con botón de quitar
// ── Horario dinámico — agregar/quitar slots por día ───────────
function addSchedSlot(dia) {
  const container = document.getElementById('slots-' + dia);
  if (!container) return;
  const slot = document.createElement('div');
  slot.className = 'sched-slot';
  slot.innerHTML = `
    <input type="text" class="sched-slot-input" data-day="${dia}"
      placeholder="Ej: 6:30 PM"
      style="flex:1;background:var(--black3);border:1px solid var(--gray2);color:var(--white);border-radius:4px;padding:5px 8px;font-size:12px;font-family:'Outfit',sans-serif">
    <button type="button" class="sched-slot-remove" onclick="removeSchedSlot(this)" title="Quitar">×</button>`;
  container.appendChild(slot);
  slot.querySelector('input').focus();
}

function removeSchedSlot(btn) {
  const slot = btn.closest('.sched-slot');
  const container = slot?.parentElement;
  // Mantener al menos 1 slot por día
  if (container && container.querySelectorAll('.sched-slot').length > 1) {
    slot.remove();
  } else {
    // Si es el único, solo limpiar el valor
    const input = slot?.querySelector('input');
    if (input) { input.value = ''; input.focus(); }
  }
}

// ── Reglamento PDF ────────────────────────────────────────────
let reglamentoFile = null;

function previewReglamento(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast('❌ El PDF supera los 15 MB permitidos');
    input.value = '';
    return;
  }
  reglamentoFile = file;
  const addBtn = document.querySelector('.reglamento-add-btn');
  const nameDiv = document.getElementById('reglamento-file-name');
  const nameText = document.getElementById('reglamento-name-text');
  if (addBtn) addBtn.style.display = 'none';
  if (nameDiv) nameDiv.style.display = 'flex';
  if (nameText) nameText.textContent = file.name;
}

function removeReglamento() {
  reglamentoFile = null;
  const input = document.getElementById('pub-reglamento-input');
  const addBtn = document.querySelector('.reglamento-add-btn');
  const nameDiv = document.getElementById('reglamento-file-name');
  if (input) input.value = '';
  if (addBtn) addBtn.style.display = 'flex';
  if (nameDiv) nameDiv.style.display = 'none';
}

function addGaleriaPreview(input) {
  const MAX = 4;
  const wrap = document.getElementById('galeria-preview-wrap');
  if (!wrap) return;
  Array.from(input.files).forEach(file => {
    if (galeriaFiles.length >= MAX) { showToast('⚠️ Máximo 4 fotos en la galería'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('❌ ' + file.name + ' supera 5 MB'); return; }
    const idx = galeriaFiles.push(file) - 1;
    const thumb = document.createElement('div');
    thumb.className = 'galeria-thumb';
    const reader = new FileReader();
    reader.onload = e => { thumb.style.backgroundImage = 'url(' + e.target.result + ')'; };
    reader.readAsDataURL(file);
    const rm = document.createElement('button');
    rm.textContent = '×'; rm.className = 'galeria-thumb-remove';
    rm.onclick = () => {
      galeriaFiles.splice(idx, 1); thumb.remove();
      const ab = wrap.querySelector('.galeria-add-btn');
      if (ab) ab.style.display = 'flex';
    };
    thumb.appendChild(rm);
    const addBtn = wrap.querySelector('.galeria-add-btn');
    wrap.insertBefore(thumb, addBtn);
  });
  const addBtn = wrap.querySelector('.galeria-add-btn');
  if (addBtn) addBtn.style.display = galeriaFiles.length >= MAX ? 'none' : 'flex';
  input.value = '';
}

// Preview foto principal
function previewFoto(input, previewId) {
  const file = input.files[0];
  const preview = document.getElementById(previewId);
  if (!file || !preview) return;
  if (file.size > 5 * 1024 * 1024) { showToast('❌ La imagen supera los 5 MB'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    preview.style.backgroundImage = 'url(' + e.target.result + ')';
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.innerHTML = '';
  };
  reader.readAsDataURL(file);
}

async function submitPublish() {
  const nombre = document.getElementById('pub-nombre')?.value.trim();
  const whatsapp = document.getElementById('pub-whatsapp')?.value.trim();
  const ciudad = document.getElementById('pub-ciudad')?.value;
  const errEl = document.getElementById('pub-error');
  const btn = document.querySelector('#publishForm .btn-red');

  if (!nombre || !whatsapp || !ciudad) {
    if (errEl) { errEl.textContent = 'Nombre, WhatsApp y ciudad son obligatorios.'; errEl.classList.add('visible'); }
    return;
  }
  if (errEl) errEl.classList.remove('visible');
  if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

  try {
    const token = getToken();
    let creado, id;

    if (publishType === 'trainer') {
      const disciplinas = (document.getElementById('pub-disciplinas')?.value || '')
        .split(',').map(d => d.trim()).filter(Boolean);
      creado = await apiFetch('/trainers', {
        method: 'POST', body: JSON.stringify({
          nombre, whatsapp, ciudad, disciplinas,
          bio: document.getElementById('pub-bio')?.value.trim() || null,
          experiencia_anos: parseInt(document.getElementById('pub-exp')?.value) || 0,
        })
      });
      id = creado.trainer.id;

    } else if (publishType === 'school') {
      const disciplinas = (document.getElementById('pub-disciplinas')?.value || '')
        .split(',').map(d => d.trim()).filter(Boolean);

      // Recoger horarios multi-slot: { lun: ['7:00 AM', '6:30 PM'], mar: ['7:00 AM'], ... }
      const horarios = {};
      document.querySelectorAll('.sched-slot-input').forEach(inp => {
        const val = inp.value.trim();
        if (!val) return;
        const dia = inp.dataset.day;
        if (!horarios[dia]) horarios[dia] = [];
        horarios[dia].push(val);
      });

      creado = await apiFetch('/schools', {
        method: 'POST', body: JSON.stringify({
          nombre, whatsapp, ciudad, disciplinas, horarios,
          descripcion: document.getElementById('pub-bio')?.value.trim() || null,
          direccion: document.getElementById('pub-direccion')?.value.trim() || null,
        })
      });
      id = creado.school.id;

    } else if (publishType === 'event') {
      const disciplina = document.getElementById('pub-disciplina')?.value;
      const fecha = document.getElementById('pub-fecha')?.value;
      const organizador = document.getElementById('pub-organizador')?.value.trim();
      if (!disciplina || !fecha || !organizador) {
        if (errEl) { errEl.textContent = 'Disciplina, organizador y fecha son obligatorios.'; errEl.classList.add('visible'); }
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar evento'; }
        return;
      }
      creado = await apiFetch('/events', {
        method: 'POST', body: JSON.stringify({
          nombre, whatsapp, ciudad, disciplina, fecha, organizador,
          descripcion: document.getElementById('pub-bio')?.value.trim() || null,
        })
      });
      id = creado.event.id;
    }

    // Subir foto principal
    const fotoInput = document.getElementById('pub-foto-input');
    if (fotoInput?.files?.length > 0 && id) {
      if (btn) btn.textContent = 'Subiendo foto...';
      const paths = { trainer: '/entrenador/' + id + '/foto', school: '/escuela/' + id + '/foto', event: '/evento/' + id + '/poster' };
      const fd = new FormData();
      fd.append('foto', fotoInput.files[0]);
      await fetch(API_URL + '/upload' + paths[publishType], {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd,
      }).catch(e => console.warn('Foto no subida:', e));
    }

    // Subir galería (solo escuelas)
    if (publishType === 'school' && galeriaFiles.length > 0 && id) {
      if (btn) btn.textContent = 'Subiendo galería (' + galeriaFiles.length + ')...';
      const fd = new FormData();
      galeriaFiles.forEach(f => fd.append('galeria', f));
      await fetch(API_URL + '/upload/escuela/' + id + '/galeria', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd,
      }).catch(e => console.warn('Galería no subida:', e));
    }

    // Subir reglamento PDF (solo eventos)
    if (publishType === 'event' && reglamentoFile && id) {
      if (btn) btn.textContent = 'Subiendo reglamento...';
      const fd = new FormData();
      fd.append('reglamento', reglamentoFile);
      await fetch(API_URL + '/upload/evento/' + id + '/reglamento', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd,
      }).catch(e => console.warn('Reglamento no subido:', e));
    }

    closePublishModal();
    const labels = { trainer: 'Entrenador', school: 'Escuela', event: 'Evento' };
    showToast('✅ ' + (labels[publishType] || 'Contenido') + ' publicado correctamente');
    await loadProfileData();
    if (publishType === 'trainer') loadTrainers();
    else if (publishType === 'school') loadSchools();
    else if (publishType === 'event') loadEvents();

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar ' + (publishType || ''); }
    if (errEl) { errEl.textContent = err.message || 'Error al publicar'; errEl.classList.add('visible'); }
  }
}

async function deleteTrainer(id) {
  if (!confirm('¿Eliminar este entrenador?')) return;
  try {
    await apiFetch('/trainers/' + id, { method: 'DELETE' });
    showToast('🗑 Entrenador eliminado');
    await loadProfileData();
    loadTrainers();
  } catch (err) { showToast('❌ ' + err.message); }
}

// ===== VERIFICACIÓN DE EMAIL =================================

// Muestra la pantalla de "revisa tu correo" dentro del login-box
function mostrarPantallaVerificacion(email, nombre, esDesdLogin = false) {
  // Ocultar todos los pasos del registro y el form de login
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = 'none';
  });
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'none';

  // Mostrar panel de verificación (crearlo si no existe)
  let panel = document.getElementById('verificacion-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'verificacion-panel';
    document.querySelector('.login-box')?.appendChild(panel);
  }

  const saludo = nombre ? `¡Casi listo, ${nombre.split(' ')[0]}!` : '¡Revisa tu correo!';

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:56px;margin-bottom:16px">📧</div>
      <h2 style="font-size:22px;margin-bottom:8px;color:var(--white)">${saludo}</h2>
      <p style="font-size:14px;color:var(--gray);line-height:1.7;margin-bottom:8px">
        Enviamos un enlace de verificación a:
      </p>
      <div style="background:var(--black3);border:1px solid var(--gray2);border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:14px;font-weight:600;color:var(--white)">
        ${esc(email)}
      </div>
      <p style="font-size:13px;color:var(--gray);line-height:1.7;margin-bottom:24px">
        Haz clic en el enlace del correo para activar tu cuenta.<br>
        El enlace expira en <strong style="color:var(--gold)">24 horas</strong>.
      </p>

      <div id="reenvio-msg" style="display:none;margin-bottom:16px;font-size:13px;color:var(--wa)"></div>

      <button class="btn-outline-red" style="width:100%;justify-content:center;margin-bottom:12px"
        onclick="reenviarVerificacion('${esc(email)}', this)">
        🔄 Reenviar correo de verificación
      </button>
      <button style="background:none;border:none;color:var(--gray);font-size:13px;cursor:pointer;text-decoration:underline"
        onclick="ocultarVerificacion(); showLogin()">
        ← Volver al inicio de sesión
      </button>
    </div>`;

  // Navegar a la pantalla de login si no estamos ahí ya
  goTo('login');
}

async function reenviarVerificacion(email, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }
  try {
    await apiFetch('/auth/reenviar-verificacion', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const msg = document.getElementById('reenvio-msg');
    if (msg) {
      msg.textContent = '✅ Correo enviado. Revisa tu bandeja de entrada y la carpeta de spam.';
      msg.style.display = 'block';
    }
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Reenviar correo de verificación'; }
  } catch (err) {
    const msg = document.getElementById('reenvio-msg');
    if (msg) {
      msg.textContent = err.message || 'Error al reenviar';
      msg.style.color = 'var(--red)';
      msg.style.display = 'block';
    }
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Reenviar correo de verificación'; }
  }
}

function ocultarVerificacion() {
  const panel = document.getElementById('verificacion-panel');
  if (panel) panel.style.display = 'none';
}

// Procesa ?verificar=TOKEN en la URL al cargar la página
async function procesarVerificacionEnUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('verificar');
  if (!token) return;

  // Limpiar la URL
  window.history.replaceState({}, '', window.location.pathname);

  // Mostrar loader en la pantalla de login
  goTo('login');
  const box = document.querySelector('.login-box');
  if (box) {
    box.innerHTML = `<div style="text-align:center;padding:40px 0">
      <div style="font-size:40px;margin-bottom:16px">⏳</div>
      <p style="color:var(--gray)">Verificando tu cuenta...</p>
    </div>`;
  }

  try {
    const data = await apiFetch('/auth/verificar-email?token=' + encodeURIComponent(token));

    if (box) {
      box.innerHTML = `<div style="text-align:center;padding:40px 0">
        <div style="font-size:56px;margin-bottom:16px">🎉</div>
        <h2 style="font-size:22px;margin-bottom:12px;color:var(--white)">¡Cuenta verificada!</h2>
        <p style="font-size:14px;color:var(--gray);margin-bottom:24px;line-height:1.7">
          Tu email ha sido confirmado. Ya puedes iniciar sesión en DOJX.
        </p>
        <button class="btn-red" style="width:100%;justify-content:center"
          onclick="location.reload()">
          Iniciar sesión →
        </button>
      </div>`;
    }

  } catch (err) {
    const esExpirado = err.codigo === 'TOKEN_EXPIRADO';
    if (box) {
      box.innerHTML = `<div style="text-align:center;padding:40px 0">
        <div style="font-size:56px;margin-bottom:16px">${esExpirado ? '⏰' : '❌'}</div>
        <h2 style="font-size:20px;margin-bottom:12px;color:var(--white)">
          ${esExpirado ? 'Enlace expirado' : 'Enlace inválido'}
        </h2>
        <p style="font-size:14px;color:var(--gray);margin-bottom:24px;line-height:1.7">
          ${esExpirado
          ? 'El enlace de verificación venció. Inicia sesión con tu contraseña para solicitar uno nuevo.'
          : err.message || 'El enlace no es válido o ya fue usado.'}
        </p>
        <button class="btn-red" style="width:100%;justify-content:center"
          onclick="location.reload()">
          Ir al inicio de sesión
        </button>
      </div>`;
    }
  }
}

// ===== DISC & SCHEDULE =======================================
function switchTab(btn, tabId) {
  const parent = btn.closest('.tabs');
  if (!parent) return;
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const screen = btn.closest('.screen, .content-wrap, .login-box');
  if (screen) {
    screen.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
  }
  // Cargar datos del admin al cambiar tab
  if (tabId === 'admin-tab-resenas') adminCargarResenas();
  if (tabId === 'admin-tab-pagos') adminCargarPagos();
}

function toggleDisc(el) { el.classList.toggle('selected'); }

function selectSched(el) {
  document.querySelectorAll('.sched-opt').forEach(s => {
    s.classList.remove('selected');
    const st = s.querySelector('.sched-time');
    if (st) st.style.color = '';
  });
  el.classList.add('selected');
  const st = el.querySelector('.sched-time');
  if (st) st.style.color = 'var(--red)';
}

// ===== TOAST =================================================
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ===== WOMPI — PAGOS =========================================
async function iniciarPago(plan) {
  // Si no está logueado — redirigir a login con mensaje
  if (!currentUser) {
    showToast('⚠️ Debes iniciar sesión para adquirir un plan');
    goTo('login');
    return;
  }

  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Preparando pago...'; }

  try {
    const config = await apiFetch('/subscriptions/crear-pago', {
      method: 'POST', body: JSON.stringify({ plan }),
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Comenzar'; }

    // Verificar que el widget de Wompi esté disponible
    if (typeof WidgetCheckout === 'undefined') {
      showToast('⚠️ Wompi no está configurado aún. Contacta al administrador.');
      return;
    }

    // Verificar que venga la llave pública del backend
    if (!config.public_key || config.public_key.includes('xxxxxxxx')) {
      showToast('⚠️ Pagos no disponibles todavía. Contáctanos por WhatsApp.');
      return;
    }

    const checkout = new WidgetCheckout({
      currency: config.currency,
      amountInCents: config.amount_in_cents,
      reference: config.reference,
      publicKey: config.public_key,
      signature: { integrity: config.signature },
      redirectUrl: config.redirect_url,
      customerData: { email: currentUser.email, fullName: currentUser.nombre },
    });

    checkout.open((result) => {
      const { transaction } = result;
      if (transaction?.status === 'APPROVED') {
        mostrarResultadoPago('aprobado', config.plan_nombre);
        setTimeout(() => loadUserFromToken(), 2000);
      } else if (transaction?.status === 'DECLINED') {
        mostrarResultadoPago('declinado', config.plan_nombre);
      } else {
        mostrarResultadoPago('pendiente', config.plan_nombre);
      }
    });

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Comenzar'; }
    if (err.status === 401) {
      showToast('⚠️ Tu sesión expiró. Vuelve a iniciar sesión.');
      goTo('login');
    } else if (err.status === 400) {
      showToast('❌ Plan inválido');
    } else {
      // Error de red o backend no disponible — no dejar cargando
      showToast('⚠️ Pagos en mantenimiento. Contáctanos por WhatsApp.');
    }
  }
}

function mostrarResultadoPago(estado, planNombre) {
  const modal = document.getElementById('pagoModal');
  const iconEl = document.getElementById('pagoModal-icon');
  const titleEl = document.getElementById('pagoModal-title');
  const subEl = document.getElementById('pagoModal-sub');
  if (!modal) return;
  const estados = {
    aprobado: { icon: '🎉', title: '¡Pago aprobado!', sub: 'Tu plan ' + planNombre + ' está activo.' },
    declinado: { icon: '❌', title: 'Pago declinado', sub: 'La transacción no fue aprobada. Intenta de nuevo.' },
    pendiente: { icon: '⏳', title: 'Pago en revisión', sub: 'Tu pago está siendo procesado.' },
  };
  const info = estados[estado] || estados.pendiente;
  if (iconEl) iconEl.textContent = info.icon;
  if (titleEl) titleEl.textContent = info.title;
  if (subEl) subEl.textContent = info.sub;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePagoModal() {
  document.getElementById('pagoModal')?.classList.remove('open');
  document.body.style.overflow = '';
  if (currentUser) goTo('profile');
}

async function verificarPagoEnUrl() {
  const params = new URLSearchParams(window.location.search);
  const transactionId = params.get('id');
  if (!transactionId || !currentUser) return;
  window.history.replaceState({}, '', window.location.pathname);
  try {
    const data = await apiFetch('/subscriptions/verificar-pago?id=' + transactionId);
    if (data.aprobado) {
      const partes = data.referencia?.split('_') || [];
      const plan = partes[1] || 'tu plan';
      const nombres = { 'basic-personal': 'Basic Personalizado', 'basic-escuela': 'Basic Escuela', 'premium': 'Premium' };
      mostrarResultadoPago('aprobado', nombres[plan] || plan);
      await loadUserFromToken();
    } else if (data.estado === 'DECLINED') {
      mostrarResultadoPago('declinado', '');
    }
  } catch { /* silencioso */ }
}

// ===== ADMIN PANEL ===========================================

async function loadAdminStats() {
  try {
    const stats = await apiFetch('/admin/stats');
    const grid = document.getElementById('admin-stats-grid');
    if (!grid) return;
    const items = [
      { label: 'Usuarios', value: stats.usuarios, icon: '👥', color: 'var(--white)' },
      { label: 'Escuelas', value: stats.escuelas, icon: '🏫', color: 'var(--red)' },
      { label: 'Entrenadores', value: stats.entrenadores, icon: '🥊', color: 'var(--red)' },
      { label: 'Eventos', value: stats.eventos_proximos, icon: '🏆', color: 'var(--gold)' },
      { label: 'Planes activos', value: stats.suscripciones_activas, icon: '💳', color: 'var(--wa)' },
      { label: 'Ingresos mes', value: '$' + Number(stats.ingresos_mes_cop || 0).toLocaleString('es-CO'), icon: '💰', color: 'var(--gold)' },
      { label: 'Reseñas', value: stats.resenas, icon: '⭐', color: 'var(--white)' },
    ];
    grid.innerHTML = items.map(i => `
      <div style="background:var(--card-bg);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px">
        <div style="font-size:22px;margin-bottom:6px">${i.icon}</div>
        <div style="font-size:24px;font-weight:700;color:${i.color};font-family:'Bebas Neue',sans-serif">${i.value}</div>
        <div style="font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:0.06em">${i.label}</div>
      </div>`).join('');
  } catch { /* silencioso */ }
}

async function adminBuscarUsuarios() {
  const q = document.getElementById('admin-user-search')?.value || '';
  try {
    const data = await apiFetch('/admin/usuarios?limit=50&q=' + encodeURIComponent(q));
    const tabla = document.getElementById('admin-usuarios-tabla');
    if (!tabla) return;
    if (!data.usuarios?.length) { tabla.innerHTML = '<p style="color:var(--gray)">Sin resultados</p>'; return; }
    tabla.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--gray2)">
        ${['Nombre', 'Email', 'Ciudad', 'Plan', 'Estado', 'Acción'].map(h =>
      `<th style="padding:8px 12px;text-align:left;color:var(--gray);font-size:11px;text-transform:uppercase">${h}</th>`
    ).join('')}
      </tr></thead>
      <tbody>${data.usuarios.map((u, i) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${i % 2 ? 'var(--black3)' : 'transparent'}">
          <td style="padding:8px 12px">${esc(u.nombre)}</td>
          <td style="padding:8px 12px;color:var(--gray)">${esc(u.email)}</td>
          <td style="padding:8px 12px;color:var(--gray)">${esc(u.ciudad || '—')}</td>
          <td style="padding:8px 12px"><span style="color:${u.plan_activo ? 'var(--wa)' : 'var(--gray)'}">${esc(u.plan_activo || 'Sin plan')}</span></td>
          <td style="padding:8px 12px"><span style="color:${u.activo ? 'var(--wa)' : 'var(--red)'}">${u.activo ? 'Activo' : 'Bloqueado'}</span></td>
          <td style="padding:8px 12px">
            ${u.activo
        ? `<button onclick="adminBloquear('${u.id}')" style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:var(--red);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">Bloquear</button>`
        : `<button onclick="adminDesbloquear('${u.id}')" style="background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);color:var(--wa);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">Activar</button>`
      }
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (err) { showToast('❌ Error: ' + err.message); }
}

async function adminCargarContenido(tipo) {
  const rutas = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
  const claves = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
  const desactivarFn = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
  try {
    const data = await apiFetch('/admin/' + rutas[tipo]);
    const items = data[claves[tipo]] || [];
    const tabla = document.getElementById('admin-contenido-tabla');
    if (!tabla) return;
    if (!items.length) { tabla.innerHTML = '<p style="color:var(--gray)">Sin contenido</p>'; return; }
    tabla.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--gray2)">
        ${['Nombre', 'Ciudad', 'Estado', 'Acciones'].map(h =>
      `<th style="padding:8px 12px;text-align:left;color:var(--gray);font-size:11px;text-transform:uppercase">${h}</th>`
    ).join('')}
      </tr></thead>
      <tbody>${items.map((item, i) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${i % 2 ? 'var(--black3)' : 'transparent'}">
          <td style="padding:8px 12px">${esc(item.nombre)}</td>
          <td style="padding:8px 12px;color:var(--gray)">${esc(item.ciudad || '—')}</td>
          <td style="padding:8px 12px"><span style="color:${item.activo ? 'var(--wa)' : 'var(--red)'}">${item.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td style="padding:8px 12px">
            ${item.activo ? `<button onclick="adminDesactivar('${tipo}','${item.id}')"
              style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:var(--red);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">
              Desactivar</button>` : '<span style="color:var(--gray);font-size:11px">Inactivo</span>'}
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch (err) { showToast('❌ ' + err.message); }
}

async function adminCargarResenas() {
  try {
    const data = await apiFetch('/admin/resenas');
    const tabla = document.getElementById('admin-resenas-tabla');
    if (!tabla) return;
    const items = data.resenas || [];
    if (!items.length) { tabla.innerHTML = '<p style="color:var(--gray)">Sin reseñas</p>'; return; }
    tabla.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--gray2)">
        ${['Autor', 'Para', 'Cal.', 'Comentario', 'Verificado', 'Acciones'].map(h =>
      `<th style="padding:8px 12px;text-align:left;color:var(--gray);font-size:11px;text-transform:uppercase">${h}</th>`
    ).join('')}
      </tr></thead>
      <tbody>${items.map((r, i) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${i % 2 ? 'var(--black3)' : 'transparent'}">
          <td style="padding:8px 12px">${esc(r.autor)}</td>
          <td style="padding:8px 12px;color:var(--gray)">${esc(r.escuela || r.entrenador || '—')}</td>
          <td style="padding:8px 12px;color:var(--gold)">${'★'.repeat(r.calificacion)}</td>
          <td style="padding:8px 12px;color:var(--gray);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.comentario || '—')}</td>
          <td style="padding:8px 12px">${r.verificado ? '<span style="color:var(--wa)">✅ Sí</span>' : '<span style="color:var(--gray)">No</span>'}</td>
          <td style="padding:8px 12px;display:flex;gap:6px">
            ${!r.verificado ? `<button onclick="adminVerificarResena('${r.id}')"
              style="background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);color:var(--wa);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">✅</button>` : ''}
            <button onclick="adminEliminarResena('${r.id}')"
              style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:var(--red);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">🗑</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch (err) { showToast('❌ ' + err.message); }
}

async function adminCargarPagos() {
  try {
    const data = await apiFetch('/admin/suscripciones');
    const tabla = document.getElementById('admin-pagos-tabla');
    if (!tabla) return;
    const items = data.suscripciones || [];
    if (!items.length) { tabla.innerHTML = '<p style="color:var(--gray)">Sin pagos</p>'; return; }
    tabla.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--gray2)">
        ${['Usuario', 'Plan', 'Monto', 'Estado', 'Expira'].map(h =>
      `<th style="padding:8px 12px;text-align:left;color:var(--gray);font-size:11px;text-transform:uppercase">${h}</th>`
    ).join('')}
      </tr></thead>
      <tbody>${items.map((s, i) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${i % 2 ? 'var(--black3)' : 'transparent'}">
          <td style="padding:8px 12px">${esc(s.nombre)}<br><span style="color:var(--gray);font-size:11px">${esc(s.email)}</span></td>
          <td style="padding:8px 12px">${esc(s.plan)}</td>
          <td style="padding:8px 12px;color:var(--wa)">$${Number(s.precio_cop).toLocaleString('es-CO')}</td>
          <td style="padding:8px 12px"><span style="color:${s.estado === 'activo' ? 'var(--wa)' : 'var(--gray)'}">${esc(s.estado)}</span></td>
          <td style="padding:8px 12px;color:var(--gray);font-size:11px">${new Date(s.expira).toLocaleDateString('es-CO')}</td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch (err) { showToast('❌ ' + err.message); }
}

async function adminBloquear(id) {
  if (!confirm('¿Bloquear este usuario?')) return;
  try { await apiFetch('/admin/usuarios/' + id + '/bloquear', { method: 'PATCH' }); showToast('Usuario bloqueado'); adminBuscarUsuarios(); }
  catch (err) { showToast('❌ ' + err.message); }
}
async function adminDesbloquear(id) {
  try { await apiFetch('/admin/usuarios/' + id + '/desbloquear', { method: 'PATCH' }); showToast('Usuario activado'); adminBuscarUsuarios(); }
  catch (err) { showToast('❌ ' + err.message); }
}
async function adminDesactivar(tipo, id) {
  if (!confirm('¿Desactivar este elemento?')) return;
  const rutas = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
  try { await apiFetch('/admin/' + rutas[tipo] + '/' + id + '/desactivar', { method: 'PATCH' }); showToast('Desactivado'); adminCargarContenido(tipo); }
  catch (err) { showToast('❌ ' + err.message); }
}
async function adminVerificarResena(id) {
  try { await apiFetch('/admin/resenas/' + id + '/verificar', { method: 'PATCH' }); showToast('✅ Reseña verificada'); adminCargarResenas(); }
  catch (err) { showToast('❌ ' + err.message); }
}
async function adminEliminarResena(id) {
  if (!confirm('¿Eliminar esta reseña?')) return;
  try { await apiFetch('/admin/resenas/' + id, { method: 'DELETE' }); showToast('Reseña eliminada'); adminCargarResenas(); }
  catch (err) { showToast('❌ ' + err.message); }
}
async function adminActivarPlan() {
  const userId = document.getElementById('admin-plan-userId')?.value.trim();
  const plan = document.getElementById('admin-plan-tipo')?.value;
  if (!userId) { showToast('⚠️ Ingresa el UUID del usuario'); return; }
  try {
    await apiFetch('/admin/suscripciones/activar', { method: 'POST', body: JSON.stringify({ userId, plan }) });
    showToast('✅ Plan activado correctamente');
    document.getElementById('admin-plan-userId').value = '';
  } catch (err) { showToast('❌ ' + err.message); }
}

// ===== FILTROS HOME ==========================================

function togglePill(el, group) {
  // Filtro TIPO — navega al listado correspondiente
  if (group === 'tipo') {
    const valor = el.dataset.value;
    if (valor === 'escuela') { goTo('schools'); return; }
    if (valor === 'personalizado') { goTo('trainers'); return; }
    if (valor === 'evento') { goTo('events'); return; }
    return;
  }

  el.classList.toggle('active');
  applyFilters();
}

function applyFilters() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const wrap = document.querySelector('.search-bar-wrap');
  if (wrap) wrap.classList.toggle('has-query', query.length > 0);

  const homeScreen = document.getElementById('screen-home');
  // Recoger pills activos por grupo
  const active = g => [...homeScreen.querySelectorAll(`.pill.active[data-group="${g}"]`)]
    .map(p => p.dataset.value);

  const horarios = active('horario');
  const ciudades = active('ciudad');

  // Las tarjetas del home tienen data-type, data-city, data-schedule, data-name
  document.querySelectorAll('.home-sections [data-type]').forEach(card => {
    const tipo = card.dataset.type || '';
    const ciudad = card.dataset.city || '';
    const schedule = card.dataset.schedule || '';
    const nombre = card.dataset.name || '';
    const discipl = card.dataset.disciplines || '';

    const pasaCiudad = ciudades.length === 0 || ciudades.includes(ciudad);
    const pasaHorario = horarios.length === 0 || tipo === 'evento' ||
      horarios.some(h => schedule.includes(h));
    const pasaBusqueda = query === '' ||
      nombre.includes(query) || discipl.includes(query);

    card.classList.toggle('card-hidden', !(pasaCiudad && pasaHorario && pasaBusqueda));
  });

  // Mostrar/ocultar mensajes de "sin resultados" por sección
  document.querySelectorAll('.section-empty').forEach(el => {
    const section = el.closest('.home-section, [data-section]');
    if (!section) return;
    const visibles = section.querySelectorAll('[data-type]:not(.card-hidden)').length;
    el.classList.toggle('visible', visibles === 0);
  });
}

function clearFilters() {
  document.querySelectorAll('.pill.active').forEach(p => p.classList.remove('active'));
  const si = document.getElementById('searchInput');
  if (si) si.value = '';
  applyFilters();
}

// ===== INIT ==================================================
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');

  // Verificar si hay token de verificación de email en la URL
  // (se procesa ANTES de restaurar sesión)
  const tieneTokenVerificacion = new URLSearchParams(window.location.search).has('verificar');
  if (tieneTokenVerificacion) {
    await procesarVerificacionEnUrl();
    return; // No continuar init normal — la pantalla ya está controlada
  }

  await loadUserFromToken();
  await verificarPagoEnUrl();
  goTo('home');
  applyFilters();

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transition = 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      closePublishModal();
      closePagoModal();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
  });
});
