const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Replace script tags
  content = content.replace(/<script src="dojo-plus-script\.js"><\/script>/g, '<script type="module" src="js/main.js"></script>');
  
  // Replace onclicks
  content = content.replace(/onclick="toggleMobileMenu\(\)"/g, 'data-action="toggleMobileMenu"');
  content = content.replace(/onclick="closeMobileMenu\(\)"/g, 'data-action="closeMobileMenu"');
  content = content.replace(/onclick="goToMobile\('([^']+)'\)"/g, 'data-action="goToMobile" data-target="$1"');
  content = content.replace(/onclick="doLogin\(\)"/g, 'data-action="doLogin"');
  content = content.replace(/onclick="showLogin\(\)"/g, 'data-action="showLogin"');
  content = content.replace(/onclick="showRegister\(\)"/g, 'data-action="showRegister"');
  content = content.replace(/onclick="resetRegisterForm\(\)"/g, 'data-action="resetRegisterForm"');
  content = content.replace(/onclick="validateStep1\(\)"/g, 'data-action="validateStep1"');
  content = content.replace(/onclick="nextStep\(([^)]+)\)"/g, 'data-action="nextRegStep" data-step="$1"');
  content = content.replace(/onclick="finishRegister\(\)"/g, 'data-action="finishRegister"');
  content = content.replace(/onclick="switchTab\(this,\s*'([^']+)'\)"/g, 'data-action="switchTab" data-tab-id="$1"');
  content = content.replace(/onclick="toggleDisc\(this\)"/g, 'data-action="toggleDisc"');
  content = content.replace(/onclick="selectSched\(this\)"/g, 'data-action="selectSched"');
  content = content.replace(/onclick="document\.getElementById\('([^']+)'\)\.click\(\)"/g, 'data-action="clickInput" data-target="$1"');
  content = content.replace(/onclick="openPublishModal\('([^']+)'\)"/g, 'data-action="openPublishModal" data-type="$1"');
  content = content.replace(/onclick="closePublishModal\(\)"/g, 'data-action="closePublishModal"');
  content = content.replace(/onclick="logoutUser\(\)"/g, 'data-action="logout"');
  content = content.replace(/onclick="goTo\('([^']+)'\)"/g, 'data-action="goTo" data-target="$1"');
  content = content.replace(/onclick="if\(event\.target===this\)\s*closePublishModal\(\)"/g, 'data-action="closePublishModalOverlay"');
  
  // Replace listingFilter
  content = content.replace(/onclick="listingFilter\(this,\s*'([^']+)','([^']+)'\)"/g, 'data-action="filterPill" data-group="$1" data-list="$2" data-key="$1"');
  content = content.replace(/onclick="togglePill\(this,\s*'([^']+)'\)"/g, 'data-action="filterPill" data-group="$1" data-list="home" data-key="$1"');
  
  // Targets blank
  content = content.replace(/target="_blank"(?! rel="noopener noreferrer")/g, 'target="_blank" rel="noopener noreferrer"');

  // Hardcoded placeholders - empty grids
  // This is too complex for regex, maybe I'll leave the placeholders but they will be overwritten by loadSchools() since they have innerHTML = ...

  fs.writeFileSync(f, content);
  console.log('Updated ' + f);
});
