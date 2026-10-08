/*
 * Static site generator for the Ashuu Travel website.
 * Reads data/tours.json and data/destinations.json, renders every page from
 * shared header/footer/card templates, and writes plain static HTML into the
 * project root (tours/, destinations/, about/, practical-info/, contact/, index.html).
 * Run with: node scripts/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TOURS = require(path.join(ROOT, 'data/tours.json')).tours;
const DESTINATIONS = require(path.join(ROOT, 'data/destinations.json')).destinations;

/* ------------------------------------------------------------------ */
/* Site configuration — placeholders the client should replace before launch */
/* ------------------------------------------------------------------ */
const SITE = {
  name: 'Ashuu Travel',
  tagline: 'Horse and 4x4 adventures from At-Bashy',
  url: 'https://atbashy.tours',
  whatsapp: '996700000000',
  email: 'hello@atbashy.tours',
  instagram: 'atbashy.travel',
  facebook: 'facebook.com/atbashytravel',
  perDayBase: 100,
  markup: 0.30,
  minBillable: 4
};

const NAV = [
  { label: 'Tours', href: '/tours/' },
  { label: 'Destinations', href: '/destinations/' },
  { label: 'About', href: '/about/' },
  { label: 'Practical Info', href: '/practical-info/' },
  { label: 'Contact', href: '/contact/' }
];

const ICONS = {
  whatsapp: 'M12 2a10 10 0 0 0-8.66 15l-1.3 4.8 4.92-1.28A10 10 0 1 0 12 2z',
  telegram: 'M21 4 3 11l6 2 2 6 3-4 5 4zM9 13l12-9',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.5 6.5h.01',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8z'
};

const IMAGE_POOL = [
  '/assets/images/general/mountain-lake-yurts.webp',
  '/assets/images/general/camel-pastures.webp',
  '/assets/images/general/sheep-pastures.jpg',
  '/assets/images/destinations/kel-suu-valley.jpg',
  '/assets/images/destinations/song-kul-horseman.webp',
  '/assets/images/destinations/issyk-kul-skazka-canyon-1.jpg',
  '/assets/images/destinations/issyk-kul-skazka-canyon-2.jpg'
];
function poolImage(seed) { return IMAGE_POOL[((seed % IMAGE_POOL.length) + IMAGE_POOL.length) % IMAGE_POOL.length]; }

const DEST_REGION_MAP = {
  'at-bashy': ['At-Bashy'],
  'naryn': ['Naryn'],
  'kel-suu': ['Kel-Suu'],
  'song-kul': ['Song-Kul'],
  'issyk-kul': ['Issyk-Kul', 'Chuy'],
  'sary-chelek-arslanbob-osh': ['Jalal-Abad', 'Osh']
};

const FAQ_HOME = [
  { q: 'What is the best time to visit?', a: 'June to September for high pastures and lakes. Kel-Suu horse routes are best in July and August; lower valleys are good from May to October.' },
  { q: 'Do I need previous horse riding experience?', a: 'No. Kyrgyz horses are calm and a horseman rides with the group. If it is your first ride, we suggest a route of up to 4 days.' },
  { q: 'What is included in the price?', a: 'Transport, guide and horseman, horses, meals on the route, accommodation and the border permit for Kel-Suu. See each tour page for the full list.' },
  { q: 'Is travel insurance required?', a: 'Yes. Please bring travel insurance that covers horse riding and trekking at altitude.' }
];
const FAQ_MORE = [
  { q: 'How do I book?', a: 'Send us your dates and group size on WhatsApp. We confirm availability and send the itinerary and payment details.' },
  { q: 'Do I need a permit for Kel-Suu?', a: 'Yes, Kel-Suu is in the border zone. We arrange the permit; send us your passport details at least two weeks before the trip.' },
  { q: 'Can you pick me up in Bishkek?', a: 'Yes, transfers from Bishkek to At-Bashy and back are part of our tours.' },
  { q: 'Is there mobile signal on the route?', a: 'In villages, yes. On the high pastures and at Kel-Suu there is usually none.' }
];

const WHY_US = [
  ['Local Knowledge', 'At-Bashy is our home. We know the valleys, the families and the weather.'],
  ['Personal Journeys', 'Every itinerary is built around your dates, pace and interests.'],
  ['Beyond the Usual Route', 'Kel-Suu via Bogoshtu Pass, Achakaiyndy and routes few agencies run.'],
  ['Safety First', 'Experienced horsemen, calm horses and guides who know the terrain.'],
  ['Flexible Itineraries', 'Add or drop days, switch from horse to 4x4 — tell us on WhatsApp.'],
  ['Responsible Travel', 'We work with local families, camps and horse owners.']
];

const VALUES = [
  ['Local Knowledge', 'Guides from At-Bashy who know every valley.'],
  ['Personal Approach', 'Small groups and routes built for you.'],
  ['Safety First', 'Calm horses, experienced horsemen, clear plans.'],
  ['Responsible Travel', 'Income stays with local families and camps.']
];

const INFO_SECTIONS = [
  ['getting', 'Getting to Kyrgyzstan', 'Most travelers fly to Manas International Airport in Bishkek. Check the visa rules for your nationality on the official e-visa portal before you travel.', ['Flights to Bishkek (FRU) via Istanbul, Dubai, Almaty and Moscow', 'Visa-free entry or e-visa depending on nationality', 'Land borders with Kazakhstan, Uzbekistan and China']],
  ['time', 'Best Time to Visit', 'The mountain season runs from late May to early October. High routes and Kel-Suu are best from July to August.', ['Spring: green valleys, cool nights', 'Summer: pastures, yurt camps, all routes open', 'Autumn: golden colours, fewer travelers']],
  ['pack', 'What to Pack', 'Layers are key: days can be hot and nights near freezing above 3,000 m.', ['Warm jacket, rain shell, fleece', 'Hiking boots and comfortable riding trousers', 'Sleeping bag (comfort 0°C), sunscreen, personal medicine']],
  ['altitude', 'Altitude & Weather', 'Many routes run between 2,000 and 4,000 m. Drink water, go slowly on the first day and tell your guide if you feel unwell.', []],
  ['riding', 'Horse Riding Experience', 'Beginners are welcome. We match horses to riders and start with shorter distances.', []],
  ['safety', 'Safety', 'Our guides carry a first-aid kit and know the routes. Some areas have no signal; the guide keeps in touch with the base where possible.', []],
  ['payment', 'Payment & Cancellation', 'Deposit to confirm the booking, balance in cash on arrival or by bank transfer.', ['Payment in USD or KGS', 'Cancellation terms sent with your booking', 'Weather changes: route adjusted on the spot']],
  ['responsible', 'Responsible Travel', 'We work with local families in At-Bashy and Naryn, use local horses and camps, and take all rubbish back from the mountains.', []]
];

/* ------------------------------------------------------------------ */
/* Utilities */
/* ------------------------------------------------------------------ */
function waLink(message) {
  return 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(message);
}
function attr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function outPath(urlPath) {
  const clean = urlPath.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean ? path.join(ROOT, clean, 'index.html') : path.join(ROOT, 'index.html');
}
function writeFile(urlPath, html) {
  const dest = outPath(urlPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  console.log('wrote', path.relative(ROOT, dest));
}
function icon(name, size) {
  size = size || 22;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICONS[name] + '"></path></svg>';
}

/* ------------------------------------------------------------------ */
/* Shared chrome: <head>, header, mobile menu, footer, floating WhatsApp */
/* ------------------------------------------------------------------ */
function renderHead(opts) {
  const url = SITE.url + opts.path;
  const ogImage = SITE.url + (opts.image || '/assets/images/general/mountain-lake-yurts.webp');
  const ld = opts.structuredData ? '\n<script type="application/ld+json">' + JSON.stringify(opts.structuredData) + '</script>' : '';
  return [
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + opts.title + ' | ' + SITE.name + '</title>',
    '<meta name="description" content="' + attr(opts.description) + '">',
    '<link rel="canonical" href="' + url + '">',
    '<meta property="og:title" content="' + attr(opts.title) + '">',
    '<meta property="og:description" content="' + attr(opts.description) + '">',
    '<meta property="og:image" content="' + ogImage + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:type" content="website">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + attr(opts.title) + '">',
    '<meta name="twitter:description" content="' + attr(opts.description) + '">',
    '<meta name="twitter:image" content="' + ogImage + '">',
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="/assets/css/main.css">',
    '<link rel="stylesheet" href="/assets/css/components.css">',
    '<link rel="stylesheet" href="/assets/css/utilities.css">',
    ld
  ].join('\n');
}

function renderHeader(activeHref) {
  const navLinks = NAV.map(function (n) {
    return '<a href="' + n.href + '"' + (activeHref === n.href ? ' aria-current="page"' : '') + '>' + n.label + '</a>';
  }).join('\n        ');
  return `
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header">
  <div class="site-header__bar">
    <a href="/" class="site-header__logo"><img src="/assets/images/logoat4.svg" alt="${SITE.name}"></a>
    <nav class="site-nav" aria-label="Main navigation">
        ${navLinks}
    </nav>
    <div class="site-header__actions">
      <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--sm">${icon('whatsapp', 18)}<span>WhatsApp</span></a>
      <button type="button" class="menu-toggle" data-menu-toggle aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu" data-mobile-menu>
  <div class="mobile-menu__top">
    <span class="mobile-menu__brand">${SITE.name}</span>
    <button type="button" class="mobile-menu__close" data-menu-close aria-label="Close menu">&times;</button>
  </div>
  <nav aria-label="Mobile navigation">
    ${NAV.map(function (n) { return '<a href="' + n.href + '"' + (activeHref === n.href ? ' aria-current="page"' : '') + '>' + n.label + '</a>'; }).join('\n    ')}
  </nav>
  <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg btn--block">Chat on WhatsApp</a>
  <div class="mobile-menu__social">
    <a href="https://instagram.com/${SITE.instagram}" target="_blank" rel="noopener">Instagram</a>
    <a href="https://${SITE.facebook}" target="_blank" rel="noopener">Facebook</a>
  </div>
</div>`;
}

function renderFooter() {
  return `
<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__col">
      <img src="/assets/images/logoat4.svg" alt="${SITE.name}" class="site-footer__logo">
      <span class="site-footer__tagline">${SITE.tagline}</span>
    </div>
    <div class="site-footer__col">
      <span class="site-footer__heading">Explore</span>
      ${NAV.map(function (n) { return '<a href="' + n.href + '">' + n.label + '</a>'; }).join('\n      ')}
    </div>
    <div class="site-footer__col">
      <span class="site-footer__heading">Contact</span>
      <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener">WhatsApp +${SITE.whatsapp}</a>
      <a href="mailto:${SITE.email}">${SITE.email}</a>
      <span style="color:rgba(244,240,232,.75)">Bishkek · At-Bashy, Kyrgyzstan</span>
    </div>
    <div class="site-footer__col">
      <span class="site-footer__heading">Follow</span>
      <a href="https://instagram.com/${SITE.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a href="https://${SITE.facebook}" target="_blank" rel="noopener">Facebook</a>
      <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--sm" style="margin-top:8px;align-self:flex-start">WhatsApp</a>
    </div>
  </div>
  <div class="container site-footer__bottom">
    <span>&copy; ${new Date().getFullYear()} ${SITE.name}</span>
    <span class="site-footer__legal"><a href="#">Terms</a><a href="#">Privacy</a></span>
  </div>
</footer>
<a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="whatsapp-floating-btn" aria-label="Chat on WhatsApp">
  <svg viewBox="0 0 24 24" fill="#fff"><path d="${ICONS.whatsapp}"></path></svg>
</a>
<script src="/assets/js/whatsapp.js"></script>
<script src="/assets/js/calculator.js"></script>
<script src="/assets/js/main.js"></script>`;
}

function layout(opts) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${renderHead(opts)}
</head>
<body>
${renderHeader(opts.activeHref || '')}
<main id="main-content">
${opts.body}
</main>
${renderFooter()}
</body>
</html>
`;
  writeFile(opts.path, html);
}

/* ------------------------------------------------------------------ */
/* Reusable components */
/* ------------------------------------------------------------------ */
function tourCardHtml(tour) {
  const durationLabel = tour.durationMin === tour.durationMax ? tour.durationMin + ' days' : tour.durationMin + '–' + tour.durationMax + ' days';
  return `
<article class="tour-card" data-activity="${tour.activity}" data-regions="${tour.region.join('|')}" data-duration-min="${tour.durationMin}" data-duration-max="${tour.durationMax}">
  <div class="tour-card__media"><img src="${tour.image}" alt="${attr(tour.title)}" loading="lazy"></div>
  <div class="tour-card__body">
    <div class="tour-card__tags">
      <span class="tour-card__tag tour-card__tag--region">${tour.region[0]}</span>
      <span class="tour-card__tag tour-card__tag--activity">${tour.activity === '4x4' ? 'By Car (4x4)' : tour.activity}</span>
    </div>
    <h3 class="tour-card__title"><a href="/tours/${tour.slug}/" style="color:inherit">${tour.title}</a></h3>
    <div class="tour-card__meta">${durationLabel} &middot; ${tour.difficulty}</div>
    <p class="tour-card__price" style="margin:0;font-weight:600;color:var(--color-rose)">From $${tour.priceFrom} per person <span style="font-weight:400;color:var(--color-text-mute-2);font-size:13px">(min. 4 people rate)</span></p>
    <div class="tour-card__actions">
      <a href="/tours/${tour.slug}/" class="btn btn--outline">View tour</a>
      <a href="#" data-wa-message="${attr(tour.whatsappMessage)}" target="_blank" rel="noopener" class="btn btn--whatsapp">WhatsApp</a>
    </div>
  </div>
</article>`;
}

function destTileHtml(dest, aspect) {
  return `
<a href="/destinations/${dest.slug}/" class="dest-tile" style="${aspect ? 'aspect-ratio:' + aspect : ''}">
  <img src="${dest.tileImage}" alt="${attr(dest.name)}" loading="lazy">
  <span class="dest-tile__scrim"></span>
  <span class="dest-tile__text">
    <span class="name">${dest.name}</span>
    <span class="short">${dest.short}</span>
    <span class="explore">Explore</span>
  </span>
</a>`;
}

function accordionItem(idPrefix, index, q, aHtml, openFirst) {
  const open = openFirst && index === 0;
  return `
<div class="accordion-item${open ? ' is-open' : ''}" id="${idPrefix}-${index}">
  <button type="button" class="accordion-item__trigger" data-accordion-trigger aria-expanded="${open}">
    <span>${q}</span><span class="sign">${open ? '−' : '+'}</span>
  </button>
  <div class="accordion-item__panel">${aHtml}</div>
</div>`;
}

function faqBlock(items, idPrefix) {
  return `<div class="stack--sm">${items.map(function (f, i) { return accordionItem(idPrefix, i, f.q, '<p style="margin:0">' + f.a + '</p>', false); }).join('\n')}</div>`;
}

function testimonialPlaceholder() {
  return `
<div class="testimonial-card" style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">
  <p style="font-style:normal;color:var(--color-text-muted)">We're collecting our first traveler reviews. Real testimonials from Google and TripAdvisor will appear here soon.</p>
</div>`;
}

/* ------------------------------------------------------------------ */
/* Page: Home
/* ------------------------------------------------------------------ */
function buildHome() {
  const featured = TOURS.slice(0, 3);
  const categories = [
    { t: 'Horse Riding Tours', d: 'Multi-day rides through the At-Bashy gorges, to Kel-Suu and Song-Kul, with yurt nights.', activity: 'Horse' },
    { t: '4x4 Adventures', d: 'Mountain roads to Tash-Rabat, Arpa and Kel-Suu for travelers who prefer wheels to saddles.', activity: '4x4' },
    { t: 'Hiking', d: 'Walking routes to Sary-Chelek, Arslanbob and the high lakes.', activity: 'Hiking' },
    { t: 'Build Your Tour', d: 'Pick regions, activities and days — we plan the route around you.', activity: 'Custom' }
  ];
  const gallery = IMAGE_POOL.slice(0, 6);

  const body = `
<section class="hero">
  <img class="hero__media" src="/assets/images/general/mountain-lake-yurts.webp" alt="Yurt camp by a turquoise lake below snow peaks in Kyrgyzstan">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>Authentic horse and 4x4 adventures in the heart of Kyrgyzstan</h1>
    <p>From At-Bashy gorges to Kel-Suu and Song-Kul — tailor-made journeys with local guides</p>
    <div class="hero__actions">
      <a href="/tours/" class="btn btn--primary btn--lg">Explore Tours</a>
      <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Chat on WhatsApp</a>
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container section-intro">
    <h2 class="text-center">Choose Your Adventure</h2>
    <div class="grid-4">
      ${categories.map(function (c) {
        return `<div class="value-card"><div class="t">${c.t}</div><div class="d">${c.d}</div><a href="/tours/#${c.activity}" style="font-weight:600;color:var(--color-forest)">View Tours &rarr;</a></div>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container stack">
    <h2 class="text-center">Popular Tours</h2>
    <div class="grid-3">${featured.map(tourCardHtml).join('\n')}</div>
    <div class="text-center"><a href="/tours/" class="btn btn--outline">View All Tours</a></div>
  </div>
</section>

<section class="section section--mint">
  <div class="container stack">
    <h2 class="text-center">Explore Our Regions</h2>
    <div class="grid-3--dest">${DESTINATIONS.map(function (d) { return destTileHtml(d); }).join('\n')}</div>
    <div class="text-center"><a href="/destinations/" class="btn btn--pill-outline">View All Destinations</a></div>
  </div>
</section>

<section class="section section--forest">
  <div class="container stack">
    <h2 class="text-center">Why Travel With Us</h2>
    <div class="value-grid">
      ${WHY_US.map(function (v, i) {
        return `<div class="value-item"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${v[0]}</h3><p>${v[1]}</p></div>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container stack">
    <h2 class="text-center">Life on the Trail</h2>
    <div class="gallery-grid">
      ${gallery.map(function (src) { return '<div class="gallery-grid__item"><img src="' + src + '" alt="Kyrgyzstan mountain landscape" loading="lazy"></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">What Travelers Say</h2>
    <div class="testimonial-grid">${testimonialPlaceholder()}</div>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2 class="text-center">Common Questions</h2>
    ${faqBlock(FAQ_HOME, 'fh')}
    <div class="text-center"><a href="/practical-info/#info-getting" class="btn--link">View All FAQs</a></div>
  </div>
</section>

<section class="section" style="position:relative;background:#E0663A;overflow:hidden;padding:clamp(80px,9vw,120px) var(--page-pad)">
  <img class="hero__media" src="/assets/images/general/camel-pastures.webp" alt="Camel grazing in front of snow-capped peaks at sunset" style="opacity:.55">
  <div style="position:absolute;inset:0;background:rgba(138,58,28,.62)"></div>
  <div class="container text-center" style="position:relative;max-width:720px;display:flex;flex-direction:column;align-items:center;gap:20px">
    <h2 style="color:#fff">Ready to Explore Kyrgyzstan?</h2>
    <p style="color:rgba(255,255,255,.92);font-size:20px;margin:0">Let's plan your adventure together</p>
    <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Plan Your Trip on WhatsApp</a>
  </div>
</section>`;

  layout({
    path: '/',
    title: 'Authentic Horse & 4x4 Adventures in Kyrgyzstan',
    description: 'Tailor-made horse riding and 4x4 tours through At-Bashy, Kel-Suu, Song-Kul and beyond. Local guides, transparent pricing. Plan your adventure on WhatsApp.',
    image: '/assets/images/general/mountain-lake-yurts.webp',
    activeHref: '',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: Tours catalog
/* ------------------------------------------------------------------ */
function buildToursIndex() {
  const ACTIVITIES = [
    { k: 'Horse', l: 'Horse Riding' },
    { k: '4x4', l: 'By Car (4x4)' },
    { k: 'Hiking', l: 'Hiking' },
    { k: 'Custom', l: 'Build Your Tour' }
  ];
  const REGIONS = ['All', 'At-Bashy', 'Naryn', 'Kel-Suu', 'Song-Kul', 'Issyk-Kul', 'Chuy', 'Jalal-Abad', 'Osh'];
  const DURATIONS = [['All', 'All'], ['1-3', '1–3 days'], ['4-6', '4–6 days'], ['7-10', '7–10 days'], ['11+', '11+ days']];

  const tabs = ACTIVITIES.map(function (c) {
    const count = TOURS.filter(function (t) { return t.activity === c.k; }).length;
    return `<button type="button" class="cat-tabs__tab" data-filter-tab="${c.k}">${c.l}<span class="count">${c.k === 'Custom' ? 'Custom' : count + (count === 1 ? ' route' : ' routes')}</span></button>`;
  }).join('\n      ');

  const durationPills = DURATIONS.map(function (d) { return `<button type="button" class="pill" data-filter-group="duration" data-filter-pill="${d[0]}">${d[1]}</button>`; }).join('\n        ');
  const regionPills = REGIONS.map(function (r) { return `<button type="button" class="pill" data-filter-group="region" data-filter-pill="${r}">${r}</button>`; }).join('\n        ');

  const grandTour = TOURS.find(function (t) { return t.activity === 'Custom'; });

  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/destinations/kel-suu-valley.jpg" alt="Mountains and river valley near Kel-Suu, Kyrgyzstan">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>All Tours</h1>
    <p>Horse riding, 4x4 and hiking adventures through Kyrgyzstan</p>
  </div>
</section>

<section class="section--tight section--white">
  <div class="container">
    <div class="cat-tabs" id="Horse">
      ${tabs}
    </div>
  </div>
</section>

<section class="section--tight section--white" data-filter-bar>
  <div class="container stack--sm">
    <div class="filter-row"><span class="filter-row__label">Duration</span>${durationPills}</div>
    <div class="filter-row"><span class="filter-row__label">Region</span>${regionPills}</div>
    <div class="results-label" data-results-label>Showing ${TOURS.filter(function (t) { return t.activity === 'Horse'; }).length} tours</div>
  </div>
</section>

<section class="section--tight section--bg">
  <div class="container">
    <div class="grid-3" data-tour-grid data-default-activity="Horse">
      ${TOURS.map(tourCardHtml).join('\n')}
    </div>
    <p class="text-center" data-no-results hidden style="color:var(--color-text-muted)">No routes match these filters — ask us for a custom route.</p>
  </div>
</section>

<section class="section--tight section--bg" data-builder-panel hidden>
  <div class="container grid-2" data-builder data-per-day-base="${SITE.perDayBase}" data-markup="${SITE.markup}" data-min-billable="${SITE.minBillable}">
    <div style="background:#fff;border-radius:8px;padding:32px;display:flex;flex-direction:column;gap:28px">
      <h2 style="margin:0">Build Your Tour</h2>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">Where do you want to go?</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${['At-Bashy', 'Naryn', 'Kel-Suu', 'Song-Kul', 'Tash-Rabat', 'Chatyr-Kol', 'Issyk-Kul', 'Sary-Chelek', 'Arslanbob', 'Osh'].map(function (r) { return '<button type="button" class="pill" data-b-chip="' + r + '" data-b-group="region">' + r + '</button>'; }).join('\n          ')}
        </div>
      </div>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">What do you want to do?</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${['Horse riding', '4x4 drive', 'Hiking', 'Yurt stay', 'Culture & crafts', 'Photography'].map(function (a) { return '<button type="button" class="pill" data-b-chip="' + a + '" data-b-group="activity">' + a + '</button>'; }).join('\n          ')}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:32px">
        <div class="stack--sm">
          <div style="font-size:14px;font-weight:600">Days</div>
          <div class="stepper">
            <button type="button" class="stepper__btn" data-b-days-dec>&minus;</button>
            <span class="stepper__value" data-b-days-value>7</span>
            <button type="button" class="stepper__btn" data-b-days-inc>+</button>
          </div>
        </div>
        <div class="stack--sm">
          <div style="font-size:14px;font-weight:600">Travelers</div>
          <div class="stepper">
            <button type="button" class="stepper__btn" data-b-pax-dec>&minus;</button>
            <span class="stepper__value" data-b-pax-value>2</span>
            <button type="button" class="stepper__btn" data-b-pax-inc>+</button>
          </div>
        </div>
      </div>
      <div class="stack--sm" style="padding-top:20px;border-top:1px solid var(--color-border)">
        <div style="font-size:16px;font-weight:700;color:var(--color-rose)" data-b-estimate>Estimate from $650 for the group</div>
        <a href="#" data-b-wa target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg btn--block">Send My Plan on WhatsApp</a>
        <div style="font-size:13px;color:var(--color-text-mute-2)">We reply within 24 hours with a route and exact price.</div>
      </div>
    </div>
    <div class="stack--sm">
      <div style="font-size:14px;font-weight:600;color:var(--color-text-muted)">Example of a custom route</div>
      ${grandTour ? tourCardHtml(grandTour) : ''}
    </div>
  </div>
</section>

<section class="section section--peach text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h3 style="margin:0">Can't find what you're looking for?</h3>
    <p style="margin:0;font-size:18px;color:var(--color-text-muted)">We create custom tours based on your preferences</p>
    <a href="#" data-wa-message="Hello! I would like a custom tour." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Build Your Custom Tour</a>
  </div>
</section>`;

  layout({
    path: '/tours/',
    title: 'All Tours: Horse Riding, 4x4 & Custom Adventures in Kyrgyzstan',
    description: 'Browse our collection of horse treks, 4x4 adventures and custom tours. From At-Bashy gorges to Kel-Suu lake. Book on WhatsApp.',
    image: '/assets/images/destinations/kel-suu-valley.jpg',
    activeHref: '/tours/',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: Tour detail (x7)
/* ------------------------------------------------------------------ */
function buildTourDetail(tour, index) {
  const facts = [
    { k: 'Duration', v: (tour.durationMin === tour.durationMax ? tour.durationMin : tour.durationMin + '–' + tour.durationMax) + ' days' },
    { k: 'Level', v: tour.difficulty },
    { k: 'Season', v: tour.season[0] + '–' + tour.season[tour.season.length - 1] },
    { k: 'Group', v: tour.groupSize.min + '–' + tour.groupSize.max + ' people' }
  ];
  const infoTable = [
    { k: 'Duration', v: (tour.durationMin === tour.durationMax ? tour.durationMin : tour.durationMin + '–' + tour.durationMax) + ' days' },
    { k: 'Difficulty', v: tour.difficulty },
    { k: 'Best season', v: tour.season[0] + '–' + tour.season[tour.season.length - 1] },
    { k: 'Starting point', v: tour.startingPoint },
    { k: 'Group size', v: tour.groupSize.min + '–' + tour.groupSize.max + ' people' },
    { k: 'Format', v: tour.format.join(' / ') }
  ];

  const itineraryHtml = tour.itinerary.length
    ? `<div>${tour.itinerary.map(function (d, i) {
        return `
<div class="itinerary-item">
  <span class="itinerary-item__num">${d.day}</span>
  <div>
    ${accordionItem('itin-' + tour.slug, i, 'Day ' + d.day + ': ' + d.title, '<p style="margin:0">' + d.description + '</p>', i === 0).replace('accordion-item', 'accordion-item').replace('<div class="accordion-item', '<div style="border-bottom:0" class="accordion-item')}
  </div>
</div>`;
      }).join('\n')}</div>`
    : `<p style="text-align:center;color:var(--color-text-muted)">Send us your dates on WhatsApp and we'll share the detailed day-by-day itinerary and exact route for this tour.</p>`;

  const faqItems = tour.faq.length ? tour.faq.map(function (f) { return { q: f.question, a: f.answer }; }) : FAQ_HOME.slice(0, 3);

  const similar = TOURS.filter(function (t) { return t.id !== tour.id && (t.activity === tour.activity || t.region.some(function (r) { return tour.region.indexOf(r) !== -1; })); }).slice(0, 3);
  const similarFallback = similar.length ? similar : TOURS.filter(function (t) { return t.id !== tour.id; }).slice(0, 3);

  const isHorse = tour.activity === 'Horse' || tour.activity === 'Custom';
  const accommodationImg = poolImage(index + 1);
  const transportImg = poolImage(index + 3);

  const safetyRows = isHorse
    ? [{ k: 'Weight limit', v: 'Max 100 kg / 220 lbs' }, { k: 'Helmet', v: 'Provided' }, { k: 'Guide', v: 'English-speaking' }, { k: 'Insurance', v: 'Required' }]
    : [{ k: 'Guide', v: 'English-speaking' }, { k: 'Vehicle', v: '4x4, maintained and equipped for mountain roads' }, { k: 'Insurance', v: 'Required' }];

  const body = `
<section class="hero-detail">
  <img class="hero-detail__media" src="${tour.image}" alt="${attr(tour.title)}">
  <div class="hero-detail__scrim"></div>
  <div class="hero-detail__content">
    <div class="container">
      <span class="hero-detail__badge">${tour.region[0]}</span>
      <h1>${tour.title}</h1>
      <div class="hero-detail__facts">
        ${facts.map(function (f) { return '<span><span class="k">' + f.k + '</span> ' + f.v + '</span>'; }).join('\n        ')}
      </div>
    </div>
  </div>
</section>

<section class="section--tight section--white">
  <div class="container grid-2">
    <div class="stack" data-calculator
         data-duration-min="${tour.durationMin}" data-duration-max="${tour.durationMax}"
         data-days-default="${tour.durationMin}" data-pax-default="${tour.groupSize.min}"
         data-per-day-base="${tour.pricing.perDayBase}" data-markup="${tour.pricing.organizerMarkup}"
         data-min-billable="${tour.pricing.minBillableParticipants}" data-tour-title="${attr(tour.title)}">
      <h2>Calculate Your Price</h2>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">Number of days</div>
        <div class="stepper">
          <button type="button" class="stepper__btn" data-days-dec>&minus;</button>
          <span class="stepper__value" data-days-value>${tour.durationMin}</span>
          <button type="button" class="stepper__btn" data-days-inc>+</button>
          <span class="stepper__hint">${tour.durationMin}–${tour.durationMax} days</span>
        </div>
      </div>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">Number of travelers</div>
        <div class="stepper">
          <button type="button" class="stepper__btn" data-pax-dec>&minus;</button>
          <span class="stepper__value" data-pax-value>${tour.groupSize.min}</span>
          <button type="button" class="stepper__btn" data-pax-inc>+</button>
          <span class="stepper__hint">${tour.groupSize.min}–${tour.groupSize.max} people</span>
        </div>
      </div>
      <p data-min-note style="margin:0;font-size:14px;color:var(--color-text-mute-2)">Minimum 4-people rate applies for private tours.</p>

      <div class="price-box">
        <div class="price-box__label">Total for group</div>
        <div class="price-box__total" data-total>$0</div>
        <div class="price-box__label" style="margin-top:12px">Per person</div>
        <div class="price-box__per-person" data-per-person>$0</div>
        <div class="price-box__note">Final price may vary based on season and customization</div>
      </div>
      <a href="#" data-wa-book target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg btn--block">Book This Tour on WhatsApp</a>
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container grid-2">
    <div class="stack">
      <h2>Overview</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${tour.description}</p>
      <h3>Highlights</h3>
      <div class="checklist checklist--yes">
        ${tour.highlights.map(function (h) { return '<div class="checklist__item"><span class="mark">&#10003;</span>' + h + '</div>'; }).join('\n        ')}
      </div>
    </div>
    <div class="info-table">
      ${infoTable.map(function (i) { return '<div class="info-table__row"><span class="k">' + i.k + '</span><span class="v">' + i.v + '</span></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2 class="text-center">Day-by-Day Itinerary</h2>
    ${itineraryHtml}
  </div>
</section>

<section class="section section--bg">
  <div class="container grid-2">
    <div class="stack--sm">
      <h3 style="font-family:var(--font-heading);font-weight:400;font-size:26px">What's Included</h3>
      <div class="checklist checklist--yes">${tour.included.map(function (x) { return '<div class="checklist__item"><span class="mark">&#10003;</span>' + x + '</div>'; }).join('\n')}</div>
    </div>
    <div class="stack--sm">
      <h3 style="font-family:var(--font-heading);font-weight:400;font-size:26px">What's Not Included</h3>
      <div class="checklist checklist--no">${tour.notIncluded.map(function (x) { return '<div class="checklist__item"><span class="mark">&#10007;</span>' + x + '</div>'; }).join('\n')}</div>
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>Accommodation</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${tour.accommodation}. Bedding and mats are provided; bring a warm sleeping bag for nights above 3,000 m.</p>
      <div style="position:relative;aspect-ratio:16/10;border-radius:6px;overflow:hidden"><img src="${accommodationImg}" alt="Accommodation on the ${attr(tour.title)} route" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>
    </div>
    <div class="stack--sm">
      <h2>Transport</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${tour.transport}. Starting point: ${tour.startingPoint}. Ending point: ${tour.endingPoint}.</p>
      <div style="position:relative;aspect-ratio:16/10;border-radius:6px;overflow:hidden"><img src="${transportImg}" alt="Transport on the ${attr(tour.title)} route" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>
    </div>
  </div>
</section>

<section class="section section--mint">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>${isHorse ? 'Horse Riding &amp; Safety' : 'On the Road &amp; Safety'}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${isHorse ? 'Kyrgyz horses are calm, sure-footed and used to mountain trails. Beginners are welcome: a horseman leads your horse on the first day and stays with the group on every ride.' : 'Our drivers know these roads well and carry recovery and first-aid equipment for remote mountain routes.'}</p>
    </div>
    <div class="info-table">
      ${safetyRows.map(function (i) { return '<div class="info-table__row"><span class="k">' + i.k + '</span><span class="v">' + i.v + '</span></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2 class="text-center">Frequently Asked Questions</h2>
    ${faqBlock(faqItems, 'faq-' + tour.slug)}
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">Similar Tours</h2>
    <div class="grid-3">${similarFallback.map(tourCardHtml).join('\n')}</div>
  </div>
</section>

<section class="section section--forest text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">Ready to Book?</h2>
    <p style="color:rgba(255,255,255,.9);font-size:18px;margin:0">Contact us on WhatsApp to check availability and finalize your booking</p>
    <a href="#" data-wa-message="${attr(tour.whatsappMessage)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Check Availability on WhatsApp</a>
  </div>
</section>`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.title,
    description: tour.description,
    provider: {
      '@type': 'LocalBusiness',
      name: SITE.name,
      image: SITE.url + '/assets/images/logoat4.svg',
      telephone: '+' + SITE.whatsapp,
      url: SITE.url,
      address: { '@type': 'PostalAddress', addressCountry: 'KG' }
    },
    itinerary: tour.itinerary.length ? {
      '@type': 'ItemList',
      itemListElement: tour.itinerary.map(function (d) { return { '@type': 'ListItem', position: d.day, name: 'Day ' + d.day + ': ' + d.title, description: d.description }; })
    } : undefined,
    offers: { '@type': 'Offer', price: String(tour.priceFrom), priceCurrency: tour.currency, availability: 'https://schema.org/InStock' },
    duration: 'P' + tour.durationMin + 'D/P' + tour.durationMax + 'D',
    touristType: ['Adventure travelers', 'Horse riding enthusiasts', 'Nature lovers'],
    travelMode: tour.activity,
    startsAt: { '@type': 'Place', name: tour.startingPoint, address: { '@type': 'PostalAddress', addressCountry: 'KG' } },
    endsAt: { '@type': 'Place', name: tour.endingPoint, address: { '@type': 'PostalAddress', addressCountry: 'KG' } }
  };

  layout({
    path: '/tours/' + tour.slug + '/',
    title: tour.title,
    description: tour.description.slice(0, 140) + ' ' + (tour.durationMin === tour.durationMax ? tour.durationMin : tour.durationMin + '–' + tour.durationMax) + ' days, from $' + tour.priceFrom + ' pp. Book on WhatsApp.',
    image: tour.image,
    activeHref: '/tours/',
    structuredData: structuredData,
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: Destinations catalog
/* ------------------------------------------------------------------ */
function buildDestinationsIndex() {
  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/mountain-lake-yurts.webp" alt="Mountain landscape in Kyrgyzstan">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>Destinations</h1>
    <p>Explore the regions we know best</p>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-3--dest">
    ${DESTINATIONS.map(function (d) { return destTileHtml(d); }).join('\n')}
  </div>
</section>

<section class="section section--mint">
  <div class="container">
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">
      ${DESTINATIONS.map(function (d) { return `<a href="/destinations/${d.slug}/" class="dest-chip"><span class="dot"></span>${d.name}</a>`; }).join('\n      ')}
    </div>
  </div>
</section>`;

  layout({
    path: '/destinations/',
    title: 'Destinations: Explore At-Bashy, Kel-Suu, Song-Kul & More',
    description: "Discover the best regions for adventure travel in Kyrgyzstan. Local knowledge, authentic experiences.",
    image: '/assets/images/general/mountain-lake-yurts.webp',
    activeHref: '/destinations/',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: Destination detail (x6)
/* ------------------------------------------------------------------ */
function buildDestinationDetail(dest) {
  const regionKeywords = DEST_REGION_MAP[dest.slug] || [];
  const destTours = TOURS.filter(function (t) {
    return t.region.some(function (r) { return regionKeywords.indexOf(r) !== -1; }) || t.region.indexOf('All regions') !== -1;
  }).slice(0, 3);

  const body = `
<section class="hero-detail hero-detail--dest">
  <img class="hero-detail__media" src="${dest.heroImage}" alt="${attr(dest.name)}">
  <div class="hero-detail__scrim"></div>
  <div class="hero-detail__content">
    <div class="container stack--sm">
      <h1 style="margin:0">${dest.name}</h1>
      <p style="margin:0;font-size:20px;color:rgba(255,255,255,.92)">${dest.short}</p>
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>About ${dest.name}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${dest.about}</p>
    </div>
    <div class="info-table info-table--flat">
      ${dest.info.map(function (i) { return '<div class="info-table__row"><span class="k">' + i.k + '</span><span class="v">' + i.v + '</span></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2>Highlights</h2>
    <div class="grid-3">
      ${dest.highlights.map(function (h) {
        return `<div style="background:#fff;border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
  <div style="position:relative;aspect-ratio:16/10"><img src="${h.img}" alt="${attr(h.t)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>
  <div style="padding:24px;display:flex;flex-direction:column;gap:8px"><div style="font:600 20px var(--font-body)">${h.t}</div><div style="font-size:16px;line-height:1.6;color:var(--color-text-muted)">${h.d}</div></div>
</div>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>Getting There</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${dest.gettingThere}</p>
      <div class="stack--sm">
        ${dest.gettingThereBullets.map(function (b) { return '<div>&bull; ' + b + '</div>'; }).join('\n        ')}
      </div>
    </div>
    <div class="info-table info-table--flat" style="padding:0;background:none;box-shadow:none">
      <img src="${dest.heroImage}" alt="Route to ${attr(dest.name)}" loading="lazy" style="width:100%;border-radius:8px;object-fit:cover;aspect-ratio:4/3">
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2>Tours in ${dest.name}</h2>
    <div class="grid-3">${destTours.map(tourCardHtml).join('\n')}</div>
  </div>
</section>

<section class="section section--forest text-center">
  <div class="container stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">${dest.ctaTitle}</h2>
    <a href="#" data-wa-message="Hello! I would like to plan a trip to ${attr(dest.name)}." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Plan Your Trip</a>
  </div>
</section>`;

  layout({
    path: '/destinations/' + dest.slug + '/',
    title: dest.name,
    description: dest.about.slice(0, 150),
    image: dest.heroImage,
    activeHref: '/destinations/',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: About
/* ------------------------------------------------------------------ */
function buildAbout() {
  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/mountain-lake-yurts.webp" alt="Founder with horses in Kyrgyzstan">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>About Us</h1>
    <p>Local guides, authentic experiences</p>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2" style="align-items:center">
    <div class="stack--sm">
      <h2>Our Story</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">We are a small, local team based in At-Bashy, Naryn region. We grew up riding these valleys and know the gorges, passes and families along the route to Tash-Rabat, Chatyr-Kol and Kel-Suu firsthand. We started this company to share those routes the way we experience them: at a personal pace, with real local hospitality, not as a stop on a fixed group itinerary.</p>
      <p style="font-size:15px;color:var(--color-text-mute-2)"><em>More of our story, photos and founder details coming soon — this section will be updated with your input.</em></p>
    </div>
    <div style="position:relative;aspect-ratio:4/5;border-radius:8px;overflow:hidden"><img src="/assets/images/general/camel-pastures.webp" alt="Kyrgyzstan mountain landscape" style="width:100%;height:100%;object-fit:cover"></div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">Our Values</h2>
    <div class="grid-4">
      ${VALUES.map(function (v) { return '<div class="value-card"><div class="t">' + v[0] + '</div><div class="d">' + v[1] + '</div></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container stack">
    <h2 class="text-center">Meet Your Guides</h2>
    <p class="text-center" style="color:var(--color-text-mute-2)">Guide profiles and photos will be added here — send us names, roles, languages and a short bio for each guide.</p>
  </div>
</section>

<section class="section section--peach text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="margin:0">Meet Us in Person</h2>
    <p style="margin:0;font-size:18px;color:#8A3A1C">Have questions? Chat with us on WhatsApp</p>
    <a href="#" data-wa-message="Hello! I would like to plan a trip in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Chat on WhatsApp</a>
  </div>
</section>`;

  layout({
    path: '/about/',
    title: 'About Us: Local Adventure Company in Kyrgyzstan',
    description: 'We are a local tour company specializing in horse riding and 4x4 adventures through At-Bashy, Kel-Suu and Song-Kul. Meet our team.',
    image: '/assets/images/general/mountain-lake-yurts.webp',
    activeHref: '/about/',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: Practical Info
/* ------------------------------------------------------------------ */
function buildPracticalInfo() {
  const navLinks = INFO_SECTIONS.map(function (s) { return '<a href="#info-' + s[0] + '">' + s[1] + '</a>'; }).join('\n    ');
  const sections = INFO_SECTIONS.map(function (s) {
    const bullets = s[3].length ? '<div class="stack--sm">' + s[3].map(function (b) { return '<div class="info-section__bullet"><span class="dot">&bull;</span>' + b + '</div>'; }).join('\n') + '</div>' : '';
    return `<div class="info-section" id="info-${s[0]}"><h2>${s[1]}</h2><p>${s[2]}</p>${bullets}</div>`;
  }).join('\n    ');

  const allFaq = FAQ_HOME.concat(FAQ_MORE);

  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/sheep-pastures.jpg" alt="Traveler in the Kyrgyz mountains">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>Practical Information</h1>
    <p>Everything you need to know before your trip</p>
  </div>
</section>

<section class="section--tight section--white">
  <div class="container info-layout">
    <nav class="info-nav" aria-label="Practical information sections">${navLinks}</nav>
    <div class="info-content">${sections}</div>
  </div>
</section>

<section class="section section--bg">
  <div class="container max-w-800 stack">
    <h2 class="text-center">Frequently Asked Questions</h2>
    ${faqBlock(allFaq, 'faq-all')}
  </div>
</section>

<section class="section section--forest text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">Still Have Questions?</h2>
    <p style="color:rgba(255,255,255,.9);font-size:18px;margin:0">We're here to help! Contact us on WhatsApp</p>
    <a href="#" data-wa-message="Hello! I have a question about traveling in Kyrgyzstan." target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">Ask Us Anything</a>
  </div>
</section>`;

  layout({
    path: '/practical-info/',
    title: 'Practical Information: Travel Guide to Kyrgyzstan',
    description: 'Everything you need to know: visa, packing, safety, payment, responsible travel. Plan your trip with confidence.',
    image: '/assets/images/general/sheep-pastures.jpg',
    activeHref: '/practical-info/',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* Page: Contact
/* ------------------------------------------------------------------ */
function buildContact() {
  const contacts = [
    { k: 'WhatsApp', v: '+' + SITE.whatsapp, href: waLink('Hello!'), bg: '#5FAD56', iconName: 'whatsapp' },
    { k: 'Email', v: SITE.email, href: 'mailto:' + SITE.email, bg: '#F78154', iconName: 'email' },
    { k: 'Instagram', v: '@' + SITE.instagram, href: 'https://instagram.com/' + SITE.instagram, bg: '#B4436C', iconName: 'instagram' },
    { k: 'Facebook', v: SITE.facebook, href: 'https://' + SITE.facebook, bg: '#385A68', iconName: 'facebook' }
  ];

  const fields = [
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
    { name: 'country', label: 'Country', type: 'text', required: true, placeholder: 'Where are you from?' },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@email.com' },
    { name: 'whatsapp', label: 'WhatsApp Number', type: 'tel', required: true, placeholder: '+1 555 000 0000' },
    { name: 'dates', label: 'Preferred Dates', type: 'date', required: false, placeholder: '' },
    { name: 'travelers', label: 'Number of Travelers', type: 'number', required: false, placeholder: '2' },
    { name: 'interest', label: 'Tour or Region of Interest', type: 'text', required: false, placeholder: 'e.g. Kel-Suu horse trek' }
  ];

  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/mountain-lake-yurts.webp" alt="Team photo placeholder">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>Contact Us</h1>
    <p>Let's plan your adventure together</p>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2>Get in Touch</h2>
    <div>
      ${contacts.map(function (c) {
        return `<a href="${c.href}" target="_blank" rel="noopener" class="contact-link">
  <span class="contact-link__icon" style="background:${c.bg}">${icon(c.iconName, 22)}</span>
  <span class="contact-link__key">${c.k}</span>
  <span class="contact-link__value">${c.v}</span>
</a>`;
      }).join('\n      ')}
    </div>
    <div style="font-size:14px;color:var(--color-text-mute-2)">We reply within 24 hours</div>
  </div>
</section>

<section class="section section--bg">
  <div class="container max-w-800">
    <h2>Send Us a Message</h2>
    <p style="color:var(--color-text-muted)">This form opens a pre-filled WhatsApp chat with your details — we don't have a mail server behind this yet, so WhatsApp is how we'll actually see your message.</p>
    <div class="form-success" data-contact-success hidden></div>
    <form data-contact-form>
      ${fields.map(function (f) {
        return `<div class="form-field">
  <label for="field-${f.name}">${f.label}${f.required ? ' *' : ''}</label>
  <input type="${f.type}" id="field-${f.name}" name="${f.name}" placeholder="${attr(f.placeholder)}"${f.required ? ' required' : ''}>
</div>`;
      }).join('\n      ')}
      <div class="form-field">
        <label for="field-message">Message</label>
        <textarea id="field-message" name="message" placeholder="Tell us about the trip you have in mind"></textarea>
      </div>
      <button type="submit" class="btn btn--whatsapp btn--lg btn--block">Send Message</button>
    </form>
  </div>
</section>`;

  layout({
    path: '/contact/',
    title: 'Contact Us: Plan Your Kyrgyzstan Adventure',
    description: 'Get in touch to plan your custom tour. We reply on WhatsApp within 24 hours.',
    image: '/assets/images/general/mountain-lake-yurts.webp',
    activeHref: '/contact/',
    body: body
  });
}

/* ------------------------------------------------------------------ */
/* sitemap.xml & robots.txt
/* ------------------------------------------------------------------ */
function buildSitemapAndRobots() {
  const urls = ['/', '/tours/', '/destinations/', '/about/', '/practical-info/', '/contact/']
    .concat(TOURS.map(function (t) { return '/tours/' + t.slug + '/'; }))
    .concat(DESTINATIONS.map(function (d) { return '/destinations/' + d.slug + '/'; }));

  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(function (u) { return '  <url>\n    <loc>' + SITE.url + u + '</loc>\n    <lastmod>' + today + '</lastmod>\n  </url>'; }).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
  console.log('wrote sitemap.xml');

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE.url}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots);
  console.log('wrote robots.txt');
}

/* ------------------------------------------------------------------ */
/* Run */
/* ------------------------------------------------------------------ */
buildHome();
buildToursIndex();
TOURS.forEach(buildTourDetail);
buildDestinationsIndex();
DESTINATIONS.forEach(buildDestinationDetail);
buildAbout();
buildPracticalInfo();
buildContact();
buildSitemapAndRobots();
console.log('\nBuild complete:', TOURS.length, 'tours,', DESTINATIONS.length, 'destinations.');
