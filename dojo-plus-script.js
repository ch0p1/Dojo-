/* ============================================================
   DOJO+ — Scripts
   dojo-plus-script.js
   ============================================================ */

// ===== NAVIGATION =====
function goTo(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screenName).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update nav link active state
  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  const navMap = { home: 0, school: 1, trainer: 2, event: 3, plans: 4 };
  if (navMap[screenName] !== undefined) {
    document.querySelectorAll('.nav-links li')[navMap[screenName]]?.classList.add('active');
  }

  // Show WA button only on detail screens
  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');
  const screenEl = document.getElementById('screen-' + screenName);
  const wa = screenEl.querySelector('.fixed-wa');
  if (wa) wa.style.display = 'block';
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburger');
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  // evitar scroll del body cuando el menu está abierto
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.body.style.overflow = '';
}

function goToMobile(screenName) {
  closeMobileMenu();
  // pequeño delay para que la animación de cierre se vea
  setTimeout(() => goTo(screenName), 120);
}

// ===== PILL FILTERS (multi-select) =====
function togglePill(el, group) {
  el.classList.toggle('active');
}

// ===== TABS =====
function switchTab(btn, tabId) {
  // Deactivate all tab buttons in the same row
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Switch tab content panels
  const school = document.getElementById('screen-school');
  school.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');
}

// ===== REGISTRATION STEPS =====
function nextStep(step) {
  document.getElementById('reg-step-1').style.display = 'none';
  document.getElementById('reg-step-2').style.display = 'none';
  document.getElementById('reg-step-3').style.display = 'none';
  document.getElementById('reg-step-' + step).style.display = 'block';
}

function showLogin() {
  document.getElementById('reg-step-1').style.display = 'none';
  document.getElementById('reg-step-2').style.display = 'none';
  document.getElementById('reg-step-3').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('reg-step-1').style.display = 'block';
}

function finishRegister() {
  const navAuth = document.getElementById('navAuth');
  navAuth.innerHTML = `<div class="avatar" onclick="goTo('home')" title="Mi Perfil">CM</div>`;
  showToast('🎉 ¡Bienvenido a DOJO+, Carlos!');
  goTo('home');
}

// ===== DISCIPLINE CARDS =====
function toggleDisc(el) {
  el.classList.toggle('selected');
}

// ===== SCHEDULE SELECTION (single-select) =====
function selectSched(el) {
  document.querySelectorAll('.sched-opt').forEach(s => {
    s.classList.remove('selected');
    s.querySelector('.sched-time').style.color = '';
  });
  el.classList.add('selected');
  el.querySelector('.sched-time').style.color = 'var(--red)';
}

// ===== TOAST NOTIFICATION =====
function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Hide all WA buttons on load
  document.querySelectorAll('.fixed-wa').forEach(el => el.style.display = 'none');

  // Start on home screen
  goTo('home');

  // Smooth spring transition on card hover
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transition = 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)';
    });
  });

  // Escape cierra el menú mobile
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileMenu();
  });

  // Al agrandar la ventana a desktop, cerrar el menú mobile
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
  });
});
