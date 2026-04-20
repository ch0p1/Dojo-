/**
 * render.js
 * Generación de componentes HTML de forma segura (XSS Prevention).
 */

import { esc, buildWaUrl, formatDate } from './utils.js';
import { setActiveDetail } from './state.js';
import { goTo } from './utils.js';

// ==========================================
// RENDERERS DE LISTADOS (Cards)
// ==========================================

export function renderSchoolCard(s) {
  const waUrl = buildWaUrl(s.whatsapp, s.nombre, 'escuela');
  
  const imgHtml = s.foto_url
    ? `<div class="school-card-img" style="background-image:url('${esc(s.foto_url)}');background-size:cover;background-position:center;font-size:0"></div>`
    : `<div class="school-card-img" style="font-size:64px">🏫</div>`;
    
  return `
    <div class="card listing-school-card"
      data-city="${esc(s.ciudad)?.toLowerCase()}"
      data-disciplines="${esc((s.disciplinas || []).join(' ')).toLowerCase()}"
      data-action="openDetail" data-type="school" data-id="${esc(s.id)}">
      ${imgHtml}
      <div class="school-card-body">
        <div class="school-card-name">${esc(s.nombre)}</div>
        <div class="school-card-city">📍 ${esc(s.ciudad)}</div>
        <div style="margin-bottom:4px">
          ${(s.disciplinas || []).slice(0, 3).map(d => `<span class="tag">${esc(d)}</span>`).join(' ')}
        </div>
        <div class="school-card-foot">
          <div class="stars">${'★'.repeat(Math.round(s.rating || 0))}${'☆'.repeat(5 - Math.round(s.rating || 0))}</div>
          <a class="wa-icon" href="${waUrl}" target="_blank" rel="noopener noreferrer"
             data-action="stopPropagation" title="Contactar por WhatsApp">📲</a>
        </div>
      </div>
    </div>`;
}

export function renderTrainerCard(t) {
  const waUrl = buildWaUrl(t.whatsapp, t.nombre, 'entrenador');
  
  const fotoHtml = t.foto_url
    ? `<div class="trainer-photo" style="background-image:url('${esc(t.foto_url)}');background-size:cover;background-position:center;font-size:0"></div>`
    : `<div class="trainer-photo" style="font-size:28px">🥋</div>`;
    
  return `
    <div class="card trainer-card"
      data-city="${esc(t.ciudad)?.toLowerCase()}"
      data-disciplines="${esc((t.disciplinas || []).join(' ')).toLowerCase()}"
      data-action="openDetail" data-type="trainer" data-id="${esc(t.id)}">
      <div class="trainer-photo-wrap">${fotoHtml}</div>
      <div class="trainer-card-body">
        <div class="trainer-name">${esc(t.nombre)}</div>
        <div class="tags-wrap">${(t.disciplinas || []).slice(0, 2).map(d => `<span class="tag">${esc(d)}</span>`).join('')}</div>
        <div class="trainer-exp">⚡ ${esc(t.experiencia_anos)} años de exp.</div>
        <a class="wa-trainer-btn" href="${waUrl}" target="_blank" rel="noopener noreferrer"
           data-action="stopPropagation" title="Agendar por WhatsApp">
          📲 Agendar
        </a>
      </div>
    </div>`;
}

export function renderEventCard(ev) {
  const fecha = ev.fecha ? formatDate(ev.fecha) : '';
  
  return `
    <div class="card event-card"
      data-city="${esc(ev.ciudad)?.toLowerCase()}"
      data-disciplines="${esc(ev.disciplina)?.toLowerCase()}"
      data-action="openDetail" data-type="event" data-id="${esc(ev.id)}">
      <div class="event-poster" ${ev.poster_url ? `style="background-image:url('${esc(ev.poster_url)}');background-size:cover;background-position:center;font-size:0"` : ''}>
        ${ev.poster_url ? '' : '🏆'}
      </div>
      <div class="event-card-body">
        <div class="event-name">${esc(ev.nombre)}</div>
        <span class="tag">${esc(ev.disciplina)}</span>
        <div class="event-date">📅 ${fecha} · ${esc(ev.ciudad)}</div>
      </div>
    </div>`;
}

// ==========================================
// RENDERERS DE DETALLES
// ==========================================

export function renderSchoolDetail(s) {
  if (!s) return;
  const el = document.getElementById('screen-school');
  if (!el) return;

  const heroName = el.querySelector('.hero-detail-content h1');
  if (heroName) heroName.textContent = s.nombre;

  const heroCity = el.querySelector('.city-badge');
  if (heroCity) heroCity.textContent = '📍 ' + s.ciudad;

  const heroBg = el.querySelector('.hero-detail-bg');
  if (heroBg) {
    if (s.foto_url) {
      heroBg.style.backgroundImage = `url(${esc(s.foto_url)})`;
      heroBg.style.backgroundSize = 'cover';
      heroBg.style.backgroundPosition = 'center';
      heroBg.textContent = '';
    } else {
      heroBg.style.backgroundImage = '';
      heroBg.textContent = '🏫';
    }
  }

  const tagsWrap = el.querySelector('.hero-detail-content .tags-wrap') || el.querySelector('.hero-detail-content div[style*="gap:8px"]');
  if (tagsWrap && s.disciplinas?.length) {
    tagsWrap.innerHTML = s.disciplinas.map(d => `<span class="tag">${esc(d)}</span>`).join('');
  }

  const descP = el.querySelector('#tab-school-desc .section-card p');
  if (descP && s.descripcion) descP.textContent = s.descripcion;

  const photoGrid = el.querySelector('.photo-grid');
  if (photoGrid) {
    if (s.galeria_urls?.length) {
      photoGrid.innerHTML = s.galeria_urls.slice(0, 4).map(url =>
        `<div class="photo-grid-item" style="background-image:url('${esc(url)}');background-size:cover;background-position:center"></div>`
      ).join('');
    } else {
      photoGrid.innerHTML = `
        <div class="photo-grid-item" style="background:var(--card-bg)">🏫<br><span style="font-size:12px;color:var(--gray)">Sin fotos aún</span></div>`;
    }
  }

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
            ? `<td><span class="${clases[t]}">${esc(hora)}</span></td>`
            : `<td><span class="sched-empty">—</span></td>`;
        }).join('')}
      </tr>`).join('');
  }
}

export function renderTrainerDetail(t) {
  if (!t) return;
  const el = document.getElementById('screen-trainer');
  if (!el) return;

  const nameEl = el.querySelector('.trainer-hero-name');
  if (nameEl) nameEl.textContent = t.nombre.toUpperCase();

  const photoEl = el.querySelector('.trainer-hero-photo');
  if (photoEl) {
    if (t.foto_url) {
      photoEl.style.backgroundImage = `url(${esc(t.foto_url)})`;
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

export function renderEventDetail(ev) {
  if (!ev) return;
  const el = document.getElementById('screen-event');
  if (!el) return;

  const posterEl = el.querySelector('.event-poster-detail');
  if (posterEl) {
    if (ev.poster_url) {
      posterEl.style.backgroundImage = `url(${esc(ev.poster_url)})`;
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

  const detalles = {
    ciudad: ev.ciudad,
    fecha: ev.fecha ? formatDate(ev.fecha) : '—',
    disciplina: ev.disciplina,
    organizador: ev.organizador,
  };
  
  const detItems = el.querySelectorAll('.event-detail-item');
  const keys = ['ciudad', 'fecha', 'disciplina', 'organizador'];
  detItems.forEach((item, i) => {
    const val = item.querySelector('.event-detail-val');
    if (val && detalles[keys[i]]) val.textContent = detalles[keys[i]];
  });

  const regBtn = document.getElementById('reglamento-btn');
  if (regBtn) {
    if (ev.reglamento_url) {
      regBtn.href = esc(ev.reglamento_url);
      regBtn.style.opacity = '1';
      regBtn.style.pointerEvents = 'auto';
      regBtn.setAttribute('target', '_blank');
      regBtn.setAttribute('rel', 'noopener noreferrer');
    } else {
      regBtn.href = '#';
      regBtn.style.opacity = '0.4';
      regBtn.style.pointerEvents = 'none';
    }
  }
}

export function wireDetailWa(tipo, item) {
  const btn = document.getElementById('wa-btn-' + tipo);
  if (!btn) return;

  if (item && item.whatsapp) {
    const url = buildWaUrl(item.whatsapp, item.nombre, tipo === 'school' ? 'escuela' : tipo === 'trainer' ? 'entrenador' : 'evento');
    btn.href = url;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener noreferrer');
  } else {
    btn.href = '#';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }
}
