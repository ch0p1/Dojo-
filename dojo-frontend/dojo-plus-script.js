/* ============================================================
   DOJX — Scripts  |  dojo-plus-script.js
   Conectado al backend en: http://localhost:3001
   ============================================================ */

// ===== CONFIG API ===========================================
const API_URL = 'http://localhost:3001/api';

const getToken    = ()      => localStorage.getItem('dojx_token');
const saveToken   = (t)     => localStorage.setItem('dojx_token', t);
const removeToken = ()      => localStorage.removeItem('dojx_token');

let currentUser = null;

async function apiFetch(path, options = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res  = await fetch(API_URL + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.error || data.detalle || 'Error de servidor' };
  return data;
}

// ===== NAVIGATION ===========================================
function goTo(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + screenName);
  if (!screen) return;
  screen.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  const navMap = {
    home:0, schools:1, school:1, trainers:2, trainer:2,
    events:3, event:3, plans:4, profile:-1, login:-1, publish:-1
  };
  if (navMap[screenName] !== undefined && navMap[screenName] >= 0)
    document.querySelectorAll('.nav-links li')[navMap[screenName]]?.classList.add('active');

  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');
  screen.querySelector('.fixed-wa') && (screen.querySelector('.fixed-wa').style.display = 'block');

  if (screenName === 'schools')  loadSchools();
  if (screenName === 'trainers') loadTrainers();
  if (screenName === 'profile' && currentUser) loadProfileData();

  // Actualizar botón flotante de WhatsApp en pantallas de detalle
  if (screenName === 'school')  wireDetailWa('school');
  if (screenName === 'trainer') wireDetailWa('trainer');
  if (screenName === 'event')   wireDetailWa('event');
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
function validateStep1() {
  let ok = true;
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email  = document.getElementById('reg-email').value.trim();
  const pwd    = document.getElementById('reg-pwd').value;
  const pwd2   = document.getElementById('reg-pwd2').value;
  const ciudad = document.getElementById('reg-ciudad').value;

  if (nombre.length < 2)  { showFieldError('reg-nombre','err-nombre'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('reg-email','err-email'); ok = false; }
  if (pwd.length < 8)     { showFieldError('reg-pwd','err-pwd');    ok = false; }
  if (pwd !== pwd2||!pwd2){ showFieldError('reg-pwd2','err-pwd2');  ok = false; }
  if (!ciudad)            { showFieldError('reg-ciudad','err-ciudad'); ok = false; }
  if (ok) nextStep(2);
}

async function finishRegister() {
  const btn = document.querySelector('#reg-step-3 .btn-red');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }

  const nombre       = document.getElementById('reg-nombre').value.trim();
  const email        = document.getElementById('reg-email').value.trim();
  const password     = document.getElementById('reg-pwd').value;
  const ciudad       = document.getElementById('reg-ciudad').value;
  const disciplinas  = [...document.querySelectorAll('#reg-step-2 .disc-card.selected')]
                         .map(c => c.querySelector('.disc-name').textContent.trim());
  const schedEl      = document.querySelector('#reg-step-3 .sched-opt.selected');
  const horario_pref = schedEl?.querySelector('.sched-time').textContent.trim() || null;

  try {
    const data = await apiFetch('/auth/register', {
      method:'POST',
      body: JSON.stringify({ nombre, email, password, ciudad, disciplinas, horario_pref })
    });
    saveToken(data.token);
    currentUser = data.usuario;
    renderUserUI(data.usuario);
    showToast('🎉 ¡Bienvenido a DOJX, ' + nombre.split(' ')[0] + '!');
    resetRegisterForm();
    goTo('home');
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🎉 Finalizar Registro'; }
    if (err.status === 409) {
      nextStep(1);
      document.getElementById('err-email').textContent = 'Este email ya está registrado.';
      showFieldError('reg-email','err-email');
    } else {
      showToast('❌ ' + (err.message || 'Error al crear la cuenta'));
    }
  }
}

// ===== AUTH — LOGIN ==========================================
async function doLogin() {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  if (!email || !password) {
    if (errEl) { errEl.textContent = 'Ingresa tu email y contraseña.'; errEl.classList.add('visible'); }
    return;
  }
  if (errEl) errEl.classList.remove('visible');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiFetch('/auth/login', {
      method:'POST',
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
    const data  = await apiFetch('/auth/me');
    currentUser = data;
    renderUserUI(data);
  } catch { removeToken(); }
}

// ── Actualizar nav + perfil ───────────────────────────────────
function renderUserUI(user) {
  if (!user) return;
  const initials = user.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  const esAdmin  = user.rol === 'admin';

  document.getElementById('navAuth').innerHTML =
    `<div class="avatar" onclick="goTo('profile')" title="Mi Perfil">${initials}</div>`;

  const mf = document.querySelector('.nav-mobile-footer');
  if (mf) mf.innerHTML = `<span class="nav-mobile-city">📍 ${user.ciudad||'Colombia'}</span>
    <div class="avatar" onclick="goToMobile('profile')" style="width:36px;height:36px">${initials}</div>`;

  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = user.nombre.toUpperCase();
  document.getElementById('profileEmail').textContent  = user.email;
  document.getElementById('profileCity').textContent   = '📍 ' + (user.ciudad||'Colombia');

  const badgesEl = document.getElementById('profile-badges-extra');
  if (badgesEl) {
    const vigente = user.plan_activo && new Date(user.plan_expira) > new Date();
    const dias    = vigente ? Math.ceil((new Date(user.plan_expira)-new Date())/86400000) : 0;
    badgesEl.innerHTML = esAdmin
      ? `<span class="profile-member-badge" style="background:rgba(212,172,13,0.12);border-color:rgba(212,172,13,0.3);color:var(--gold)">⭐ Admin DOJX</span>`
      : vigente
      ? `<span class="profile-member-badge">🔒 ${user.plan_activo} · ${dias}d restantes</span>`
      : `<span class="profile-member-badge" style="background:rgba(136,136,136,0.1);border-color:var(--gray2);color:var(--gray)">🥋 Miembro DOJX</span>`;
  }
  updateProfileButtons(user);
}

function updateProfileButtons(user) {
  const el = document.getElementById('profile-plan-section');
  if (!el) return;
  const esAdmin    = user.rol === 'admin';
  const planActivo = user.plan_activo && new Date(user.plan_expira) > new Date();
  const puedeEscuela = esAdmin || ['basic-escuela','premium'].includes(user.plan_activo);

  if (esAdmin || planActivo) {
    el.innerHTML = `
      <div class="profile-section-title">🚀 Publicar contenido</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn-red" style="justify-content:center" onclick="openPublishModal('trainer')">🥊 Publicar entrenador</button>
        ${puedeEscuela
          ? `<button class="btn-outline-red" style="justify-content:center" onclick="openPublishModal('school')">🏫 Publicar escuela</button>`
          : `<div style="font-size:12px;color:var(--gray);text-align:center;padding:8px 0">Necesitas plan <strong style="color:var(--gold)">Basic Escuela</strong> para publicar academia</div>`}
      </div>`;
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

    const iconMap = { BJJ:'🥋',Boxeo:'🥊','Muay Thai':'🦵',Karate:'🎌',Taekwondo:'🏅',Wrestling:'💪',MMA:'⚔️',Judo:'🎯',Kickboxing:'🔥',Capoeira:'🌊' };
    const discGrid = document.getElementById('profileDiscs');
    if (user.disciplinas?.length) {
      discGrid.innerHTML = user.disciplinas.map(d =>
        `<span class="profile-disc-chip"><span>${iconMap[d]||'🥋'}</span>${d}</span>`).join('');
    } else {
      discGrid.innerHTML = '<span class="profile-no-disc">Sin disciplinas guardadas.</span>';
    }

    const schedMap = { Mañana:{icon:'🌅',range:'6am – 12pm'}, Tarde:{icon:'☀️',range:'12pm – 6pm'}, Noche:{icon:'🌙',range:'6pm – 10pm'} };
    const schedEl  = document.getElementById('profileSchedule');
    if (user.horario_pref && schedMap[user.horario_pref]) {
      const s = schedMap[user.horario_pref];
      schedEl.innerHTML = `<div class="profile-schedule-icon">${s.icon}</div>
        <div><div class="profile-schedule-label">${user.horario_pref}</div>
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
            <div style="flex:1"><div style="font-size:13px;font-weight:600">${t.nombre}</div>
            <div style="font-size:11px;color:var(--gray)">${t.ciudad} · ${t.experiencia_anos} años</div></div>
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
    escuela:    `Hola, vi el perfil de *${nombre}* en DOJX y me gustaría obtener más información sobre sus clases y horarios. 🥋`,
    entrenador: `Hola *${nombre}*, encontré tu perfil en DOJX y me interesa agendar una sesión contigo. ¿Tienes disponibilidad? 🥊`,
    evento:     `Hola, vi el evento *${nombre}* en DOJX y me gustaría más información sobre la inscripción. 🏆`,
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
  const btn  = document.getElementById('wa-btn-' + tipo);
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

// ===== LISTADOS — CARGAR DESDE API ==========================
function renderSchoolCard(s) {
  const waUrl   = buildWaUrl(s.whatsapp, s.nombre, 'escuela');
  const imgHtml = s.foto_url
    ? `<div class="school-card-img" style="background-image:url('${s.foto_url}');background-size:cover;background-position:center;font-size:0"></div>`
    : `<div class="school-card-img" style="font-size:64px">🏫</div>`;
  return `<div class="card listing-school-card"
    data-city="${s.ciudad?.toLowerCase()}"
    data-disciplines="${(s.disciplinas||[]).join(' ').toLowerCase()}"
    onclick="goTo('school')">
    ${imgHtml}
    <div class="school-card-body">
      <div class="school-card-name">${s.nombre}</div>
      <div class="school-card-city">📍 ${s.ciudad}</div>
      <div style="margin-bottom:4px">${(s.disciplinas||[]).slice(0,3).map(d=>`<span class="tag">${d}</span>`).join(' ')}</div>
      <div class="school-card-foot">
        <div class="stars">${'★'.repeat(Math.round(s.rating||0))}${'☆'.repeat(5-Math.round(s.rating||0))}</div>
        <a class="wa-icon" href="${waUrl}" target="_blank"
           onclick="event.stopPropagation()" title="Contactar por WhatsApp">📲</a>
      </div>
    </div></div>`;
}

function renderTrainerCard(t) {
  const waUrl    = buildWaUrl(t.whatsapp, t.nombre, 'entrenador');
  const fotoHtml = t.foto_url
    ? `<div class="trainer-photo" style="background-image:url('${t.foto_url}');background-size:cover;background-position:center;font-size:0"></div>`
    : `<div class="trainer-photo" style="font-size:28px">🥋</div>`;
  return `<div class="card trainer-card"
    data-city="${t.ciudad?.toLowerCase()}"
    data-disciplines="${(t.disciplinas||[]).join(' ').toLowerCase()}"
    onclick="goTo('trainer')">
    <div class="trainer-photo-wrap">${fotoHtml}</div>
    <div class="trainer-card-body">
      <div class="trainer-name">${t.nombre}</div>
      <div class="tags-wrap">${(t.disciplinas||[]).slice(0,2).map(d=>`<span class="tag">${d}</span>`).join('')}</div>
      <div class="trainer-exp">⚡ ${t.experiencia_anos} años de exp.</div>
      <a class="wa-trainer-btn" href="${waUrl}" target="_blank"
         onclick="event.stopPropagation()" title="Agendar por WhatsApp">
        📲 Agendar
      </a>
    </div></div>`;
}

async function loadSchools() {
  const grid  = document.getElementById('grid-schools');
  const count = document.getElementById('count-schools');
  if (!grid) return;
  const skeleton = '<div class="listing-skeleton">Cargando...</div>';
  const hadCards = grid.querySelectorAll('[data-city]').length > 0;
  if (!hadCards) grid.innerHTML = skeleton;
  try {
    const data = await apiFetch('/schools');
    grid.innerHTML = data.schools.length ? data.schools.map(renderSchoolCard).join('') : '';
    if (count) count.innerHTML = `<strong>${data.total}</strong> escuelas encontradas`;
    document.getElementById('empty-schools')?.classList.toggle('visible', data.schools.length === 0);
    listingFilterApply('schools','sl');
  } catch {
    if (!hadCards) grid.innerHTML = '';
  }
}

async function loadTrainers() {
  const grid  = document.getElementById('grid-trainers');
  const count = document.getElementById('count-trainers');
  if (!grid) return;
  const hadCards = grid.querySelectorAll('[data-city]').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando...</div>';
  try {
    const data = await apiFetch('/trainers');
    grid.innerHTML = data.trainers.length ? data.trainers.map(renderTrainerCard).join('') : '';
    if (count) count.innerHTML = `<strong>${data.total}</strong> entrenadores encontrados`;
    document.getElementById('empty-trainers')?.classList.toggle('visible', data.trainers.length === 0);
    listingFilterApply('trainers','tr');
  } catch {
    if (!hadCards) grid.innerHTML = '';
  }
}

function listingFilterApply(listId, prefix) {
  const activeCiudad = document.querySelector(`.pill.active[data-group="${prefix}-ciudad"]`)?.dataset.value || 'todas';
  const activeDisc   = document.querySelector(`.pill.active[data-group="${prefix}-disc"]`)?.dataset.value   || 'todas';
  const gridEl       = document.getElementById('grid-' + listId);
  const countEl      = document.getElementById('count-' + listId);
  if (!gridEl) return;
  let visible = 0;
  gridEl.querySelectorAll('[data-city]').forEach(card => {
    const ok = (activeCiudad === 'todas' || card.dataset.city === activeCiudad) &&
               (activeDisc   === 'todas' || (card.dataset.disciplines||'').includes(activeDisc));
    card.classList.toggle('card-hidden', !ok);
    if (ok) visible++;
  });
  const noun = { schools:'escuelas', trainers:'entrenadores', events:'eventos' }[listId];
  if (countEl) countEl.innerHTML = `<strong>${visible}</strong> ${noun} encontrad${listId==='events'?'o':'a'}s`;
}

function listingFilter(el, group, listId) {
  document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const prefix = { schools:'sl', trainers:'tr', events:'ev' }[listId];
  listingFilterApply(listId, prefix);
  const gridEl  = document.getElementById('grid-' + listId);
  const emptyEl = document.getElementById('empty-' + listId);
  const visible = gridEl?.querySelectorAll('[data-city]:not(.card-hidden)').length || 0;
  if (emptyEl) emptyEl.classList.toggle('visible', visible === 0);
}

// ===== PUBLISH MODAL =========================================
let publishType = null;

function openPublishModal(type) {
  publishType = type;
  const modal = document.getElementById('publishModal');
  if (!modal) return;
  document.getElementById('publishModalTitle').textContent =
    type === 'trainer' ? '🥊 Publicar entrenador' : '🏫 Publicar escuela';
  document.getElementById('publishForm').innerHTML =
    type === 'trainer' ? buildTrainerForm() : buildSchoolForm();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePublishModal() {
  document.getElementById('publishModal')?.classList.remove('open');
  document.body.style.overflow = '';
  publishType = null;
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
  return `
    <div class="form-group">
      <label class="form-label">Foto principal de la escuela</label>
      <div class="foto-upload-wrap" onclick="document.getElementById('pub-foto-input').click()">
        <div class="foto-preview foto-preview--wide" id="pub-foto-preview">
          <span style="font-size:32px">🏫</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir foto</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp"
               style="display:none" onchange="previewFoto(this,'pub-foto-preview')">
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">JPG, PNG o WebP · máx 5 MB · se sube al guardar</div>
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
    <div id="pub-error" class="form-error" style="margin-bottom:12px"></div>
    <button class="btn-red" style="width:100%;justify-content:center" onclick="submitPublish()">Publicar escuela</button>`;
}

// Preview de foto antes de subir
function previewFoto(input, previewId) {
  const file    = input.files[0];
  const preview = document.getElementById(previewId);
  if (!file || !preview) return;

  // Validar tamaño (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('❌ La imagen supera los 5 MB permitidos');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.style.backgroundImage  = `url(${e.target.result})`;
    preview.style.backgroundSize   = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.innerHTML = ''; // Quitar el icono placeholder
  };
  reader.readAsDataURL(file);
}

async function submitPublish() {
  const nombre      = document.getElementById('pub-nombre')?.value.trim();
  const whatsapp    = document.getElementById('pub-whatsapp')?.value.trim();
  const ciudad      = document.getElementById('pub-ciudad')?.value;
  const disciplinas = (document.getElementById('pub-disciplinas')?.value||'').split(',').map(d=>d.trim()).filter(Boolean);
  const bio         = document.getElementById('pub-bio')?.value.trim() || null;
  const fotoInput   = document.getElementById('pub-foto-input');
  const errEl       = document.getElementById('pub-error');

  if (!nombre || !whatsapp || !ciudad) {
    if (errEl) { errEl.textContent = 'Nombre, WhatsApp y ciudad son obligatorios.'; errEl.classList.add('visible'); }
    return;
  }
  if (errEl) errEl.classList.remove('visible');

  const btn = document.querySelector('#publishForm .btn-red');
  if (btn) { btn.disabled = true; btn.textContent = 'Publicando...'; }

  try {
    // 1. Crear el entrenador o escuela en la BD (sin foto todavía)
    const endpoint = publishType === 'trainer' ? '/trainers' : '/schools';
    const body = publishType === 'trainer'
      ? { nombre, whatsapp, ciudad, disciplinas, bio,
          experiencia_anos: parseInt(document.getElementById('pub-exp')?.value)||0 }
      : { nombre, whatsapp, ciudad, disciplinas, descripcion: bio,
          direccion: document.getElementById('pub-direccion')?.value.trim()||null };

    const creado = await apiFetch(endpoint, { method:'POST', body: JSON.stringify(body) });
    const id = publishType === 'trainer' ? creado.trainer.id : creado.school.id;

    // 2. Si hay foto, subirla a Cloudinary
    if (fotoInput?.files?.length > 0) {
      if (btn) btn.textContent = 'Subiendo foto...';
      try {
        const formData = new FormData();
        formData.append('foto', fotoInput.files[0]);
        const token = getToken();
        const uploadPath = publishType === 'trainer'
          ? `/entrenador/${id}/foto`
          : `/escuela/${id}/foto`;
        await fetch(API_URL + '/upload' + uploadPath, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData,
          // No poner Content-Type — el navegador lo pone solo con el boundary correcto
        });
      } catch (uploadErr) {
        // La foto falló pero el entrenador/escuela ya se creó
        // No es un error fatal — avisamos pero seguimos
        console.warn('Error subiendo foto:', uploadErr);
        showToast('⚠️ Publicado correctamente pero la foto no se pudo subir');
      }
    }

    closePublishModal();
    showToast(`✅ ${publishType === 'trainer' ? 'Entrenador' : 'Escuela'} publicado correctamente`);
    await loadProfileData();
    publishType === 'trainer' ? loadTrainers() : loadSchools();

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar ' + (publishType==='trainer'?'entrenador':'escuela'); }
    if (errEl) { errEl.textContent = err.message||'Error al publicar'; errEl.classList.add('visible'); }
  }
}

async function deleteTrainer(id) {
  if (!confirm('¿Eliminar este entrenador?')) return;
  try {
    await apiFetch('/trainers/'+id, { method:'DELETE' });
    showToast('🗑 Entrenador eliminado');
    await loadMisTrainers();
    loadTrainers();
  } catch (err) { showToast('❌ ' + err.message); }
}

// ===== HOME FILTERS ==========================================
function togglePill(el, group) { el.classList.toggle('active'); applyFilters(); }

function applyFilters() {
  const query    = (document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  const wrap     = document.querySelector('.search-bar-wrap');
  if (wrap) wrap.classList.toggle('has-query', query.length>0);

  const active   = g => [...document.querySelectorAll(`.pill.active[data-group="${g}"]`)].map(p => p.dataset.value);
  const tipos    = active('tipo');
  const horarios = active('horario');
  const ciudades = active('ciudad');

  document.querySelectorAll('.home-sections [data-type]').forEach(card => {
    const pass =
      (tipos.length    === 0 || tipos.includes(card.dataset.type))   &&
      (ciudades.length === 0 || ciudades.includes(card.dataset.city)) &&
      (horarios.length === 0 || card.dataset.type === 'evento' || horarios.some(h => (card.dataset.schedule||'').includes(h))) &&
      (query === ''          || (card.dataset.name||'').includes(query) || (card.dataset.disciplines||'').includes(query));
    card.classList.toggle('card-hidden', !pass);
  });

  let allHidden = true;
  document.querySelectorAll('.home-section[data-section-type]').forEach(section => {
    const sType    = section.dataset.sectionType;
    const hasCards = section.querySelectorAll('[data-type]:not(.card-hidden)').length > 0;
    const tMatch   = tipos.length === 0 || tipos.includes(sType);
    const show     = tMatch && hasCards;
    section.classList.toggle('section-hidden', !show);
    section.querySelector('.section-empty')?.classList.toggle('visible', tMatch && !hasCards);
    if (show) allHidden = false;
  });

  const ge = document.getElementById('global-empty');
  if (ge) ge.style.display = allHidden ? 'block' : 'none';
}

function clearFilters() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.querySelectorAll('.pill[data-group]').forEach(p => p.classList.remove('active'));
  applyFilters();
}

// ===== TABS =================================================
function switchTab(btn, tabId) {
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const school = document.getElementById('screen-school');
  school.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.getElementById('tab-'+tabId)?.classList.add('active');
}

// ===== REGISTRO — STEPS =====================================
function nextStep(step) {
  [1,2,3].forEach(n => {
    const el = document.getElementById('reg-step-'+n);
    if (el) el.style.display = n===step ? 'block' : 'none';
  });
  document.getElementById('login-form').style.display = 'none';
}
function showLogin() {
  [1,2,3].forEach(n => { const e=document.getElementById('reg-step-'+n); if(e) e.style.display='none'; });
  document.getElementById('login-form').style.display = 'block';
}
function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('reg-step-1').style.display = 'block';
}
function resetRegisterForm() {
  ['reg-nombre','reg-email','reg-pwd','reg-pwd2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value=''; el.classList.remove('error','valid'); }
  });
  const c = document.getElementById('reg-ciudad'); if(c) c.value='';
  document.querySelectorAll('#reg-step-2 .disc-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#reg-step-3 .sched-opt').forEach(c => {
    c.classList.remove('selected');
    c.querySelector('.sched-time').style.color='';
  });
  document.getElementById('pwd-strength-bar')?.classList.remove('visible');
  nextStep(1);
}

// ===== FORM VALIDATION ======================================
function showFieldError(inputId, errorId) {
  document.getElementById(inputId)?.classList.add('error');
  document.getElementById(inputId)?.classList.remove('valid');
  document.getElementById(errorId)?.classList.add('visible');
}
function clearFieldError(inputId) {
  document.getElementById(inputId)?.classList.remove('error');
  document.getElementById(inputId)?.classList.add('valid');
  document.getElementById(inputId.replace('reg-','err-'))?.classList.remove('visible');
}
function checkPwdStrength() {
  const pwd  = document.getElementById('reg-pwd')?.value||'';
  const bar  = document.getElementById('pwd-strength-bar');
  const fill = document.getElementById('pwd-strength-fill');
  if (!bar||!fill) return;
  bar.classList.add('visible');
  let s=0;
  if(pwd.length>=8) s++; if(/[A-Z]/.test(pwd)) s++; if(/[0-9]/.test(pwd)) s++; if(/[^A-Za-z0-9]/.test(pwd)) s++;
  fill.style.width=['25%','50%','75%','100%'][s-1]||'0%';
  fill.style.background=['#E74C3C','#E67E22','#F1C40F','#27AE60'][s-1]||'#E74C3C';
}

// ===== DISC & SCHED =========================================
function toggleDisc(el) { el.classList.toggle('selected'); }
function selectSched(el) {
  document.querySelectorAll('.sched-opt').forEach(s => {
    s.classList.remove('selected');
    s.querySelector('.sched-time').style.color='';
  });
  el.classList.add('selected');
  el.querySelector('.sched-time').style.color='var(--red)';
}

// ===== TOAST ================================================
function showToast(msg) {
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation='slideIn 0.3s ease reverse'; setTimeout(()=>t.remove(),300); },3000);
}

// ===== INIT =================================================
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display='none');
  await loadUserFromToken();
  goTo('home');
  applyFilters();

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transition='all 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    });
  });

  document.addEventListener('keydown', e => {
    if(e.key==='Escape') { closeMobileMenu(); closePublishModal(); }
  });
  window.addEventListener('resize', () => {
    if(window.innerWidth>768) closeMobileMenu();
  });
});
