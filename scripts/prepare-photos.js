/*
 * Prepares tour photos before committing: run `npm run photos`.
 *
 * For every image in assets/images/tours/<slug>/:
 *  - gives it a URL-safe name (lowercase, no spaces or brackets);
 *  - if it is larger than MAX_SIDE px or MAX_BYTES, copies the original to
 *    ../AtBashyTours-photo-originals/<slug>/ and replaces it with a resized
 *    version (long side MAX_SIDE, EXIF rotation applied).
 * The build makes the final 480–1920 px WebP sizes; this only keeps the git
 * repository small.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
sharp.cache(false); // otherwise Windows keeps the files locked and renames fail

const ROOT = path.resolve(__dirname, '..');
const TOURS_DIR = path.join(ROOT, 'assets/images/tours');
const BACKUP_DIR = path.resolve(ROOT, '..', 'AtBashyTours-photo-originals');
const MAX_SIDE = 2400;
const MAX_BYTES = 1.5 * 1024 * 1024;
const RASTER_RE = /\.(jpe?g|png|webp)$/i;

function safeName(file) {
  const ext = path.extname(file).toLowerCase().replace('.jpeg', '.jpg');
  const base = path.basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/^-|-$/g, '') || 'photo';
  return base + ext;
}

async function processFile(dir, file, taken) {
  const src = path.join(dir, file);
  const stat = fs.statSync(src);
  const input = fs.readFileSync(src);
  const meta = await sharp(input).metadata();
  const w = meta.orientation >= 5 ? meta.height : meta.width;
  const h = meta.orientation >= 5 ? meta.width : meta.height;
  const tooBig = Math.max(w, h) > MAX_SIDE || stat.size > MAX_BYTES;

  let name = safeName(file);
  if (tooBig && path.extname(name) === '.png') name = name.replace(/\.png$/, '.jpg');
  let n = 2;
  while (taken.has(name)) name = name.replace(/(-\d+)?(\.[a-z]+)$/, '-' + n++ + '$2');
  taken.add(name);

  if (!tooBig && name === file) return null;
  const dest = path.join(dir, name);

  if (tooBig) {
    const backup = path.join(BACKUP_DIR, path.basename(dir), file);
    if (!fs.existsSync(backup)) {
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(src, backup);
    }
    let pipe = sharp(input).rotate().resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true });
    pipe = name.endsWith('.webp') ? pipe.webp({ quality: 85 }) : pipe.jpeg({ quality: 85, mozjpeg: true });
    const buf = await pipe.toBuffer();
    fs.unlinkSync(src);
    fs.writeFileSync(dest, buf);
    return file + ' -> ' + name + ' (' + Math.round(stat.size / 1024) + ' KB -> ' + Math.round(buf.length / 1024) + ' KB)';
  }
  const tmp = dest + '.tmp';
  fs.renameSync(src, tmp); // two steps so a case-only rename works on Windows
  fs.renameSync(tmp, dest);
  return file + ' -> ' + name;
}

async function main() {
  let changed = 0;
  for (const slug of fs.readdirSync(TOURS_DIR)) {
    const dir = path.join(TOURS_DIR, slug);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir).filter(function (f) { return RASTER_RE.test(f); }).sort();
    const taken = new Set();
    for (const file of files) {
      let msg;
      try { msg = await processFile(dir, file, taken); } catch (err) {
        console.warn('SKIPPED ' + slug + '/' + file + ': ' + err.message + ' (the file is damaged; copy it again)');
        continue;
      }
      if (msg) { console.log(slug + '/' + msg); changed++; }
    }
  }
  console.log(changed ? changed + ' file(s) updated. Originals: ' + BACKUP_DIR : 'All photos are ready.');
}

main().catch(function (err) { console.error(err); process.exit(1); });
