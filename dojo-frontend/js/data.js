/**
 * data.js
 * Carga de datos, almacenamiento en memoria y lógica de filtros independiente del DOM.
 */

import { apiFetch } from './api.js';
import { setData, getData, getFilters, setFilter } from './state.js';
import { renderSchoolCard, renderTrainerCard, renderEventCard } from './render.js';
import { debounce } from './utils.js';

// ==========================================
// CARGA DE DATOS (API -> State)
// ==========================================

export async function loadSchools() {
  const grid = document.getElementById('grid-schools');
  if (!grid) return;

  const hadCards = grid.querySelectorAll('.card').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando...</div>';

  try {
    const data = await apiFetch('/schools');
    if (data && data.schools && data.schools.length > 0) {
      setData('schools', data.schools);
      let html = '';
      data.schools.forEach(item => html += renderSchoolCard(item));
      grid.innerHTML = html;
    }
    applyListingFilters('schools');
  } catch (err) {
    console.error('Error loading schools:', err);
    if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Error al cargar escuelas.</div>';
    else applyListingFilters('schools');
  }
}

export async function loadTrainers() {
  const grid = document.getElementById('grid-trainers');
  if (!grid) return;

  const hadCards = grid.querySelectorAll('.card').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando...</div>';

  try {
    const data = await apiFetch('/trainers');
    if (data && data.trainers && data.trainers.length > 0) {
      setData('trainers', data.trainers);
      let html = '';
      data.trainers.forEach(item => html += renderTrainerCard(item));
      grid.innerHTML = html;
    }
    applyListingFilters('trainers');
  } catch (err) {
    console.error('Error loading trainers:', err);
    if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Error al cargar entrenadores.</div>';
    else applyListingFilters('trainers');
  }
}

export async function loadEvents() {
  const grid = document.getElementById('grid-events');
  if (!grid) return;

  const hadCards = grid.querySelectorAll('.card').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando eventos...</div>';

  try {
    const data = await apiFetch('/events');
    if (data && data.events && data.events.length > 0) {
      setData('events', data.events);
      let html = '';
      data.events.forEach(item => html += renderEventCard(item));
      grid.innerHTML = html;
    }
    applyListingFilters('events');
  } catch (err) {
    console.error('Error loading events:', err);
    if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Error al cargar eventos.</div>';
    else applyListingFilters('events');
  }
}

// ==========================================
// FILTROS EN MEMORIA
// ==========================================

export function handleFilterClick(el, listId, group, filterKey) {
  const wasActive = el.classList.contains('active');
  
  // Actualizar UI del filtro
  document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
  
  let value = 'todas';
  if (!wasActive) {
    el.classList.add('active');
    value = el.dataset.value || 'todas';
  } else {
    // Si se deseleccionó, activar el pill de "Todas" si existe
    const todasPill = document.querySelector(`.pill[data-group="${group}"][data-value="todas"]`);
    if (todasPill) todasPill.classList.add('active');
  }

  // Actualizar estado
  setFilter(listId, filterKey, value);

  // Aplicar filtros a los datos en memoria y re-renderizar
  applyListingFilters(listId);
}

export const handleSearchInput = debounce((listId, query) => {
  setFilter(listId, 'search', query.toLowerCase());
  applyListingFilters(listId);
}, 300);

export function applyListingFilters(listId) {
  const grid = document.getElementById('grid-' + listId);
  const count = document.getElementById('count-' + listId);
  const empty = document.getElementById('empty-' + listId);
  
  if (!grid) return;

  const filters = getFilters(listId);
  const cards = grid.querySelectorAll('.card');
  let matchCount = 0;

  cards.forEach(card => {
    // 1. Ciudad
    const cardCity = card.dataset.city || '';
    const matchCity = filters.ciudad === 'todas' || cardCity.toLowerCase() === filters.ciudad.toLowerCase();
    
    // 2. Disciplina
    let matchDisc = true;
    if (filters.disciplina !== 'todas') {
      const cardDisc = (card.dataset.disciplines || '').toLowerCase();
      matchDisc = cardDisc.includes(filters.disciplina.toLowerCase());
    }
    
    // 3. Búsqueda de texto (opcional)
    let matchSearch = true;
    if (filters.search) {
      const cardName = (card.dataset.name || '').toLowerCase();
      const cardDisc = (card.dataset.disciplines || '').toLowerCase();
      matchSearch = cardName.includes(filters.search.toLowerCase()) || cardDisc.includes(filters.search.toLowerCase());
    }

    const visible = matchCity && matchDisc && matchSearch;
    
    if (visible) {
      card.style.display = '';
      card.style.order = '0';
      matchCount++;
    } else {
      card.style.display = 'none';
      card.style.order = '1';
    }
  });

  // Actualizar contadores y estados vacíos
  if (count) {
    const noun = { schools: 'escuelas', trainers: 'entrenadores', events: 'eventos' }[listId];
    count.innerHTML = `<strong>${matchCount}</strong> ${noun} encontrad${listId === 'events' ? 'o' : 'a'}s`;
  }
  
  if (empty) {
    empty.classList.toggle('visible', matchCount === 0);
  }
}
