/**
 * auth.js
 * Manejo de autenticación, sesión de usuario, login y registro.
 */

import { apiFetch, saveToken, removeToken, getToken } from './api.js';
import { setCurrentUser, getCurrentUser } from './state.js';
import { showToast, showFieldError, clearFieldError, resetFormErrors } from './ui.js';
import { goTo, esc } from './utils.js';

// ==========================================
// SESIÓN DE USUARIO
// ==========================================

export async function loadUserFromToken() {
  if (!getToken()) return null;
  try {
    const user = await apiFetch('/auth/me');
    setCurrentUser(user);
    renderUserNav(user);
    // Disparar evento para que otras partes de la app reaccionen (ej. perfil)
    document.dispatchEvent(new CustomEvent('userLoaded', { detail: { user } }));
    return user;
  } catch (err) {
    // Si el servidor rechaza el token (o hay error de red estricto en la nueva arquitectura),
    // forzamos limpieza por seguridad (como pidió el usuario: validación directa con backend).
    removeToken();
    setCurrentUser(null);
    renderUserNav(null);
    return null;
  }
}

export function logoutUser() {
  removeToken();
  setCurrentUser(null);
  
  // Limpieza de UI
  renderUserNav(null);
  resetRegisterForm();
  
  showToast('👋 Sesión cerrada.');
  goTo('home');
}

function renderUserNav(user) {
  const navAuth = document.getElementById('navAuth');
  const navMobileFooter = document.querySelector('.nav-mobile-footer');
  
  if (!user) {
    if (navAuth) {
      navAuth.innerHTML = `<button class="btn-login" data-action="goTo" data-target="login">Ingresar</button>`;
    }
    if (navMobileFooter) {
      navMobileFooter.innerHTML = `
        <span class="nav-mobile-city">📍 Cali · Bogotá</span>
        <button class="btn-login" data-action="goTo" data-target="login">Ingresar</button>`;
    }
    return;
  }

  const initials = esc(user.nombre).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const esAdmin = user.rol === 'admin';

  if (navAuth) {
    navAuth.innerHTML = esAdmin
      ? `<button class="btn-login" style="background:rgba(212,172,13,0.12);border:1px solid rgba(212,172,13,0.35);color:var(--gold);font-size:12px;padding:6px 14px" data-action="goTo" data-target="admin">⚙️ Admin</button>
         <div class="avatar" data-action="goTo" data-target="profile" title="Mi Perfil">${initials}</div>`
      : `<div class="avatar" data-action="goTo" data-target="profile" title="Mi Perfil">${initials}</div>`;
  }

  if (navMobileFooter) {
    navMobileFooter.innerHTML = `
      <span class="nav-mobile-city">📍 ${esc(user.ciudad || 'Colombia')}</span>
      <div class="avatar" data-action="goTo" data-target="profile" style="width:36px;height:36px">${initials}</div>`;
  }
}

// ==========================================
// LOGIN
// ==========================================

export async function doLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');

  if (!email || !password) {
    if (errEl) {
      errEl.textContent = 'Ingresa tu email y contraseña.';
      errEl.classList.add('visible');
    }
    return;
  }
  
  if (errEl) errEl.classList.remove('visible');
  if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    saveToken(data.token);
    setCurrentUser(data.usuario);
    renderUserNav(data.usuario);
    showToast('👋 ' + esc(data.mensaje));
    
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    goTo('home');
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Iniciar Sesión'; }
    
    // Caso especial: email no verificado
    if (err.status === 403 && err.codigo === 'EMAIL_NO_VERIFICADO') {
      mostrarPantallaVerificacion(err.email || email, null);
      return;
    }
    
    if (errEl) {
      errEl.textContent = err.message || 'Credenciales incorrectas';
      errEl.classList.add('visible');
    }
  }
}

// ==========================================
// REGISTRO
// ==========================================

export function nextRegStep(step) {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = n === step ? 'block' : 'none';
  });
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'none';
}

export function showLoginForm() {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = 'none';
  });
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'block';
}

export function showRegisterForm() {
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'none';
  const s1 = document.getElementById('reg-step-1');
  if (s1) s1.style.display = 'block';
  [2, 3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = 'none';
  });
}

export function resetRegisterForm() {
  resetFormErrors('.login-box');
  ['reg-nombre','reg-email','reg-pwd','reg-pwd2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; }
  });
  const c = document.getElementById('reg-ciudad'); if (c) c.value = '';
  document.querySelectorAll('#reg-step-2 .disc-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#reg-step-3 .sched-opt').forEach(c => {
    c.classList.remove('selected');
    const st = c.querySelector('.sched-time');
    if (st) st.style.color = '';
  });
  const pwdBar = document.getElementById('pwd-strength-bar');
  if (pwdBar) pwdBar.classList.remove('visible');
  nextRegStep(1);
}

export function validateStep1() {
  let ok = true;
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email  = document.getElementById('reg-email').value.trim();
  const pwd    = document.getElementById('reg-pwd').value;
  const pwd2   = document.getElementById('reg-pwd2').value;
  const ciudad = document.getElementById('reg-ciudad').value;

  if (nombre.length < 2)  { showFieldError('reg-nombre','err-nombre'); ok = false; }
  else { clearFieldError('reg-nombre'); }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('reg-email','err-email'); ok = false; }
  else { clearFieldError('reg-email'); }
  
  if (pwd.length < 8)     { showFieldError('reg-pwd','err-pwd'); ok = false; }
  else { clearFieldError('reg-pwd'); }
  
  if (pwd !== pwd2 || !pwd2){ showFieldError('reg-pwd2','err-pwd2'); ok = false; }
  else { clearFieldError('reg-pwd2'); }
  
  if (!ciudad)            { showFieldError('reg-ciudad','err-ciudad'); ok = false; }
  else { clearFieldError('reg-ciudad'); }
  
  if (ok) nextRegStep(2);
}

export function checkPwdStrength() {
  const pwd  = document.getElementById('reg-pwd')?.value || '';
  const bar  = document.getElementById('pwd-strength-bar');
  const fill = document.getElementById('pwd-strength-fill');
  if (!bar || !fill) return;
  bar.classList.add('visible');
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  fill.style.width      = ['25%','50%','75%','100%'][s-1] || '0%';
  fill.style.background = ['#E74C3C','#E67E22','#F1C40F','#27AE60'][s-1] || '#E74C3C';
}

export async function finishRegister() {
  const btn = document.querySelector('#reg-step-3 .btn-red');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }

  const nombre       = document.getElementById('reg-nombre').value.trim();
  const email        = document.getElementById('reg-email').value.trim();
  const password     = document.getElementById('reg-pwd').value;
  const ciudad       = document.getElementById('reg-ciudad').value;
  const disciplinas  = [...document.querySelectorAll('#reg-step-2 .disc-card.selected')]
                         .map(c => c.querySelector('.disc-name').textContent.trim());
  const schedEl      = document.querySelector('#reg-step-3 .sched-opt.selected');
  const horario_pref = schedEl?.querySelector('.sched-time').textContent.trim() || null;

  try {
    const data = await apiFetch('/auth/register', {
      method:'POST',
      body: JSON.stringify({ nombre, email, password, ciudad, disciplinas, horario_pref })
    });
    if (btn) { btn.disabled = false; btn.textContent = '🎉 Finalizar Registro'; }
    resetRegisterForm();
    mostrarPantallaVerificacion(data.email || email, nombre);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🎉 Finalizar Registro'; }
    if (err.status === 409) {
      nextRegStep(1);
      document.getElementById('err-email').textContent = 'Este email ya está registrado.';
      showFieldError('reg-email','err-email');
    } else {
      showToast('❌ ' + esc(err.message || 'Error al crear la cuenta'));
    }
  }
}

// ==========================================
// VERIFICACIÓN DE EMAIL
// ==========================================

export function mostrarPantallaVerificacion(email, nombre) {
  // Ocultar todos los pasos del registro y el form de login
  [1,2,3].forEach(n => {
    const el = document.getElementById('reg-step-' + n);
    if (el) el.style.display = 'none';
  });
  const lf = document.getElementById('login-form');
  if (lf) lf.style.display = 'none';

  let panel = document.getElementById('verificacion-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'verificacion-panel';
    document.querySelector('.login-box')?.appendChild(panel);
  }

  const saludo = nombre ? `¡Casi listo, ${esc(nombre).split(' ')[0]}!` : '¡Revisa tu correo!';

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:56px;margin-bottom:16px">📧</div>
      <h2 style="font-size:22px;margin-bottom:8px;color:var(--white)">${saludo}</h2>
      <p style="font-size:14px;color:var(--gray);line-height:1.7;margin-bottom:8px">
        Enviamos un enlace de verificación a:
      </p>
      <div style="background:var(--black3);border:1px solid var(--gray2);border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:14px;font-weight:600;color:var(--white)">
        ${esc(email)}
      </div>
      <p style="font-size:13px;color:var(--gray);line-height:1.7;margin-bottom:24px">
        Haz clic en el enlace del correo para activar tu cuenta.<br>
        El enlace expira en <strong style="color:var(--gold)">24 horas</strong>.
      </p>

      <div id="reenvio-msg" style="display:none;margin-bottom:16px;font-size:13px;color:var(--wa)"></div>

      <button class="btn-outline-red" style="width:100%;justify-content:center;margin-bottom:12px"
        data-action="resendVerification" data-email="${esc(email)}">
        🔄 Reenviar correo de verificación
      </button>
      <button style="background:none;border:none;color:var(--gray);font-size:13px;cursor:pointer;text-decoration:underline"
        data-action="showLoginFromVerification">
        ← Volver al inicio de sesión
      </button>
    </div>`;

  // Asegurar estar en login screen
  const isLoginPage = window.location.pathname.includes('login');
  if (!isLoginPage) {
    goTo('login');
  }
}

export async function reenviarVerificacion(email, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }
  try {
    await apiFetch('/auth/reenviar-verificacion', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const msg = document.getElementById('reenvio-msg');
    if (msg) {
      msg.textContent = '✅ Correo enviado. Revisa tu bandeja de entrada y la carpeta de spam.';
      msg.style.display = 'block';
    }
  } catch (err) {
    const msg = document.getElementById('reenvio-msg');
    if (msg) {
      msg.textContent = err.message || 'Error al reenviar';
      msg.style.color = 'var(--red)';
      msg.style.display = 'block';
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Reenviar correo de verificación'; }
  }
}

export function ocultarVerificacion() {
  const panel = document.getElementById('verificacion-panel');
  if (panel) panel.style.display = 'none';
}

export async function procesarVerificacionEnUrl() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('verificar');
  if (!token) return;

  // Limpiar la URL
  window.history.replaceState({}, '', window.location.pathname);

  const box = document.querySelector('.login-box');
  if (!box) {
    // Si no estamos en la página de login, redirigir allí con el token en hash o persistido, 
    // pero idealmente quien reciba la URL del correo irá directo al servidor que sirve el login.
    // Asumiremos que el backend manda a /screen-5-login-register.html?verificar=TOKEN
    return;
  }

  box.innerHTML = `<div style="text-align:center;padding:40px 0">
    <div style="font-size:40px;margin-bottom:16px">⏳</div>
    <p style="color:var(--gray)">Verificando tu cuenta...</p>
  </div>`;

  try {
    await apiFetch('/auth/verificar-email?token=' + encodeURIComponent(token));
    box.innerHTML = `<div style="text-align:center;padding:40px 0">
      <div style="font-size:56px;margin-bottom:16px">🎉</div>
      <h2 style="font-size:22px;margin-bottom:12px;color:var(--white)">¡Cuenta verificada!</h2>
      <p style="font-size:14px;color:var(--gray);margin-bottom:24px;line-height:1.7">
        Tu email ha sido confirmado. Ya puedes iniciar sesión en DOJX.
      </p>
      <button class="btn-red" style="width:100%;justify-content:center"
        data-action="reloadPage">
        Iniciar sesión →
      </button>
    </div>`;
  } catch (err) {
    const esExpirado = err.codigo === 'TOKEN_EXPIRADO';
    box.innerHTML = `<div style="text-align:center;padding:40px 0">
      <div style="font-size:56px;margin-bottom:16px">${esExpirado ? '⏰' : '❌'}</div>
      <h2 style="font-size:20px;margin-bottom:12px;color:var(--white)">
        ${esExpirado ? 'Enlace expirado' : 'Enlace inválido'}
      </h2>
      <p style="font-size:14px;color:var(--gray);margin-bottom:24px;line-height:1.7">
        ${esExpirado
          ? 'El enlace de verificación venció. Inicia sesión con tu contraseña para solicitar uno nuevo.'
          : esc(err.message) || 'El enlace no es válido o ya fue usado.'}
      </p>
      <button class="btn-red" style="width:100%;justify-content:center"
        data-action="reloadPage">
        Ir al inicio de sesión
      </button>
    </div>`;
  }
}
