/*
 * Copies the built static site (repo root + ru/ + ky/ + assets/ + admin/ ...)
 * into dist/, leaving out source-only files (content/, data/, scripts/, etc.)
 * so hosting providers only ever serve the generated site, not the source.
 * Run after scripts/build.js, with: node scripts/assemble-dist.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const EXCLUDE = new Set([
  'dist', 'node_modules', 'content', 'data', 'scripts',
  'package.json', 'package-lock.json', '.git', '.github', '.claude',
  'netlify.toml', '.gitignore'
]);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (src === ROOT && EXCLUDE.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
copyDir(ROOT, DIST);
console.log('Assembled dist/ for deployment.');
