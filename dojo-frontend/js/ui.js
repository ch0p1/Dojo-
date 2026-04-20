/**
 * ui.js
 * Componentes de interfaz compartidos: Toasts, Modales, Tabs, Menú Móvil.
 */

// Notificaciones Toast
export function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// Menú Móvil
export function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  if (!menu || !hamburger) return;
  
  const isOpen = menu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

export function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');
  document.body.style.overflow = '';
}

// Sistema de Pestañas (Tabs)
export function switchTab(btnElement, tabId) {
  const parent = btnElement.closest('.tabs');
  if (!parent) return;
  
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  
  const screen = btnElement.closest('.screen, .content-wrap, .login-box, .admin-container');
  if (screen) {
    screen.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
  }

  // Despachar un evento customizado por si otras partes (ej. admin) necesitan reaccionar
  document.dispatchEvent(new CustomEvent('tabChanged', { detail: { tabId } }));
}

// Interacción de botones de disciplinas/horarios en formularios
export function toggleDisc(el) {
  el.classList.toggle('selected');
}

export function selectSched(el) {
  document.querySelectorAll('.sched-opt').forEach(s => {
    s.classList.remove('selected');
    const st = s.querySelector('.sched-time');
    if (st) st.style.color = '';
  });
  el.classList.add('selected');
  const st = el.querySelector('.sched-time');
  if (st) st.style.color = 'var(--red)';
}

// Mostrar error en formularios (Validaciones)
export function showFieldError(inputId, errorId) {
  document.getElementById(inputId)?.classList.add('error');
  document.getElementById(inputId)?.classList.remove('valid');
  document.getElementById(errorId)?.classList.add('visible');
}

export function clearFieldError(inputId) {
  document.getElementById(inputId)?.classList.remove('error');
  document.getElementById(inputId)?.classList.add('valid');
  const errId = inputId.replace('reg-', 'err-');
  document.getElementById(errId)?.classList.remove('visible');
}

export function resetFormErrors(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;
  form.querySelectorAll('.error, .valid').forEach(el => el.classList.remove('error', 'valid'));
  form.querySelectorAll('.form-error-msg').forEach(el => el.classList.remove('visible'));
}
