/*
 * Build-time image pipeline.
 *
 * processImages() walks assets/images once, and for every raster file
 * (jpg/jpeg/png/webp) produces resized WebP variants plus one 1200px JPEG for
 * social previews (og:image). Results are cached in .cache/images/ keyed by the
 * file's content hash, so unchanged photos are never re-encoded (CI restores
 * this folder with actions/cache). SVGs are copied as-is.
 *
 * After processing, the synchronous helpers img() / imageUrl() render
 * <img srcset sizes width height> tags from the registry. Asking for an image
 * that does not exist throws — a broken path in tours.json fails the build
 * instead of shipping a missing picture.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const WIDTHS = [480, 800, 1200, 1600, 1920];
const WEBP_QUALITY = 80;
const OG_WIDTH = 1200;
const RASTER = /\.(jpe?g|png|webp)$/i;

/* `sizes` per layout slot, matching the breakpoints in components.css. */
const PRESETS = {
  hero:     '100vw',
  card:     '(max-width: 700px) 100vw, (max-width: 1060px) 50vw, 420px',
  tile:     '(max-width: 520px) 50vw, (max-width: 880px) 33vw, 320px',
  gallery:  '(max-width: 880px) 50vw, 320px',
  portrait: '(max-width: 880px) 100vw, 460px',
  inset:    '(max-width: 880px) 38vw, 160px',
  masonry:  '(max-width: 880px) 33vw, 20vw',
  half:     '(max-width: 880px) 100vw, 640px',
  full:     '(max-width: 1360px) 100vw, 1320px',
  avatar:   '64px'
};

/* url path (/assets/images/...) -> { width, height, variants: [{ w, url }], og } */
const registry = new Map();

function hashFile(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function processOne(file, rel, cacheDir, outDir) {
  const base = rel.replace(/\.[^.]+$/, '');
  const urlBase = '/' + base.split(path.sep).join('/');
  /* Short hashed folder name: long photo names otherwise exceed the 260-character Windows path limit. */
  const relHash = crypto.createHash('sha1').update(base.split(path.sep).join('/')).digest('hex').slice(0, 8);
  const cacheKey = path.join(cacheDir, relHash + '-' + hashFile(file));
  const metaFile = path.join(cacheKey, 'meta.json');

  let meta;
  if (fs.existsSync(metaFile)) {
    meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  } else {
    fs.rmSync(cacheKey, { recursive: true, force: true });
    fs.mkdirSync(cacheKey, { recursive: true });
    const info = await sharp(file).metadata();
    /* EXIF orientation 5-8 means the stored pixels are rotated 90°; .rotate() swaps them. */
    const swapped = info.orientation >= 5;
    const origW = swapped ? info.height : info.width;
    const origH = swapped ? info.width : info.height;
    let widths = WIDTHS.filter(function (w) { return w <= origW; });
    if (!widths.length) widths = [origW];

    /* Decode the (often 20+ megapixel) original only once: downscale it to the
       largest variant, keep that in memory, and derive the smaller sizes from it. */
    const maxW = widths[widths.length - 1];
    const master = await sharp(file, { sequentialRead: true }).rotate().resize({ width: maxW }).toBuffer();

    const variants = [];
    for (const w of widths) {
      const name = path.basename(base) + '-' + w + '.webp';
      await sharp(master).resize({ width: w }).webp({ quality: WEBP_QUALITY }).toFile(path.join(cacheKey, name));
      variants.push({ w: w, h: Math.round(origH * w / origW), file: name });
    }
    const ogName = path.basename(base) + '-og.jpg';
    await sharp(master).resize({ width: Math.min(OG_WIDTH, maxW) }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(cacheKey, ogName));

    meta = { width: origW, height: origH, variants: variants, og: ogName };
    fs.writeFileSync(metaFile, JSON.stringify(meta));
  }

  /* Copy variants from the cache into dist/ and register their public URLs. */
  const outSub = path.join(outDir, path.dirname(rel));
  fs.mkdirSync(outSub, { recursive: true });
  const urlDir = path.posix.dirname(urlBase);
  const copy = function (name) {
    fs.copyFileSync(path.join(cacheKey, name), path.join(outSub, name));
    return urlDir + '/' + name;
  };
  registry.set('/' + rel.split(path.sep).join('/'), {
    width: meta.width,
    height: meta.height,
    variants: meta.variants.map(function (v) { return { w: v.w, h: v.h, url: copy(v.file) }; }),
    og: copy(meta.og)
  });
}

/**
 * @param {object} o
 * @param {string} o.root     project root
 * @param {string} o.outDir   dist/ root (images land under outDir/assets/images/...)
 */
async function processImages(o) {
  const srcDir = path.join(o.root, 'assets', 'images');
  const cacheDir = path.join(o.root, '.cache', 'images');
  fs.mkdirSync(cacheDir, { recursive: true });
  const files = walk(srcDir, []);
  let processed = 0, copied = 0;
  for (const file of files) {
    const rel = path.relative(o.root, file); /* assets/images/... */
    if (RASTER.test(file)) {
      await processOne(file, rel, cacheDir, o.outDir);
      processed++;
    } else if (/\.(svg|gif)$/i.test(file)) {
      const dest = path.join(o.outDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(file, dest);
      copied++;
    }
    /* anything else (README.txt placeholders, .DS_Store, ...) is not published */
  }
  console.log('images: processed', processed, 'raster files,', copied, 'copied as-is');
}

function lookup(src) {
  const entry = registry.get(src);
  if (!entry) throw new Error('Unknown image "' + src + '" — file missing under assets/images (paths are case-sensitive)');
  return entry;
}

function attr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

/**
 * Render a responsive <img>.
 * @param {string} src    original path, e.g. /assets/images/tours/x.jpg
 * @param {object} opts   { preset, sizes, alt, class, style, eager, id }
 */
function img(src, opts) {
  opts = opts || {};
  if (/^https?:\/\//.test(src)) {
    /* External image (e.g. a stock photo URL): nothing to resize, plain tag. */
    const ext = ['src="' + attr(src) + '"', 'alt="' + attr(opts.alt || '') + '"', 'loading="lazy"', 'decoding="async"'];
    if (opts.class) ext.push('class="' + attr(opts.class) + '"');
    if (opts.style) ext.push('style="' + attr(opts.style) + '"');
    return '<img ' + ext.join(' ') + '>';
  }
  const e = lookup(src);
  const sizes = opts.sizes || PRESETS[opts.preset || 'full'];
  if (!sizes) throw new Error('Unknown image preset "' + opts.preset + '"');
  const largest = e.variants[e.variants.length - 1];
  const fallback = e.variants.find(function (v) { return v.w >= 1200; }) || largest;
  const srcset = e.variants.map(function (v) { return v.url + ' ' + v.w + 'w'; }).join(', ');
  const parts = [
    'src="' + fallback.url + '"',
    'srcset="' + srcset + '"',
    'sizes="' + sizes + '"',
    'width="' + largest.w + '"',
    'height="' + largest.h + '"',
    'alt="' + attr(opts.alt || '') + '"'
  ];
  if (opts.eager) parts.push('loading="eager"', 'fetchpriority="high"');
  else parts.push('loading="lazy"', 'decoding="async"');
  if (opts.class) parts.push('class="' + attr(opts.class) + '"');
  if (opts.style) parts.push('style="' + attr(opts.style) + '"');
  if (opts.id) parts.push('id="' + attr(opts.id) + '"');
  return '<img ' + parts.join(' ') + '>';
}

/* Absolute-path URL of the social-preview JPEG for a source image
   (an external http(s) URL is returned unchanged). */
function ogImageUrl(src) {
  if (/^https?:\/\//.test(src)) return src;
  return lookup(src).og;
}

module.exports = { processImages, img, ogImageUrl, PRESETS };
