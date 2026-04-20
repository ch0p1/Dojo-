/**
 * main.js
 * Punto de entrada principal (Bootstrapper) de DOJX Frontend.
 * Controla inicialización y Event Delegation.
 */

import { loadUserFromToken, procesarVerificacionEnUrl, logoutUser, doLogin, nextRegStep, resetRegisterForm, validateStep1, showLoginForm, showRegisterForm, checkPwdStrength, finishRegister, reenviarVerificacion, ocultarVerificacion } from './auth.js';
import { toggleMobileMenu, closeMobileMenu, switchTab, toggleDisc, selectSched } from './ui.js';
import { goTo } from './utils.js';
import { loadSchools, loadTrainers, loadEvents, handleFilterClick, handleSearchInput } from './data.js';
import { openPublishModal, closePublishModal, submitPublish, previewFoto, addGaleriaPreview, previewReglamento, removeReglamento, addSchedSlot, removeSchedSlot } from './publish.js';
import { loadAdminStats, adminBuscarUsuarios, adminCargarContenido, adminCargarResenas, adminCargarPagos, adminBloquear, adminDesbloquear, adminDesactivar, adminVerificarResena, adminEliminarResena, adminActivarPlan } from './admin.js';
import { setActiveDetail } from './state.js';

// ==========================================
// INICIALIZACIÓN POR PANTALLA
// ==========================================

async function initCurrentPage() {
  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath.includes('home-search') || currentPath === '/' || currentPath === '/dojo-plus.html') {
    // Inicializar carruseles, loadStats, etc...
    // Pero en MPA las tarjetas de listado aquí se manejan si es necesario, 
    // idealmente el Home tiene un form de búsqueda que redirige a /schools?q=...
  }
  
  if (currentPath.includes('escuelas-listado')) {
    loadSchools();
  }
  
  if (currentPath.includes('entrenadores-listado')) {
    loadTrainers();
  }
  
  if (currentPath.includes('eventos-listado')) {
    loadEvents();
  }

  if (currentPath.includes('panel-admin')) {
    loadAdminStats();
    adminBuscarUsuarios();
  }

  if (currentPath.includes('perfil-de-usuario')) {
    // El evento 'userLoaded' se dispara en loadUserFromToken y renderiza el perfil
    // pero si ya estamos aquí, podemos despachar una lógica específica o escucharla.
  }
}

// ==========================================
// EVENT DELEGATION
// ==========================================

function setupEventDelegation() {
  document.body.addEventListener('click', (e) => {
    // Buscar si el click provino de un elemento con data-action (o un ancestro)
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    
    const action = actionEl.dataset.action;
    
    // NAVIGATION
    if (action === 'goTo') goTo(actionEl.dataset.target);
    if (action === 'toggleMobileMenu') toggleMobileMenu();
    if (action === 'closeMobileMenu') closeMobileMenu();
    if (action === 'goToMobile') {
      closeMobileMenu();
      setTimeout(() => goTo(actionEl.dataset.target), 120);
    }
    
    // AUTH & FORMS
    if (action === 'showLogin') showLoginForm();
    if (action === 'showRegister') showRegisterForm();
    if (action === 'doLogin') { e.preventDefault(); doLogin(); }
    if (action === 'validateStep1') validateStep1();
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
      handleFilterClick(actionEl, listId, group, key);
    }

    // LISTINGS & DETAILS
    if (action === 'openDetail') {
      const type = actionEl.dataset.type;
      const id = actionEl.dataset.id;
      // Fetch full item from state/memory or just pass ID via session
      // In a real MPA, you'd navigate to detail.html?id=...
      // For now we use sessionStorage like before, so we must fetch the object from memory:
      import('./state.js').then(({ getData, setActiveDetail }) => {
        const item = (getData(type + 's') || []).find(i => i.id === id);
        if (item) {
          setActiveDetail(type, item);
          goTo(type); // 'school', 'trainer', 'event' map to correct files in goTo()
        }
      });
    }

    // PUBLISH
    if (action === 'openPublishModal') openPublishModal(actionEl.dataset.type);
    if (action === 'closePublishModal') closePublishModal();
    if (action === 'clickInput') document.getElementById(actionEl.dataset.target)?.click();
    if (action === 'addSchedSlot') addSchedSlot(actionEl.dataset.day);
    if (action === 'removeSchedSlot') removeSchedSlot(actionEl);
    if (action === 'removeReglamento') removeReglamento();
    if (action === 'submitPublish') submitPublish();

    // ADMIN
    if (action === 'adminBuscarUsuarios') adminBuscarUsuarios();
    if (action === 'adminBloquear') adminBloquear(actionEl.dataset.id);
    if (action === 'adminDesbloquear') adminDesbloquear(actionEl.dataset.id);
    if (action === 'adminDesactivar') adminDesactivar(actionEl.dataset.tipo, actionEl.dataset.id);
    if (action === 'adminVerificarResena') adminVerificarResena(actionEl.dataset.id);
    if (action === 'adminEliminarResena') adminEliminarResena(actionEl.dataset.id);
    if (action === 'adminActivarPlan') adminActivarPlan();
    
    // UTILS
    if (action === 'stopPropagation') e.stopPropagation();
  });

  // Eventos tipo `change`
  document.body.addEventListener('change', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'previewFoto') previewFoto(actionEl, actionEl.dataset.previewId);
    if (action === 'addGaleriaPreview') addGaleriaPreview(actionEl);
    if (action === 'previewReglamento') previewReglamento(actionEl);
  });

  // Eventos tipo `input` (ej: debounce search, pwd strength)
  document.body.addEventListener('input', (e) => {
    if (e.target.id === 'reg-pwd') checkPwdStrength();
    
    const actionEl = e.target.closest('[data-action="search"]');
    if (actionEl) {
      handleSearchInput(actionEl.dataset.list, e.target.value);
    }
  });
}

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  setupEventDelegation();

  // Verificar si hay token de verificación en la URL
  const tieneTokenVerificacion = new URLSearchParams(window.location.search).has('verificar');
  if (tieneTokenVerificacion) {
    await procesarVerificacionEnUrl();
    return; // Detenemos aquí, la pantalla de verificación asume control
  }

  // Cargar usuario y luego iniciar vista específica
  await loadUserFromToken();
  initCurrentPage();
});
