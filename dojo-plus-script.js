/* ============================================================
   DOJO+ — Scripts
   dojo-plus-script.js
   ============================================================ */

// ===== NAVIGATION =====
function goTo(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screenName).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update nav link active state
  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  // los screens de detalle (school/trainer/event) se consideran parte del nav de su listado
  const navMap = {
    home: 0,
    schools: 1, school: 1,
    trainers: 2, trainer: 2,
    events: 3, event: 3,
    plans: 4,
    profile: -1,   // perfil no resalta ningún link del nav
    login: -1
  };
  if (navMap[screenName] !== undefined) {
    document.querySelectorAll('.nav-links li')[navMap[screenName]]?.classList.add('active');
  }

  // Show WA button only on detail screens
  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');
  const screenEl = document.getElementById('screen-' + screenName);
  const wa = screenEl?.querySelector('.fixed-wa');
  if (wa) wa.style.display = 'block';
}

// ===== LISTING PAGE FILTERS =====
// Filtros independientes de las páginas de listado (escuelas / entrenadores / eventos)
function listingFilter(el, group, listId) {
  // single-select por grupo — desactiva los demás del mismo grupo
  document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  const gridEl     = document.getElementById('grid-' + listId);
  const emptyEl    = document.getElementById('empty-' + listId);
  const countEl    = document.getElementById('count-' + listId);
  if (!gridEl) return;

  const ciudadVal = document.querySelector(`.pill.active[data-group="${group.split('-')[0]}-ciudad"]`)?.dataset.value || 'todas';
  const discVal   = document.querySelector(`.pill.active[data-group="${group.split('-')[0]}-disc"]`)?.dataset.value   || 'todas';

  // re-leer ambos grupos para el listId correcto
  const prefix = { schools: 'sl', trainers: 'tr', events: 'ev' }[listId];
  const activeCiudad = document.querySelector(`.pill.active[data-group="${prefix}-ciudad"]`)?.dataset.value || 'todas';
  const activeDisc   = document.querySelector(`.pill.active[data-group="${prefix}-disc"]`)?.dataset.value   || 'todas';

  let visible = 0;
  gridEl.querySelectorAll('[data-city]').forEach(card => {
    const matchCity = activeCiudad === 'todas' || card.dataset.city === activeCiudad;
    const matchDisc = activeDisc   === 'todas' || (card.dataset.disciplines || '').includes(activeDisc);
    const show = matchCity && matchDisc;
    card.classList.toggle('card-hidden', !show);
    if (show) visible++;
  });

  // actualizar contador
  if (countEl) {
    const noun = { schools: 'escuelas', trainers: 'entrenadores', events: 'eventos' }[listId];
    countEl.innerHTML = `<strong>${visible}</strong> ${noun} encontrad${listId === 'events' ? 'o' : 'a'}s`;
  }

  // mostrar/ocultar empty state
  if (emptyEl) emptyEl.classList.toggle('visible', visible === 0);
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburger');
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  // evitar scroll del body cuando el menu está abierto
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.body.style.overflow = '';
}

function goToMobile(screenName) {
  closeMobileMenu();
  // pequeño delay para que la animación de cierre se vea
  setTimeout(() => goTo(screenName), 120);
}

// ===== PILL FILTERS =====
// togglePill ahora solo actualiza la clase activa y delega a applyFilters
function togglePill(el, group) {
  el.classList.toggle('active');
  applyFilters();
}

// ===== FILTER & SEARCH ENGINE =====
function applyFilters() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

  // marcar visualmente el buscador si tiene texto
  const wrap = document.querySelector('.search-bar-wrap');
  if (wrap) wrap.classList.toggle('has-query', query.length > 0);

  // leer pills activos por grupo
  const active = (group) =>
    [...document.querySelectorAll(`.pill.active[data-group="${group}"]`)]
      .map(p => p.dataset.value);

  const tipos    = active('tipo');    // [] = todos
  const horarios = active('horario'); // [] = todos
  const ciudades = active('ciudad'); // [] = todas

  // recorrer todas las tarjetas del home
  const cards = document.querySelectorAll('.home-sections [data-type]');
  cards.forEach(card => {
    const type       = card.dataset.type       || '';
    const city       = card.dataset.city       || '';
    const disciplines= card.dataset.disciplines|| '';
    const schedule   = card.dataset.schedule   || '';
    const name       = card.dataset.name       || '';

    // 1. filtro tipo — si hay pills activos el tipo debe estar entre ellos
    const passTipo = tipos.length === 0 || tipos.includes(type);

    // 2. filtro ciudad — ídem
    const passCity = ciudades.length === 0 || ciudades.includes(city);

    // 3. filtro horario — al menos un horario activo debe estar en data-schedule
    //    los eventos no tienen horario, siempre pasan este filtro
    const passSchedule = horarios.length === 0
      || type === 'evento'
      || horarios.some(h => schedule.includes(h));

    // 4. búsqueda por texto — coincide en nombre o disciplinas
    const passQuery = query === ''
      || name.includes(query)
      || disciplines.includes(query);

    const visible = passTipo && passCity && passSchedule && passQuery;
    card.classList.toggle('card-hidden', !visible);
  });

  // mostrar/ocultar secciones según si tienen tarjetas visibles
  let allHidden = true;
  document.querySelectorAll('.home-section[data-section-type]').forEach(section => {
    const sectionType   = section.dataset.sectionType;
    const visibleCards  = section.querySelectorAll('[data-type]:not(.card-hidden)');
    const hasVisible    = visibleCards.length > 0;

    // ocultar sección completa si:
    //   a) el tipo de esta sección no está entre los tipos activos, O
    //   b) no hay ninguna tarjeta visible después del filtrado
    const tipoMatch = tipos.length === 0 || tipos.includes(sectionType);
    const show = tipoMatch && hasVisible;

    section.classList.toggle('section-hidden', !show);

    // empty state dentro de la sección
    const emptyEl = section.querySelector('.section-empty');
    if (emptyEl) emptyEl.classList.toggle('visible', tipoMatch && !hasVisible);

    if (show) allHidden = false;
  });

  // empty state global
  const globalEmpty = document.getElementById('global-empty');
  if (globalEmpty) globalEmpty.style.display = allHidden ? 'block' : 'none';
}

// limpia buscador y todos los pills — restaura estado: sin filtros activos = muestra todo
function clearFilters() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.querySelectorAll('.pill[data-group]').forEach(p => p.classList.remove('active'));
  applyFilters();
}

// ===== TABS =====
function switchTab(btn, tabId) {
  // Deactivate all tab buttons in the same row
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Switch tab content panels
  const school = document.getElementById('screen-school');
  school.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');
}

// ===== REGISTRATION STEPS =====
function nextStep(step) {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = n === step ? 'block' : 'none';
  });
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.style.display = 'none';
}

function showLogin() {
  document.getElementById('reg-step-1').style.display = 'none';
  document.getElementById('reg-step-2').style.display = 'none';
  document.getElementById('reg-step-3').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('reg-step-1').style.display = 'block';
}

function finishRegister() {
  // Recolectar datos del registro
  const nombre  = document.getElementById('reg-nombre')?.value.trim() || 'Usuario';
  const email   = document.getElementById('reg-email')?.value.trim()  || '';
  const ciudad  = document.getElementById('reg-ciudad')?.value         || 'Colombia';

  // Disciplinas seleccionadas en paso 2
  const discMap = { '🥋':'BJJ','🥊':'Boxeo','🦵':'Muay Thai','🎌':'Karate','🏅':'Taekwondo','💪':'Wrestling','⚔️':'MMA','🎯':'Judo','🔥':'Kickboxing','🌊':'Capoeira' };
  const selectedDiscs = [];
  document.querySelectorAll('#reg-step-2 .disc-card.selected').forEach(card => {
    const icon = card.querySelector('.disc-icon').textContent.trim();
    const name = card.querySelector('.disc-name').textContent.trim();
    selectedDiscs.push({ icon, name });
  });

  // Horario seleccionado en paso 3
  const schedEl = document.querySelector('#reg-step-3 .sched-opt.selected');
  const schedData = schedEl ? {
    icon:  schedEl.querySelector('.sched-icon').textContent.trim(),
    label: schedEl.querySelector('.sched-time').textContent.trim(),
    range: schedEl.querySelector('.sched-range').textContent.trim(),
  } : { icon:'⚡', label:'Sin definir', range:'' };

  // Guardar en estado global
  window.currentUser = { nombre, email, ciudad, disciplines: selectedDiscs, schedule: schedData };

  // Actualizar pantalla de perfil
  const initials = nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent   = nombre.toUpperCase();
  document.getElementById('profileEmail').textContent  = email;
  document.getElementById('profileCity').textContent   = '📍 ' + ciudad;

  // Disciplinas
  const discGrid = document.getElementById('profileDiscs');
  if (selectedDiscs.length > 0) {
    discGrid.innerHTML = selectedDiscs.map(d =>
      `<span class="profile-disc-chip"><span>${d.icon}</span>${d.name}</span>`
    ).join('');
  } else {
    discGrid.innerHTML = '<span class="profile-no-disc">No seleccionaste disciplinas aún.</span>';
  }

  // Horario
  document.getElementById('profileSchedule').innerHTML = `
    <div class="profile-schedule-icon">${schedData.icon}</div>
    <div>
      <div class="profile-schedule-label">${schedData.label}</div>
      <div class="profile-schedule-range">${schedData.range}</div>
    </div>
  `;

  // Actualizar nav — mostrar avatar que lleva al perfil
  const navAuth = document.getElementById('navAuth');
  navAuth.innerHTML = `<div class="avatar" onclick="goTo('profile')" title="Mi Perfil">${initials}</div>`;

  // Actualizar mobile menu — reemplazar botón Ingresar
  const mobileFooter = document.querySelector('.nav-mobile-footer');
  if (mobileFooter) {
    mobileFooter.innerHTML = `
      <span class="nav-mobile-city">📍 ${ciudad}</span>
      <div class="avatar" onclick="goToMobile('profile')" title="Mi Perfil" style="width:36px;height:36px">${initials}</div>
    `;
  }

  showToast('🎉 ¡Bienvenido a DOJX, ' + nombre.split(' ')[0] + '!');
  goTo('home');
}

function logoutUser() {
  window.currentUser = null;
  // Restaurar nav
  document.getElementById('navAuth').innerHTML =
    `<button class="btn-login" onclick="goTo('login')">Ingresar</button>`;
  // Restaurar mobile footer
  const mf = document.querySelector('.nav-mobile-footer');
  if (mf) mf.innerHTML = `
    <span class="nav-mobile-city">📍 Cali · Bogotá</span>
    <button class="btn-login" onclick="goToMobile('login')">Ingresar</button>
  `;
  // Resetear form
  ['reg-nombre','reg-email','reg-pwd','reg-pwd2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const ciudad = document.getElementById('reg-ciudad');
  if (ciudad) ciudad.value = '';
  nextStep(1); // volver al paso 1
  document.querySelectorAll('#reg-step-2 .disc-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#reg-step-3 .sched-opt').forEach(c => c.classList.remove('selected'));

  showToast('Sesión cerrada correctamente.');
  goTo('home');
}

// ===== FORM VALIDATION (Step 1) =====
function validateStep1() {
  let valid = true;

  const nombre = document.getElementById('reg-nombre').value.trim();
  const email  = document.getElementById('reg-email').value.trim();
  const pwd    = document.getElementById('reg-pwd').value;
  const pwd2   = document.getElementById('reg-pwd2').value;
  const ciudad = document.getElementById('reg-ciudad').value;

  // Nombre
  if (nombre.length < 2) {
    showFieldError('reg-nombre', 'err-nombre');
    valid = false;
  }
  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showFieldError('reg-email', 'err-email');
    valid = false;
  }
  // Contraseña
  if (pwd.length < 8) {
    showFieldError('reg-pwd', 'err-pwd');
    valid = false;
  }
  // Confirmar
  if (pwd !== pwd2 || pwd2 === '') {
    showFieldError('reg-pwd2', 'err-pwd2');
    valid = false;
  }
  // Ciudad
  if (!ciudad) {
    showFieldError('reg-ciudad', 'err-ciudad');
    valid = false;
  }

  if (valid) nextStep(2);
}

function showFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) { input.classList.add('error'); input.classList.remove('valid'); }
  if (error) error.classList.add('visible');
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const errorId = inputId.replace('reg-', 'err-');
  const error = document.getElementById(errorId);
  if (input) { input.classList.remove('error'); input.classList.add('valid'); }
  if (error) error.classList.remove('visible');
}

function checkPwdStrength() {
  const pwd = document.getElementById('reg-pwd')?.value || '';
  const bar = document.getElementById('pwd-strength-bar');
  const fill = document.getElementById('pwd-strength-fill');
  if (!bar || !fill) return;
  bar.classList.add('visible');
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd)) strength++;
  if (/[^A-Za-z0-9]/.test(pwd)) strength++;
  const colors = ['#E74C3C','#E67E22','#F1C40F','#27AE60'];
  const widths  = ['25%','50%','75%','100%'];
  fill.style.width      = widths[strength - 1]  || '0%';
  fill.style.background = colors[strength - 1]  || '#E74C3C';
}

// ===== DISCIPLINE CARDS =====
function toggleDisc(el) {
  el.classList.toggle('selected');
}

// ===== SCHEDULE SELECTION (single-select) =====
function selectSched(el) {
  document.querySelectorAll('.sched-opt').forEach(s => {
    s.classList.remove('selected');
    s.querySelector('.sched-time').style.color = '';
  });
  el.classList.add('selected');
  el.querySelector('.sched-time').style.color = 'var(--red)';
}

// ===== TOAST NOTIFICATION =====
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Hide all WA buttons on load
  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');

  // Start on home screen
  goTo('home');

  // aplicar filtros iniciales (pills activos por defecto)
  applyFilters();

  // Smooth spring transition on card hover
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transition = 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    });
  });

  // Escape cierra el menú mobile
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileMenu();
  });

  // Al agrandar la ventana a desktop, cerrar el menú mobile
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
  });
});
