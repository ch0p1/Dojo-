/**
 * fix-onclicks.js
 * Reemplaza todos los onclick/oninput/onkeydown inline
 * restantes en los archivos HTML del proyecto DOJX.
 *
 * Uso: node fix-onclicks.js
 */

const fs   = require('fs');
const path = require('path');

const HTML_DIR = __dirname;

// Pares [ patrón regex, reemplazo ]
const RULES = [
  // ── HAMBURGER ────────────────────────────────────────────────────────────
  [/onclick="toggleMobileMenu\(\)"/g,         'data-action="toggleMobileMenu"'],

  // ── SEARCH BAR (HOME) ────────────────────────────────────────────────────
  [/\s*onkeydown="if\(event\.key==='Enter'\) applyFilters\(\)"/g, ''],
  [/\s*oninput="applyFilters\(\)"/g,           ''],
  [/onclick="applyFilters\(\)"/g,              'onclick="document.getElementById(\'searchInput\').dispatchEvent(new Event(\'input\'))"'],

  // ── HOME FILTER PILLS ────────────────────────────────────────────────────
  [/onclick="togglePill\(this,'tipo'\)"/g,     'data-action="filterPill" data-list="home" data-key="tipo"'],
  [/onclick="togglePill\(this,'horario'\)"/g,  'data-action="filterPill" data-list="home" data-key="horario"'],
  [/onclick="togglePill\(this,'ciudad'\)"/g,   'data-action="filterPill" data-list="home" data-key="ciudad"'],

  // ── LISTING FILTER PILLS ─────────────────────────────────────────────────
  [/onclick="listingFilter\(this,'sl-ciudad','schools'\)"/g,
    'data-action="filterPill" data-list="schools" data-key="ciudad"'],
  [/onclick="listingFilter\(this,'sl-disc','schools'\)"/g,
    'data-action="filterPill" data-list="schools" data-key="disciplina"'],
  [/onclick="listingFilter\(this,'tr-ciudad','trainers'\)"/g,
    'data-action="filterPill" data-list="trainers" data-key="ciudad"'],
  [/onclick="listingFilter\(this,'tr-disc','trainers'\)"/g,
    'data-action="filterPill" data-list="trainers" data-key="disciplina"'],
  [/onclick="listingFilter\(this,'ev-ciudad','events'\)"/g,
    'data-action="filterPill" data-list="events" data-key="ciudad"'],
  [/onclick="listingFilter\(this,'ev-disc','events'\)"/g,
    'data-action="filterPill" data-list="events" data-key="disciplina"'],

  // ── NAV goTo (FOOTER / VER TODOS / BTN-BACK) ─────────────────────────────
  [/onclick="goTo\('schools'\)"/g,  'data-action="goTo" data-target="schools" style="cursor:pointer"'],
  [/onclick="goTo\('trainers'\)"/g, 'data-action="goTo" data-target="trainers" style="cursor:pointer"'],
  [/onclick="goTo\('events'\)"/g,   'data-action="goTo" data-target="events" style="cursor:pointer"'],
  [/onclick="goTo\('plans'\)"/g,    'data-action="goTo" data-target="plans" style="cursor:pointer"'],
  [/onclick="goTo\('login'\)"/g,    'data-action="goTo" data-target="login" style="cursor:pointer"'],
  [/onclick="goTo\('home'\)"/g,     'data-action="goTo" data-target="home" style="cursor:pointer"'],
  [/onclick="goTo\('admin'\)"/g,    'data-action="goTo" data-target="admin" style="cursor:pointer"'],
  [/onclick="goTo\('profile'\)"/g,  'data-action="goTo" data-target="profile" style="cursor:pointer"'],
  [/onclick="goTo\('school'\)"/g,   'data-action="goTo" data-target="school" style="cursor:pointer"'],
  [/onclick="goTo\('trainer'\)"/g,  'data-action="goTo" data-target="trainer" style="cursor:pointer"'],
  [/onclick="goTo\('event'\)"/g,    'data-action="goTo" data-target="event" style="cursor:pointer"'],

  // ── SCHOOL DETAIL TABS ───────────────────────────────────────────────────
  [/onclick="switchTab\(this,'([^']+)'\)"/g,
    (_, id) => `data-action="switchTab" data-tab-id="${id}"`],

  // ── AUTH ─────────────────────────────────────────────────────────────────
  [/onclick="validateStep1\(\)"/g,             'data-action="validateStep1"'],
  [/onclick="showLogin\(\)"/g,                 'data-action="showLogin"'],
  [/onclick="showRegister\(\)"/g,              'data-action="showRegister"'],
  [/onclick="toggleDisc\(this\)"/g,            'data-action="toggleDisc"'],
  [/onclick="selectSched\(this\)"/g,           'data-action="selectSched"'],
  [/onclick="nextStep\((\d+)\)"/g,
    (_, n) => `data-action="nextRegStep" data-step="${n}"`],
  [/onclick="finishRegister\(\)"/g,            'data-action="finishRegister"'],
  [/onclick="doLogin\(\)"/g,                   'data-action="doLogin"'],
  [/onclick="logoutUser\(\)"/g,                'data-action="logout"'],
  [/\s*onkeydown="if\(event\.key==='Enter'\) doLogin\(\)"/g, ''],

  // ── REGISTER FIELD ERRORS (oninput/onchange) ─────────────────────────────
  [/\s*oninput="clearFieldError\('[^']+'\)"/g,        ''],
  [/\s*oninput="checkPwdStrength\(\); clearFieldError\('[^']+'\)"/g, ''],
  [/\s*onchange="clearFieldError\('[^']+'\)"/g,       ''],

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  [/onclick="adminCargarContenido\('([^']+)'\)"/g,
    (_, t) => `data-action="adminCargarContenido" data-tipo="${t}"`],
  [/onclick="adminBuscarUsuarios\(\)"/g,       'data-action="adminBuscarUsuarios"'],
  [/onclick="adminActivarPlan\(\)"/g,          'data-action="adminActivarPlan"'],
  [/\s*oninput="adminBuscarUsuarios\(\)"/g,    ''],

  // ── PLANS ─────────────────────────────────────────────────────────────────
  [/onclick="iniciarPago\('[^']+'\)"/g,        'data-action="goTo" data-target="login"'],
  [/\s*onmouseover="this\.style\.opacity='[^']+'" onmouseout="this\.style\.opacity='[^']+'" ?/g, ' '],
  [/\s*onmouseover="this\.style\.background='[^']+'" onmouseout="this\.style\.background='[^']+'" ?/g, ' '],

  // ── PERFIL ────────────────────────────────────────────────────────────────
  [/onclick="logoutUser\(\)"/g,                'data-action="logout"'],

  // ── STOP PROPAGATION (mantener tal cual — es correcto) ───────────────────
  // No tocar onclick="event.stopPropagation()"
];

// Archivos a procesar
const htmlFiles = fs.readdirSync(HTML_DIR)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(HTML_DIR, f));

let totalChanges = 0;

htmlFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileChanges = 0;

  RULES.forEach(([pattern, replacement]) => {
    const before = content;
    if (typeof replacement === 'function') {
      content = content.replace(pattern, replacement);
    } else {
      content = content.replace(pattern, replacement);
    }
    if (content !== before) fileChanges++;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)} — ${fileChanges} regla(s) aplicada(s)`);
    totalChanges += fileChanges;
  } else {
    console.log(`⬛ ${path.basename(filePath)} — sin cambios`);
  }
});

console.log(`\n🎉 Listo. Total de archivos con cambios: ${totalChanges > 0 ? 'sí' : 'ninguno'}`);
