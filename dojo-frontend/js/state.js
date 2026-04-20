/**
 * state.js
 * Gestor de estado centralizado.
 */

const state = {
  // Autenticación y usuario
  currentUser: null,
  
  // Datos cacheados (Memoria)
  data: {
    schools: [],
    trainers: [],
    events: []
  },

  // Filtros activos para cada vista
  filters: {
    schools: { ciudad: 'todas', disciplina: 'todas' },
    trainers: { ciudad: 'todas', disciplina: 'todas' },
    events: { ciudad: 'todas', disciplina: 'todas' }
  },

  // Ítems activos para las pantallas de detalle
  activeDetail: {
    school: null,
    trainer: null,
    event: null
  }
};

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function getCurrentUser() {
  return state.currentUser;
}

export function setData(type, dataArray) {
  state.data[type] = dataArray;
}

export function getData(type) {
  return state.data[type];
}

export function setFilter(type, filterKey, value) {
  state.filters[type][filterKey] = value;
}

export function getFilters(type) {
  return state.filters[type];
}

export function setActiveDetail(type, item) {
  state.activeDetail[type] = item;
  // Sincronizar con sessionStorage para persistencia entre páginas (MPA)
  if (item) {
    sessionStorage.setItem('dojx_active_' + type, JSON.stringify(item));
  } else {
    sessionStorage.removeItem('dojx_active_' + type);
  }
}

export function getActiveDetail(type) {
  if (!state.activeDetail[type]) {
    try {
      const stored = sessionStorage.getItem('dojx_active_' + type);
      if (stored) {
        state.activeDetail[type] = JSON.parse(stored);
      }
    } catch(e) {}
  }
  return state.activeDetail[type];
}
