/**
 * admin.js
 * Funcionalidades del Panel Administrativo.
 */

import { apiFetch } from './api.js';
import { showToast } from './ui.js';
import { esc } from './utils.js';

export async function loadAdminStats() {
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
  } catch (err) {
    console.warn('Error cargando stats de admin:', err);
  }
}

export async function adminBuscarUsuarios() {
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
              ? `<button data-action="adminBloquear" data-id="${esc(u.id)}" style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:var(--red);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">Bloquear</button>`
              : `<button data-action="adminDesbloquear" data-id="${esc(u.id)}" style="background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);color:var(--wa);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">Activar</button>`
            }
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (err) { showToast('❌ Error: ' + err.message); }
}

export async function adminCargarContenido(tipo) {
  const rutas = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
  const claves = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
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
            ${item.activo ? `<button data-action="adminDesactivar" data-tipo="${esc(tipo)}" data-id="${esc(item.id)}"
              style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:var(--red);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:11px">
              Desactivar</button>` : '<span style="color:var(--gray);font-size:11px">Inactivo</span>'}
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch (err) { showToast('❌ ' + err.message); }
}

export async function adminCargarResenas() {
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
            ${!r.verificado ? `<button data-action="adminVerificarResena" data-id="${esc(r.id)}"
              style="background:rgba(37,211,102,0.12);border:1px solid rgba(37,211,102,0.3);color:var(--wa);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">✅</button>` : ''}
            <button data-action="adminEliminarResena" data-id="${esc(r.id)}"
              style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);color:var(--red);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">🗑</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch (err) { showToast('❌ ' + err.message); }
}

export async function adminCargarPagos() {
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

export async function adminBloquear(id) {
  if (!confirm('¿Bloquear este usuario?')) return;
  try { await apiFetch('/admin/usuarios/' + id + '/bloquear', { method: 'PATCH' }); showToast('Usuario bloqueado'); adminBuscarUsuarios(); }
  catch (err) { showToast('❌ ' + err.message); }
}

export async function adminDesbloquear(id) {
  try { await apiFetch('/admin/usuarios/' + id + '/desbloquear', { method: 'PATCH' }); showToast('Usuario activado'); adminBuscarUsuarios(); }
  catch (err) { showToast('❌ ' + err.message); }
}

export async function adminDesactivar(tipo, id) {
  if (!confirm('¿Desactivar este elemento?')) return;
  const rutas = { escuelas: 'escuelas', entrenadores: 'entrenadores', eventos: 'eventos' };
  try { await apiFetch('/admin/' + rutas[tipo] + '/' + id + '/desactivar', { method: 'PATCH' }); showToast('Desactivado'); adminCargarContenido(tipo); }
  catch (err) { showToast('❌ ' + err.message); }
}

export async function adminVerificarResena(id) {
  try { await apiFetch('/admin/resenas/' + id + '/verificar', { method: 'PATCH' }); showToast('✅ Reseña verificada'); adminCargarResenas(); }
  catch (err) { showToast('❌ ' + err.message); }
}

export async function adminEliminarResena(id) {
  if (!confirm('¿Eliminar esta reseña?')) return;
  try { await apiFetch('/admin/resenas/' + id, { method: 'DELETE' }); showToast('Reseña eliminada'); adminCargarResenas(); }
  catch (err) { showToast('❌ ' + err.message); }
}

export async function adminActivarPlan() {
  const userId = document.getElementById('admin-plan-userId')?.value.trim();
  const plan = document.getElementById('admin-plan-tipo')?.value;
  if (!userId) { showToast('⚠️ Ingresa el UUID del usuario'); return; }
  try {
    await apiFetch('/admin/suscripciones/activar', { method: 'POST', body: JSON.stringify({ userId, plan }) });
    showToast('✅ Plan activado correctamente');
    document.getElementById('admin-plan-userId').value = '';
  } catch (err) { showToast('❌ ' + err.message); }
}
