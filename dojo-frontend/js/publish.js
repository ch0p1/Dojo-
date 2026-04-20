/**
 * publish.js
 * Formularios y lógica de publicación (Escuelas, Entrenadores, Eventos).
 */

import { apiFetch, getToken, API_URL } from './api.js';
import { showToast } from './ui.js';
import { loadSchools, loadTrainers, loadEvents } from './data.js';

let publishType = null;
let galeriaFiles = [];
let reglamentoFile = null;

// ==========================================
// MODAL DE PUBLICACIÓN
// ==========================================

export function openPublishModal(type) {
  publishType = type;
  const modal = document.getElementById('publishModal');
  const formContainer = document.getElementById('publishForm');
  const title = document.getElementById('publishModalTitle');
  
  if (!modal || !formContainer || !title) return;

  const titles = { trainer: '🥊 Publicar entrenador', school: '🏫 Publicar escuela', event: '🏆 Publicar evento' };
  title.textContent = titles[type] || 'Publicar';

  if (type === 'trainer') formContainer.innerHTML = buildTrainerForm();
  else if (type === 'school') formContainer.innerHTML = buildSchoolForm();
  else if (type === 'event') formContainer.innerHTML = buildEventForm();

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closePublishModal() {
  const modal = document.getElementById('publishModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  publishType = null;
  galeriaFiles = [];
  reglamentoFile = null;
}

// ==========================================
// FORMULARIOS HTML
// ==========================================

function buildTrainerForm() {
  return `
    <div class="form-group">
      <label class="form-label">Foto de perfil</label>
      <div class="foto-upload-wrap" data-action="clickInput" data-target="pub-foto-input">
        <div class="foto-preview" id="pub-foto-preview">
          <span style="font-size:32px">🥋</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir foto</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp" style="display:none" data-action="previewFoto" data-preview-id="pub-foto-preview">
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
    <button class="btn-red" style="width:100%;justify-content:center" data-action="submitPublish">Publicar entrenador</button>`;
}

function buildSchoolForm() {
  const dias = [
    { key: 'lun', label: 'Lun' }, { key: 'mar', label: 'Mar' },
    { key: 'mie', label: 'Mié' }, { key: 'jue', label: 'Jue' },
    { key: 'vie', label: 'Vie' }, { key: 'sab', label: 'Sáb' },
  ];

  const diaBlocks = dias.map(d => `
    <div class="sched-day-block" data-day="${d.key}">
      <div class="sched-day-label">${d.label}</div>
      <div class="sched-slots" id="slots-${d.key}">
        <div class="sched-slot">
          <input type="text" class="sched-slot-input" data-day="${d.key}" placeholder="7:00 AM" style="flex:1;background:var(--black3);border:1px solid var(--gray2);color:var(--white);border-radius:4px;padding:5px 8px;font-size:12px;font-family:'Outfit',sans-serif">
          <button type="button" class="sched-slot-remove" data-action="removeSchedSlot" title="Quitar">×</button>
        </div>
      </div>
      <button type="button" class="sched-add-slot" data-action="addSchedSlot" data-day="${d.key}" title="Agregar horario">+</button>
    </div>`).join('');

  return `
    <div class="form-group">
      <label class="form-label">Foto principal</label>
      <div class="foto-upload-wrap" data-action="clickInput" data-target="pub-foto-input">
        <div class="foto-preview foto-preview--wide" id="pub-foto-preview">
          <span style="font-size:32px">🏫</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir foto</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp" style="display:none" data-action="previewFoto" data-preview-id="pub-foto-preview">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Galería de instalaciones <span style="color:var(--gray);font-size:11px">(máx 4 fotos)</span></label>
      <div class="galeria-preview-wrap" id="galeria-preview-wrap">
        <div class="galeria-add-btn" data-action="clickInput" data-target="pub-galeria-input">
          <span style="font-size:20px">+</span>
          <span style="font-size:11px;color:var(--gray)">Agregar foto</span>
        </div>
      </div>
      <input id="pub-galeria-input" type="file" accept="image/jpeg,image/png,image/webp" multiple style="display:none" data-action="addGaleriaPreview">
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
      <label class="form-label">Horarios por día <span style="font-size:11px;color:var(--gray);font-weight:400"> — usa el botón <strong style="color:var(--red)">+</strong> para añadir más franjas</span></label>
      <div class="sched-days-grid">${diaBlocks}</div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">Ej: "7:00 AM", "12:30 PM – 2:00 PM". Deja vacío si no hay clase ese día.</div>
    </div>
    <div id="pub-error" class="form-error" style="margin-bottom:12px"></div>
    <button class="btn-red" style="width:100%;justify-content:center" data-action="submitPublish">Publicar escuela</button>`;
}

function buildEventForm() {
  return `
    <div class="form-group">
      <label class="form-label">Poster del evento</label>
      <div class="foto-upload-wrap" data-action="clickInput" data-target="pub-foto-input">
        <div class="foto-preview foto-preview--poster" id="pub-foto-preview">
          <span style="font-size:32px">🏆</span>
          <span style="font-size:12px;color:var(--gray);margin-top:6px">Clic para subir poster</span>
        </div>
        <input id="pub-foto-input" type="file" accept="image/jpeg,image/png,image/webp" style="display:none" data-action="previewFoto" data-preview-id="pub-foto-preview">
      </div>
      <div style="font-size:11px;color:var(--gray);margin-top:6px">JPG, PNG o WebP · máx 5 MB</div>
    </div>
    <div class="form-group">
      <label class="form-label">Reglamento del campeonato <span style="color:var(--gray);font-size:11px">(PDF)</span></label>
      <div class="reglamento-upload-wrap" id="reglamento-wrap">
        <div class="reglamento-add-btn" data-action="clickInput" data-target="pub-reglamento-input">
          <span style="font-size:22px">📄</span>
          <span style="font-size:12px;color:var(--gray)">Subir PDF del reglamento</span>
        </div>
        <div class="reglamento-file-name" id="reglamento-file-name" style="display:none;font-size:12px;color:var(--wa);padding:10px 14px;background:var(--black3);border-radius:6px;align-items:center;gap:8px">
          <span>📄</span><span id="reglamento-name-text"></span>
          <button type="button" data-action="removeReglamento" style="margin-left:auto;background:none;border:none;color:var(--gray);cursor:pointer;font-size:16px">×</button>
        </div>
      </div>
      <input id="pub-reglamento-input" type="file" accept="application/pdf" style="display:none" data-action="previewReglamento">
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
    <button class="btn-red" style="width:100%;justify-content:center" data-action="submitPublish">Publicar evento</button>`;
}

// ==========================================
// MÉTODOS DE SUBIDA (Previews)
// ==========================================

export function previewFoto(inputElement, previewId) {
  const file = inputElement.files[0];
  const preview = document.getElementById(previewId);
  if (!file || !preview) return;
  if (file.size > 5 * 1024 * 1024) { showToast('❌ La imagen supera los 5 MB'); inputElement.value = ''; return; }
  
  const reader = new FileReader();
  reader.onload = e => {
    preview.style.backgroundImage = 'url(' + e.target.result + ')';
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.innerHTML = '';
  };
  reader.readAsDataURL(file);
}

export function addGaleriaPreview(inputElement) {
  const MAX = 4;
  const wrap = document.getElementById('galeria-preview-wrap');
  if (!wrap) return;

  Array.from(inputElement.files).forEach(file => {
    if (galeriaFiles.length >= MAX) { showToast('⚠️ Máximo 4 fotos en la galería'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('❌ ' + file.name + ' supera 5 MB'); return; }
    
    const idx = galeriaFiles.push(file) - 1;
    const thumb = document.createElement('div');
    thumb.className = 'galeria-thumb';
    
    const reader = new FileReader();
    reader.onload = e => { thumb.style.backgroundImage = 'url(' + e.target.result + ')'; };
    reader.readAsDataURL(file);
    
    const rm = document.createElement('button');
    rm.textContent = '×'; 
    rm.className = 'galeria-thumb-remove';
    rm.addEventListener('click', () => {
      galeriaFiles.splice(idx, 1);
      thumb.remove();
      const ab = wrap.querySelector('.galeria-add-btn');
      if (ab) ab.style.display = 'flex';
    });
    
    thumb.appendChild(rm);
    const addBtn = wrap.querySelector('.galeria-add-btn');
    wrap.insertBefore(thumb, addBtn);
  });
  
  const addBtn = wrap.querySelector('.galeria-add-btn');
  if (addBtn) addBtn.style.display = galeriaFiles.length >= MAX ? 'none' : 'flex';
  inputElement.value = '';
}

export function previewReglamento(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    showToast('❌ El PDF supera los 15 MB permitidos');
    inputElement.value = '';
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

export function removeReglamento() {
  reglamentoFile = null;
  const input = document.getElementById('pub-reglamento-input');
  const addBtn = document.querySelector('.reglamento-add-btn');
  const nameDiv = document.getElementById('reglamento-file-name');
  if (input) input.value = '';
  if (addBtn) addBtn.style.display = 'flex';
  if (nameDiv) nameDiv.style.display = 'none';
}

// Horarios dinámicos
export function addSchedSlot(dia) {
  const container = document.getElementById('slots-' + dia);
  if (!container) return;
  const slot = document.createElement('div');
  slot.className = 'sched-slot';
  slot.innerHTML = `
    <input type="text" class="sched-slot-input" data-day="${dia}" placeholder="Ej: 6:30 PM" style="flex:1;background:var(--black3);border:1px solid var(--gray2);color:var(--white);border-radius:4px;padding:5px 8px;font-size:12px;font-family:'Outfit',sans-serif">
    <button type="button" class="sched-slot-remove" data-action="removeSchedSlot" title="Quitar">×</button>`;
  container.appendChild(slot);
  slot.querySelector('input').focus();
}

export function removeSchedSlot(btnElement) {
  const slot = btnElement.closest('.sched-slot');
  const container = slot?.parentElement;
  if (container && container.querySelectorAll('.sched-slot').length > 1) {
    slot.remove();
  } else {
    const input = slot?.querySelector('input');
    if (input) { input.value = ''; input.focus(); }
  }
}

// ==========================================
// SUBMIT PUBLICACIÓN
// ==========================================

export async function submitPublish() {
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
      const disciplinas = (document.getElementById('pub-disciplinas')?.value || '').split(',').map(d => d.trim()).filter(Boolean);
      creado = await apiFetch('/trainers', { method: 'POST', body: JSON.stringify({
        nombre, whatsapp, ciudad, disciplinas,
        bio: document.getElementById('pub-bio')?.value.trim() || null,
        experiencia_anos: parseInt(document.getElementById('pub-exp')?.value) || 0,
      })});
      id = creado.trainer.id;

    } else if (publishType === 'school') {
      const disciplinas = (document.getElementById('pub-disciplinas')?.value || '').split(',').map(d => d.trim()).filter(Boolean);
      const horarios = {};
      document.querySelectorAll('.sched-slot-input').forEach(inp => {
        const val = inp.value.trim();
        if (!val) return;
        const dia = inp.dataset.day;
        if (!horarios[dia]) horarios[dia] = [];
        horarios[dia].push(val);
      });

      creado = await apiFetch('/schools', { method: 'POST', body: JSON.stringify({
        nombre, whatsapp, ciudad, disciplinas, horarios,
        descripcion: document.getElementById('pub-bio')?.value.trim() || null,
        direccion: document.getElementById('pub-direccion')?.value.trim() || null,
      })});
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
      
      creado = await apiFetch('/events', { method: 'POST', body: JSON.stringify({
        nombre, whatsapp, ciudad, disciplina, fecha, organizador,
        descripcion: document.getElementById('pub-bio')?.value.trim() || null,
      })});
      id = creado.event.id;
    }

    // Subidas
    const fotoInput = document.getElementById('pub-foto-input');
    if (fotoInput?.files?.length > 0 && id) {
      if (btn) btn.textContent = 'Subiendo foto...';
      const paths = { trainer: `/entrenador/${id}/foto`, school: `/escuela/${id}/foto`, event: `/evento/${id}/poster` };
      const fd = new FormData();
      fd.append('foto', fotoInput.files[0]);
      await fetch(API_URL + '/upload' + paths[publishType], {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd,
      }).catch(e => console.warn('Foto no subida:', e));
    }

    if (publishType === 'school' && galeriaFiles.length > 0 && id) {
      if (btn) btn.textContent = `Subiendo galería (${galeriaFiles.length})...`;
      const fd = new FormData();
      galeriaFiles.forEach(f => fd.append('galeria', f));
      await fetch(API_URL + `/upload/escuela/${id}/galeria`, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd,
      }).catch(e => console.warn('Galería no subida:', e));
    }

    if (publishType === 'event' && reglamentoFile && id) {
      if (btn) btn.textContent = 'Subiendo reglamento...';
      const fd = new FormData();
      fd.append('reglamento', reglamentoFile);
      await fetch(API_URL + `/upload/evento/${id}/reglamento`, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd,
      }).catch(e => console.warn('Reglamento no subido:', e));
    }

    closePublishModal();
    const labels = { trainer: 'Entrenador', school: 'Escuela', event: 'Evento' };
    showToast('✅ ' + (labels[publishType] || 'Contenido') + ' publicado correctamente');
    
    // Recargar datos y dispatch
    if (publishType === 'trainer') loadTrainers();
    else if (publishType === 'school') loadSchools();
    else if (publishType === 'event') loadEvents();

    document.dispatchEvent(new CustomEvent('contentPublished'));

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar ' + (publishType || ''); }
    if (errEl) { errEl.textContent = err.message || 'Error al publicar'; errEl.classList.add('visible'); }
  }
}
