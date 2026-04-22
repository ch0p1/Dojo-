/**
 * main.js
 * Punto de entrada principal (Bootstrapper) de DOJX Frontend.
 * Controla inicialización y Event Delegation.
 */

import { loadUserFromToken, procesarVerificacionEnUrl, logoutUser, doLogin, nextRegStep, resetRegisterForm, validateStep1, showLoginForm, showRegisterForm, checkPwdStrength, finishRegister, reenviarVerificacion, ocultarVerificacion } from './auth.js';
import { toggleMobileMenu, closeMobileMenu, switchTab, toggleDisc, selectSched, clearFieldError } from './ui.js';
import { goTo, esc } from './utils.js';
import { loadSchools, loadTrainers, loadEvents, handleFilterClick, handleSearchInput } from './data.js';
import { openPublishModal, closePublishModal, submitPublish, previewFoto, addGaleriaPreview, previewReglamento, removeReglamento, addSchedSlot, removeSchedSlot } from './publish.js';
import { loadAdminStats, adminBuscarUsuarios, adminCargarContenido, adminCargarResenas, adminCargarPagos, adminBloquear, adminDesbloquear, adminDesactivar, adminVerificarResena, adminEliminarResena, adminActivarPlan } from './admin.js';
import { setActiveDetail, getActiveDetail } from './state.js';
import { renderSchoolDetail, renderTrainerDetail, renderEventDetail, wireDetailWa } from './render.js';

// ==========================================
// HOME — FILTROS DE TARJETAS ESTÁTICAS
// ==========================================

function applyHomeFilters() {
  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const activeTipo = document.querySelector('.pill.active[data-group="tipo"]')?.dataset.value || null;
  const activeHorario = document.querySelector('.pill.active[data-group="horario"]')?.dataset.value || null;
  const activeCiudad = document.querySelector('.pill.active[data-group="ciudad"]')?.dataset.value || null;

  let anyVisible = false;

  document.querySelectorAll('.home-section').forEach(section => {
    const sectionType = section.dataset.sectionType;
    const sectionOk = !activeTipo || activeTipo === sectionType;
    let sectionHasCards = false;

    section.querySelectorAll('.card').forEach(card => {
      const matchTipo = !activeTipo || card.dataset.type === activeTipo;
      const matchCiudad = !activeCiudad || card.dataset.city === activeCiudad;
      const matchHorario = !activeHorario || (card.dataset.schedule || '').includes(activeHorario);
      const matchSearch = !searchVal || (card.dataset.name || '').includes(searchVal)
        || (card.dataset.disciplines || '').includes(searchVal);
      const visible = sectionOk && matchTipo && matchCiudad && matchHorario && matchSearch;
      card.style.display = visible ? '' : 'none';
      if (visible) sectionHasCards = true;
    });

    const emptyEl = section.querySelector('.section-empty');
    if (emptyEl) emptyEl.classList.toggle('visible', sectionOk && !sectionHasCards);
    section.style.display = sectionOk ? '' : 'none';
    if (sectionHasCards) anyVisible = true;
  });

  const ge = document.getElementById('global-empty');
  if (ge) ge.style.display = anyVisible ? 'none' : 'block';
}

function clearHomeFilters() {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  const si = document.getElementById('searchInput');
  if (si) si.value = '';
  document.querySelectorAll('.card').forEach(c => c.style.display = '');
  document.querySelectorAll('.home-section').forEach(s => s.style.display = '');
  document.querySelectorAll('.section-empty').forEach(e => e.classList.remove('visible'));
  const ge = document.getElementById('global-empty');
  if (ge) ge.style.display = 'none';
}

// ==========================================
// PERFIL — Renderizar elementos en el DOM
// ==========================================

function renderProfileElements(user) {
  if (!user) return;
  const initials = user.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const esAdmin = user.rol === 'admin';
  const vigente = user.plan_activo && new Date(user.plan_expira) > new Date();
  const dias = vigente ? Math.ceil((new Date(user.plan_expira) - new Date()) / 86400000) : 0;

  const el = (id) => document.getElementById(id);
  if (el('profileAvatar')) el('profileAvatar').textContent = initials;
  if (el('profileName')) el('profileName').textContent = user.nombre.toUpperCase();
  if (el('profileEmail')) el('profileEmail').textContent = user.email;
  if (el('profileCity')) el('profileCity').textContent = '📍 ' + (user.ciudad || 'Colombia');

  const badgesEl = el('profile-badges-extra');
  if (badgesEl) {
    badgesEl.innerHTML = esAdmin
      ? `<span class="profile-member-badge" style="background:rgba(212,172,13,0.12);border-color:rgba(212,172,13,0.3);color:var(--gold)">⭐ Admin DOJX</span>`
      : vigente
        ? `<span class="profile-member-badge">🔒 ${esc(user.plan_activo)} · ${dias}d restantes</span>`
        : `<span class="profile-member-badge" style="background:rgba(136,136,136,0.1);border-color:var(--gray2);color:var(--gray)">🥋 Miembro DOJX</span>`;
  }

  const planSection = el('profile-plan-section');
  if (planSection) {
    const puedeEscuela = esAdmin || ['basic-escuela', 'premium'].includes(user.plan_activo);
    if (esAdmin || vigente) {
      planSection.innerHTML = `
        <div class="profile-section-title">🚀 Publicar contenido</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn-red" style="justify-content:center" data-action="openPublishModal" data-type="trainer">🥊 Publicar entrenador</button>
          ${puedeEscuela
          ? `<button class="btn-outline-red" style="justify-content:center" data-action="openPublishModal" data-type="school">🏫 Publicar escuela</button>`
          : `<div style="font-size:12px;color:var(--gray);text-align:center;padding:8px 0">Necesitas plan <strong style="color:var(--gold)">Basic Escuela</strong> para publicar academia</div>`}
          <button class="btn-outline-red" style="justify-content:center;border-color:rgba(212,172,13,0.4);color:var(--gold)" data-action="openPublishModal" data-type="event">🏆 Publicar evento</button>
        </div>`;
    } else {
      planSection.innerHTML = `
        <div class="profile-section-title">🔒 Publicar contenido</div>
        <p style="font-size:13px;color:var(--gray);margin-bottom:14px;line-height:1.6">Activa un plan mensual para publicar tu perfil de entrenador o tu escuela en DOJX.</p>
        <button class="btn-red" style="width:100%;justify-content:center" data-action="goTo" data-target="plans">Ver planes desde $50.000 COP →</button>`;
    }
  }
}

// ==========================================
// INICIALIZACIÓN POR PANTALLA
// ==========================================

async function initCurrentPage() {
  const currentPath = window.location.pathname.toLowerCase();

  // LISTADOS
  if (currentPath.includes('escuelas-listado')) loadSchools();
  if (currentPath.includes('entrenadores-listado')) loadTrainers();
  if (currentPath.includes('eventos-listado')) loadEvents();

  // DETALLE — leer desde sessionStorage y renderizar
  if (currentPath.includes('school-detail')) {
    const item = getActiveDetail('school');
    if (item) { renderSchoolDetail(item); wireDetailWa('school', item); }
  }
  if (currentPath.includes('trainer-detail')) {
    const item = getActiveDetail('trainer');
    if (item) { renderTrainerDetail(item); wireDetailWa('trainer', item); }
  }
  if (currentPath.includes('event-detail')) {
    const item = getActiveDetail('event');
    if (item) { renderEventDetail(item); wireDetailWa('event', item); }
  }

  // PANEL ADMIN
  if (currentPath.includes('panel-admin')) {
    loadAdminStats();
    adminBuscarUsuarios();
    // Cargar contenido al cambiar tab
    document.addEventListener('tabChanged', ({ detail: { tabId } }) => {
      if (tabId === 'admin-tab-resenas') adminCargarResenas();
      if (tabId === 'admin-tab-pagos') adminCargarPagos();
      if (tabId === 'admin-tab-contenido') { /* se carga con los botones */ }
    });
  }

  // PERFIL
  if (currentPath.includes('perfil-de-usuario')) {
    document.addEventListener('userLoaded', ({ detail: { user } }) => {
      renderProfileElements(user);
    });
  }
}

// ==========================================
// EVENT DELEGATION
// ==========================================

function setupEventDelegation() {
  // ── CLICK ────────────────────────────────
  document.body.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    // NAVIGATION
    if (action === 'goTo') {
      e.preventDefault();
      const target = actionEl.dataset.target;
      // Si vamos a la pantalla de login/registro, nos aseguramos de mostrar el login por defecto
      if (target === 'login') showLoginForm();
      goTo(target);
    }
    if (action === 'toggleMobileMenu') toggleMobileMenu();
    if (action === 'closeMobileMenu') closeMobileMenu();
    if (action === 'goToMobile') { closeMobileMenu(); setTimeout(() => goTo(actionEl.dataset.target), 120); }

    // AUTH & FORMS
    // Agregamos preventDefault para evitar saltos de página en enlaces
    if (action === 'showLogin') { e.preventDefault(); showLoginForm(); }
    if (action === 'showRegister') { e.preventDefault(); showRegisterForm(); }
    if (action === 'doLogin') { e.preventDefault(); doLogin(); }
    if (action === 'validateStep1') { e.preventDefault(); validateStep1(); }
    if (action === 'nextRegStep') nextRegStep(parseInt(actionEl.dataset.step));
    if (action === 'finishRegister') finishRegister();
    if (action === 'logout') logoutUser();
    if (action === 'resendVerification') reenviarVerificacion(actionEl.dataset.email, actionEl);
    if (action === 'showLoginFromVerification') { ocultarVerificacion(); showLoginForm(); }
    if (action === 'reloadPage') location.reload();

    // UI & TABS
    if (action === 'switchTab') switchTab(actionEl, actionEl.dataset.tabId);
    if (action === 'toggleDisc') toggleDisc(actionEl);
    if (action === 'selectSched') selectSched(actionEl);

    // FILTERS
    if (action === 'filterPill') {
      const listId = actionEl.dataset.list;
      const group = actionEl.dataset.group;
      const key = actionEl.dataset.key;
      if (listId === 'home') {
        // Toggle active en pills del home
        const wasActive = actionEl.classList.contains('active');
        document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
        if (!wasActive) actionEl.classList.add('active');
        applyHomeFilters();
      } else {
        handleFilterClick(actionEl, listId, group, key);
      }
    }
    if (action === 'clearHomeFilters') clearHomeFilters();

    // LISTINGS & DETAILS
    if (action === 'openDetail') {
      const type = actionEl.dataset.type;
      const id = actionEl.dataset.id;
      import('./state.js').then(({ getData, setActiveDetail }) => {
        const items = getData(type + 's') || [];
        const item = items.find(i => String(i.id) === String(id));
        if (item) {
          setActiveDetail(type, item);
          goTo(type);
        }
      });
    }

    // PUBLISH
    if (action === 'openPublishModal') openPublishModal(actionEl.dataset.type);
    if (action === 'closePublishModal') closePublishModal();
    if (action === 'closePublishModalOverlay') { if (e.target === actionEl) closePublishModal(); }
    if (action === 'clickInput') document.getElementById(actionEl.dataset.target)?.click();
    if (action === 'addSchedSlot') addSchedSlot(actionEl.dataset.day);
    if (action === 'removeSchedSlot') removeSchedSlot(actionEl);
    if (action === 'removeReglamento') removeReglamento();
    if (action === 'submitPublish') submitPublish();

    // ADMIN
    if (action === 'adminCargarContenido') adminCargarContenido(actionEl.dataset.tipo);
    if (action === 'adminBuscarUsuarios') adminBuscarUsuarios();
    if (action === 'adminBloquear') adminBloquear(actionEl.dataset.id);
    if (action === 'adminDesbloquear') adminDesbloquear(actionEl.dataset.id);
    if (action === 'adminDesactivar') adminDesactivar(actionEl.dataset.tipo, actionEl.dataset.id);
    if (action === 'adminVerificarResena') adminVerificarResena(actionEl.dataset.id);
    if (action === 'adminEliminarResena') adminEliminarResena(actionEl.dataset.id);
    if (action === 'adminActivarPlan') adminActivarPlan();

    // UTILS
    if (action === 'stopPropagation') e.stopPropagation();
    if (action === 'closePagoModal') {
      const modal = document.getElementById('pagoModal');
      if (modal) modal.classList.remove('open');
    }
  });

  // ── CHANGE ───────────────────────────────
  document.body.addEventListener('change', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === 'previewFoto') previewFoto(actionEl, actionEl.dataset.previewId);
      if (action === 'addGaleriaPreview') addGaleriaPreview(actionEl);
      if (action === 'previewReglamento') previewReglamento(actionEl);
    }
    // Clear field error on select change
    if (e.target.id === 'reg-ciudad') clearFieldError('reg-ciudad');
  });

  // ── INPUT ────────────────────────────────
  document.body.addEventListener('input', (e) => {
    const id = e.target.id;

    // Password strength
    if (id === 'reg-pwd') checkPwdStrength();

    // Clear field errors en registro
    if (['reg-nombre', 'reg-email', 'reg-pwd', 'reg-pwd2'].includes(id)) clearFieldError(id);

    // Admin search
    if (id === 'admin-user-search') adminBuscarUsuarios();

    // Search en listados
    const searchEl = e.target.closest('[data-action="search"]');
    if (searchEl) handleSearchInput(searchEl.dataset.list, e.target.value);
  });

  // ── KEYDOWN ──────────────────────────────
  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.id === 'login-email' || e.target.id === 'login-password')) {
      e.preventDefault();
      doLogin();
    }
  });
}

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  setupEventDelegation();

  // Verificar token de verificación en URL
  const tieneTokenVerificacion = new URLSearchParams(window.location.search).has('verificar');
  if (tieneTokenVerificacion) {
    await procesarVerificacionEnUrl();
    return;
  }

  // Cargar usuario y luego inicializar vista
  await loadUserFromToken();
  initCurrentPage();
});
