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
    setData('schools', data.schools || []);
    applyListingFilters('schools');
  } catch (err) {
    console.error('Error loading schools:', err);
    if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Error al cargar escuelas.</div>';
  }
}

export async function loadTrainers() {
  const grid = document.getElementById('grid-trainers');
  if (!grid) return;

  const hadCards = grid.querySelectorAll('.card').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando...</div>';

  try {
    const data = await apiFetch('/trainers');
    setData('trainers', data.trainers || []);
    applyListingFilters('trainers');
  } catch (err) {
    console.error('Error loading trainers:', err);
    if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Error al cargar entrenadores.</div>';
  }
}

export async function loadEvents() {
  const grid = document.getElementById('grid-events');
  if (!grid) return;

  const hadCards = grid.querySelectorAll('.card').length > 0;
  if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Cargando eventos...</div>';

  try {
    const data = await apiFetch('/events');
    setData('events', data.events || []);
    applyListingFilters('events');
  } catch (err) {
    console.error('Error loading events:', err);
    if (!hadCards) grid.innerHTML = '<div class="listing-skeleton">Error al cargar eventos.</div>';
  }
}

// ==========================================
// FILTROS EN MEMORIA
// ==========================================

export function handleFilterClick(el, listId, group, filterKey) {
  // Actualizar UI del filtro
  document.querySelectorAll(`.pill[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  // Actualizar estado
  const value = el.dataset.value || 'todas';
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

  const allData = getData(listId) || [];
  const filters = getFilters(listId);

  // Filtrado en memoria
  const filteredData = allData.filter(item => {
    // 1. Ciudad
    const matchCity = filters.ciudad === 'todas' || (item.ciudad && item.ciudad.toLowerCase() === filters.ciudad.toLowerCase());
    
    // 2. Disciplina
    let matchDisc = true;
    if (filters.disciplina !== 'todas') {
      const disciplines = (item.disciplinas || []).map(d => d.toLowerCase());
      if (listId === 'events') {
         matchDisc = (item.disciplina && item.disciplina.toLowerCase() === filters.disciplina.toLowerCase());
      } else {
         matchDisc = disciplines.includes(filters.disciplina.toLowerCase());
      }
    }
    
    // 3. Búsqueda de texto (opcional)
    let matchSearch = true;
    if (filters.search) {
      matchSearch = item.nombre.toLowerCase().includes(filters.search);
    }

    return matchCity && matchDisc && matchSearch;
  });

  // Renderizado optimizado
  let html = '';
  filteredData.forEach(item => {
    if (listId === 'schools') html += renderSchoolCard(item);
    else if (listId === 'trainers') html += renderTrainerCard(item);
    else if (listId === 'events') html += renderEventCard(item);
  });

  grid.innerHTML = html;

  // Actualizar contadores y estados vacíos
  if (count) {
    const noun = { schools: 'escuelas', trainers: 'entrenadores', events: 'eventos' }[listId];
    count.innerHTML = `<strong>${filteredData.length}</strong> ${noun} encontrad${listId === 'events' ? 'o' : 'a'}s`;
  }
  
  if (empty) {
    empty.classList.toggle('visible', filteredData.length === 0);
  }
}
