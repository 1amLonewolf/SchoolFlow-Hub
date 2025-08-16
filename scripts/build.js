const fs = require('fs');
const path = require('path');

// Simple build script to copy dashboard.js to dist folder
const source = path.join(__dirname, '..', 'js', 'dashboard.js');
const destination = path.join(__dirname, '..', 'dist', 'bundle.js');

console.log('Building project...');

// Ensure dist directory exists
const distDir = path.dirname(destination);
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy file
fs.copyFileSync(source, destination);
console.log('Build completed successfully!');
console.log(`Copied ${source} to ${destination}`);