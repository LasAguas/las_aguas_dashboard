// scripts/fix-fraction.js
const fs = require('fs');
const path = require('path');

const pkgRoot = path.join(__dirname, '..');
const distDir = path.join(pkgRoot, 'node_modules', 'fraction.js', 'dist');
const filePath = path.join(distDir, 'fraction.js');

// Make sure dist/ exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// If the file doesn't exist, create a small re-export
if (!fs.existsSync(filePath)) {
  // For CommonJS consumers (autoprefixer / PostCSS loader)
  fs.writeFileSync(
    filePath,
    "module.exports = require('fraction.js');\n",
    'utf8'
  );
  console.log('[fix-fraction] Created fraction.js/dist/fraction.js shim');
} else {
  console.log('[fix-fraction] fraction.js/dist/fraction.js already exists, no change');
}
