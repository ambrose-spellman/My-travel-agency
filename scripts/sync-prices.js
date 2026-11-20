/*
 * Pulls client prices from the published «Сайт» sheet of the Google workbook
 * «Расчёты туров 2027» and writes them into data/tours.json.
 *
 *   PRICES_CSV_URL=<published CSV link> node scripts/sync-prices.js
 *
 * The sheet has one row per tour: slug, title, then the price per person in USD
 * for groups of 1..10. Only those client prices are published; costs and agent
 * rates stay in the private workbook.
 *
 * Safety: the run fails (and changes nothing) when a cell is empty or not a
 * number, a price is outside MIN_PRICE..MAX_PRICE, or a price moves by more
 * than MAX_CHANGE compared with the site, unless ALLOW_BIG_CHANGE=1.
 * Prints "changed=true|false" for the workflow.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const TOURS_FILE = path.join(__dirname, '..', 'data', 'tours.json');
const GROUP_SIZES = 10;
const MIN_PRICE = 50;
const MAX_PRICE = 30000;
const MAX_CHANGE = 0.3;

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/* "1,234" / "$1 234" / "1234.0" -> 1234; anything else -> NaN */
function toPrice(s) {
  const clean = String(s).replace(/[\s$, ]/g, '');
  return /^\d+(\.\d+)?$/.test(clean) ? Math.round(Number(clean)) : NaN;
}

async function main() {
  const url = process.env.PRICES_CSV_URL || process.argv[2];
  if (!url) {
    console.log('PRICES_CSV_URL is not set: prices not synced.');
    console.log('changed=false');
    return;
  }
  let text;
  if (/^https?:\/\//.test(url)) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('Could not download the price sheet: HTTP ' + res.status);
    text = await res.text();
  } else {
    text = fs.readFileSync(url, 'utf8'); /* a local CSV, for testing */
  }
  const rows = parseCsv(text).filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  if (!rows.length || rows[0][0].trim() !== 'slug') throw new Error('The price sheet must start with a "slug" column (is the «Сайт» sheet published?)');

  const raw = fs.readFileSync(TOURS_FILE, 'utf8');
  const data = JSON.parse(raw);
  const tours = data.tours || data;
  const errors = [], bigChanges = [], report = [];
  const updates = [];

  for (const r of rows.slice(1)) {
    const slug = r[0].trim();
    if (!slug) continue;
    const tour = tours.find(function (t) { return t.slug === slug; });
    if (!tour) { console.warn('Skipped "' + slug + '": no such tour on the site.'); continue; }
    const prices = r.slice(2, 2 + GROUP_SIZES).map(toPrice);
    if (prices.length < GROUP_SIZES) { errors.push(slug + ': expected ' + GROUP_SIZES + ' prices, got ' + prices.length); continue; }
    const bad = prices.map(function (p, i) { return { p: p, n: i + 1 }; })
      .filter(function (x) { return !(x.p >= MIN_PRICE && x.p <= MAX_PRICE); });
    if (bad.length) { errors.push(slug + ': bad price for ' + bad.map(function (x) { return x.n + ' pax ("' + r[x.n + 1] + '")'; }).join(', ')); continue; }

    const old = {};
    (tour.priceTable || []).forEach(function (row) { old[row.group] = row.perPerson; });
    prices.forEach(function (p, i) {
      const before = old[i + 1];
      if (before && Math.abs(p - before) / before > MAX_CHANGE) bigChanges.push(slug + ', ' + (i + 1) + ' pax: $' + before + ' -> $' + p);
    });
    const same = prices.every(function (p, i) { return old[i + 1] === p; });
    if (!same) {
      updates.push({ tour: tour, prices: prices });
      report.push(slug + ': ' + prices.join(' / '));
    }
  }

  if (errors.length) throw new Error('Price sheet has errors, nothing changed:\n  ' + errors.join('\n  '));
  if (bigChanges.length && process.env.ALLOW_BIG_CHANGE !== '1') {
    throw new Error('Prices changed by more than ' + MAX_CHANGE * 100 + '%, nothing changed. Check the workbook, ' +
      'or run the workflow by hand with "allow big change":\n  ' + bigChanges.join('\n  '));
  }

  for (const u of updates) {
    const t = u.tour;
    t.priceTable = u.prices.map(function (p, i) { return { group: i + 1, perPerson: p, total: p * (i + 1) }; });
    t.priceFrom = Math.min.apply(null, u.prices);
    if (t.pricing) t.pricing.displayFromPrice = t.priceFrom;
    if (t.groupSize) t.groupSize.max = GROUP_SIZES;
  }
  if (updates.length) {
    fs.writeFileSync(TOURS_FILE, JSON.stringify(data, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
    console.log('Updated prices:\n  ' + report.join('\n  '));
  } else {
    console.log('Prices are up to date.');
  }
  console.log('changed=' + (updates.length > 0));
}

main().catch(function (err) { console.error(err.message); process.exit(1); });
