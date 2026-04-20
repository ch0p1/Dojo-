const fs = require('fs');
const path = require('path');

const HTML_DIR = __dirname;
const files = fs.readdirSync(HTML_DIR).filter(f => f.endsWith('.html'));

const BAD_PATTERNS = [
  /onclick="toggleMobileMenu/,
  /onclick="goTo\(/,
  /onclick="togglePill/,
  /onclick="listingFilter/,
  /onclick="applyFilters/,
  /onclick="clearFilters/,
  /onclick="doLogin/,
  /onclick="showLogin\b/,
  /onclick="showRegister/,
  /onclick="validateStep/,
  /onclick="finishRegister/,
  /onclick="nextStep/,
  /onclick="toggleDisc/,
  /onclick="selectSched/,
  /onclick="switchTab/,
  /onclick="logoutUser/,
  /onclick="adminBuscar/,
  /onclick="adminCargar/,
  /onclick="adminActivar/,
  /onclick="iniciarPago/,
  /onclick="closePagoModal/,
  /oninput="applyFilters/,
  /oninput="clearField/,
  /oninput="adminBuscar/,
  /oninput="checkPwd/,
];

let errors = 0;

files.forEach(f => {
  const filePath = path.join(HTML_DIR, f);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check bad patterns
  BAD_PATTERNS.forEach(p => {
    if (p.test(content)) {
      console.log('❌  ' + f + ' — patrón restante: ' + p);
      errors++;
    }
  });

  // Check script module tag
  if (!content.includes('type="module"')) {
    console.log('❌  ' + f + ' — FALTA <script type="module">');
    errors++;
  }
});

console.log('');
if (errors === 0) {
  console.log('✅  TODOS los HTML están limpios y tienen <script type="module">');
} else {
  console.log('⚠️  Total de problemas detectados: ' + errors);
}
