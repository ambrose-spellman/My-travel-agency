/*
 * Static site generator for the At-Bashy Tours website.
 * Reads data/tours.json and data/destinations.json, renders every page from
 * shared header/footer/card templates, and writes plain static HTML into the
 * project root (tours/, destinations/, about/, practical-info/, contact/, index.html)
 * for the default locale, and under /ru/ and /ky/ for the other locales.
 * Run with: node scripts/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const TOURS = require(path.join(ROOT, 'data/tours.json')).tours;
const DESTINATIONS = require(path.join(ROOT, 'data/destinations.json')).destinations;
const I18N = require('./i18n.js');
const UI = I18N.UI;
const REGION_LABELS = I18N.REGION_LABELS;
const MONTH_LABELS = I18N.MONTH_LABELS;
const FORMAT_LABELS = I18N.FORMAT_LABELS;

/* ------------------------------------------------------------------ */
/* Site configuration — placeholders the client should replace before launch */
/* ------------------------------------------------------------------ */
const LOCALES = ['en', 'ky', 'ru'];
const DEFAULT_LOCALE = 'en';
const LOCALE_NAMES = { en: 'En', ky: 'Kg', ru: 'Ru' };
const SHOW_REGIONS_SECTION = false; /* "Explore Our Regions" temporarily hidden on request */
const SHOW_CALCULATOR = false; /* tour detail price calculator temporarily hidden on request */
const SHOW_DURATION_FILTER = false; /* duration filter pills temporarily hidden on request, needs rework */

/* Blog articles live as Markdown + frontmatter under content/blog/<locale>/<slug>.md
   (edited via the Decap CMS admin UI, or by hand) — loaded here into the same
   shape the rest of the site expects (slug/image/gallery/... + i18n per locale). */
function loadArticles() {
  const enDir = path.join(ROOT, 'content/blog/en');
  const slugs = fs.readdirSync(enDir)
    .filter(function (f) { return f.endsWith('.md'); })
    .map(function (f) { return f.replace(/\.md$/, ''); });

  return slugs.map(function (slug) {
    const i18n = {};
    let shared = {};
    LOCALES.forEach(function (locale) {
      const file = path.join(ROOT, 'content/blog', locale, slug + '.md');
      const parsed = matter(fs.readFileSync(file, 'utf8'));
      i18n[locale] = {
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        seoDescription: parsed.data.seoDescription,
        bodyHtml: marked.parse(parsed.content.trim())
      };
      if (locale === DEFAULT_LOCALE) {
        shared = {
          image: parsed.data.image,
          gallery: parsed.data.gallery || [],
          publishDate: parsed.data.publishDate,
          relatedTourSlugs: parsed.data.relatedTourSlugs || []
        };
      }
    });
    return Object.assign({ id: slug, slug: slug }, shared, { i18n: i18n });
  });
}
const ARTICLES = loadArticles();

const SITE = {
  name: 'At-Bashy Tours',
  url: 'https://atbashy.tours',
  whatsapp: '996557475741',
  email: 'kaparbekovasaikal@gmail.com',
  instagram: 'atbashytours',
  facebook: 'facebook.com/atbashytours',
  gtmId: 'GTM-MDL89XJD',
  perDayBase: 100,
  markup: 0.30,
  minBillable: 4
};

const NAV_ITEMS = [
  { key: 'tours', href: '/tours/' },
  { key: 'destinations', href: '/destinations/' },
  { key: 'about', href: '/about/' },
  { key: 'practicalInfo', href: '/practical-info/' },
  { key: 'blog', href: '/blog/' },
  { key: 'contact', href: '/contact/' }
];

const ICONS = {
  whatsapp: 'M12 2a10 10 0 0 0-8.66 15l-1.3 4.8 4.92-1.28A10 10 0 1 0 12 2z',
  telegram: 'M21 4 3 11l6 2 2 6 3-4 5 4zM9 13l12-9',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.5 6.5h.01',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8z',
  mountain: 'M3 20h18L14.5 7 10 14l-2.5-3L3 20z',
  heart: 'M12 21s-7.5-4.6-10-9.3C.5 7.8 3 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 4 0 6.5 3.8 5 7.7C19.5 16.4 12 21 12 21z'
};

const IMAGE_POOL = [
  '/assets/images/general/mountain-lake-yurts.webp',
  '/assets/images/general/camel-pastures.webp',
  '/assets/images/general/sheep-pastures.jpg',
  '/assets/images/destinations/kel-suu-valley.jpg',
  '/assets/images/destinations/song-kul-horseman.webp',
  '/assets/images/destinations/jomoksai.jpg',
  '/assets/images/destinations/jomoksai3.jpg'
];
function poolImage(seed) { return IMAGE_POOL[((seed % IMAGE_POOL.length) + IMAGE_POOL.length) % IMAGE_POOL.length]; }

const DEST_REGION_MAP = {
  'chuy': ['Chuy'],
  'issyk-kul': ['Issyk-Kul'],
  'naryn': ['Naryn', 'At-Bashy', 'Kel-Suu', 'Song-Kul'],
  'talas': [],
  'jalal-abad': ['Jalal-Abad'],
  'osh': ['Osh'],
  'batken': []
};

/* ------------------------------------------------------------------ */
/* i18n helpers */
/* ------------------------------------------------------------------ */
function tr(item, locale) { return item.i18n[locale] || item.i18n[DEFAULT_LOCALE]; }
function t(locale, path_) {
  const parts = path_.split('.');
  let node = UI[locale];
  for (let i = 0; i < parts.length; i++) { node = node ? node[parts[i]] : undefined; }
  if (node === undefined) {
    node = UI[DEFAULT_LOCALE];
    for (let i = 0; i < parts.length; i++) { node = node ? node[parts[i]] : undefined; }
  }
  return node;
}
function regionLabel(locale, key) { return (REGION_LABELS[locale] && REGION_LABELS[locale][key]) || key; }
function formatLabel(locale, key) { return (FORMAT_LABELS[locale] && FORMAT_LABELS[locale][key]) || key; }
function monthLabel(locale, monthName) { return (MONTH_LABELS[locale] && MONTH_LABELS[locale][monthName]) || monthName; }
function seasonLabel(locale, season) { return monthLabel(locale, season[0]) + '–' + monthLabel(locale, season[season.length - 1]); }

function pluralRu(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
function daysLabel(locale, n) {
  if (locale === 'ru') return n + ' ' + pluralRu(n, 'день', 'дня', 'дней');
  if (locale === 'ky') return n + ' күн';
  return n + ' day' + (n === 1 ? '' : 's');
}
function durationLabel(locale, min, max) {
  if (min === max) return daysLabel(locale, min);
  if (locale === 'ru') return min + '–' + max + ' ' + pluralRu(max, 'день', 'дня', 'дней');
  if (locale === 'ky') return min + '–' + max + ' күн';
  return min + '–' + max + ' days';
}
function groupLabel(locale, min, max) {
  const unit = t(locale, 'tourDetail.peopleUnit');
  return min + '–' + max + ' ' + unit;
}

/* Locale-prefixed URL path: en stays at root, others live under /locales/<locale>/ */
function localePath(locale, urlPath) {
  if (locale === DEFAULT_LOCALE) return urlPath;
  if (urlPath === '/') return '/locales/' + locale + '/';
  return '/locales/' + locale + urlPath;
}
/* Old pre-move URL (/<locale>/...), kept only to emit redirect stubs. */
function oldLocalePath(locale, urlPath) {
  if (locale === DEFAULT_LOCALE) return urlPath;
  if (urlPath === '/') return '/' + locale + '/';
  return '/' + locale + urlPath;
}

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
function iconColor(name, color, size) {
  size = size || 22;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICONS[name] + '"></path></svg>';
}

/* ------------------------------------------------------------------ */
/* Shared chrome: <head>, header, mobile menu, footer, floating WhatsApp */
/* ------------------------------------------------------------------ */
function renderHead(opts, locale) {
  const url = SITE.url + localePath(locale, opts.path);
  const ogImage = SITE.url + (opts.image || '/assets/images/general/mountain-lake-yurts.webp');
  const ld = opts.structuredData ? '\n<script type="application/ld+json">' + JSON.stringify(opts.structuredData) + '</script>' : '';
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: SITE.name,
    url: SITE.url,
    logo: SITE.url + '/assets/images/logo.svg',
    image: SITE.url + '/assets/images/general/IND04269.JPG',
    telephone: '+' + SITE.whatsapp,
    email: SITE.email,
    address: { '@type': 'PostalAddress', addressLocality: 'At-Bashy', addressRegion: 'Naryn Region', addressCountry: 'KG' },
    sameAs: ['https://instagram.com/' + SITE.instagram, 'https://' + SITE.facebook]
  };
  const orgLd = '\n<script type="application/ld+json">' + JSON.stringify(orgSchema) + '</script>';
  const alternates = LOCALES.map(function (l) {
    return '<link rel="alternate" hreflang="' + (l === 'ky' ? 'ky' : l) + '" href="' + SITE.url + localePath(l, opts.path) + '">';
  }).join('\n') + '\n<link rel="alternate" hreflang="x-default" href="' + SITE.url + localePath(DEFAULT_LOCALE, opts.path) + '">';
  const gtmScript = SITE.gtmId ? "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" + SITE.gtmId + "');</script>" : '';
  return [
    '<meta charset="UTF-8">',
    gtmScript,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="robots" content="index, follow">',
    '<title>' + opts.title + ' | ' + SITE.name + '</title>',
    '<meta name="description" content="' + attr(opts.description) + '">',
    '<link rel="canonical" href="' + url + '">',
    alternates,
    '<meta property="og:title" content="' + attr(opts.title) + '">',
    '<meta property="og:description" content="' + attr(opts.description) + '">',
    '<meta property="og:image" content="' + ogImage + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="' + (locale === 'en' ? 'en_US' : locale === 'ru' ? 'ru_RU' : 'ky_KG') + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + attr(opts.title) + '">',
    '<meta name="twitter:description" content="' + attr(opts.description) + '">',
    '<meta name="twitter:image" content="' + ogImage + '">',
    '<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96">',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<link rel="shortcut icon" href="/favicon.ico">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Golos+Text:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="/assets/css/main.css">',
    '<link rel="stylesheet" href="/assets/css/components.css">',
    '<link rel="stylesheet" href="/assets/css/utilities.css">',
    orgLd,
    ld
  ].join('\n');
}

function langSwitcherHtml(currentPath, locale) {
  const items = LOCALES.map(function (l) {
    const href = localePath(l, currentPath);
    return '<a href="' + href + '"' + (l === locale ? ' class="is-active" aria-current="true"' : '') + '>' + LOCALE_NAMES[l] + '</a>';
  }).join('');
  return '<div class="lang-switcher" role="group" aria-label="Language">' + items + '</div>';
}

function renderHeader(activeHref, locale, currentPath) {
  const navLinks = NAV_ITEMS.map(function (n) {
    return '<a href="' + localePath(locale, n.href) + '"' + (activeHref === n.href ? ' aria-current="page"' : '') + '>' + t(locale, 'nav.' + n.key) + '</a>';
  }).join('\n        ');
  const waMsg = t(locale, 'common.waDefaultMessage');
  const lang = langSwitcherHtml(currentPath, locale);
  return `
<a class="skip-link" href="#main-content">${t(locale, 'common.skipLink')}</a>
<header class="site-header">
  <div class="site-header__bar">
    <a href="${localePath(locale, '/')}" class="site-header__logo"><img src="/assets/images/logo.svg" alt="${SITE.name}"></a>
    <nav class="site-nav" aria-label="Main navigation">
        ${navLinks}
    </nav>
    <div class="site-header__actions">
      ${lang}
      <a href="#" data-wa-message="${attr(waMsg)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--sm">${icon('whatsapp', 18)}<span>${t(locale, 'common.whatsapp')}</span></a>
      <button type="button" class="menu-toggle" data-menu-toggle aria-label="${t(locale, 'common.openMenu')}" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu" data-mobile-menu>
  <div class="mobile-menu__top">
    <span class="mobile-menu__brand">${SITE.name}</span>
    <button type="button" class="mobile-menu__close" data-menu-close aria-label="${t(locale, 'common.closeMenu')}">&times;</button>
  </div>
  <nav aria-label="Mobile navigation">
    ${NAV_ITEMS.map(function (n) { return '<a href="' + localePath(locale, n.href) + '"' + (activeHref === n.href ? ' aria-current="page"' : '') + '>' + t(locale, 'nav.' + n.key) + '</a>'; }).join('\n    ')}
  </nav>
  <a href="#" data-wa-message="${attr(waMsg)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg btn--block">${t(locale, 'common.chatOnWhatsapp')}</a>
  ${langSwitcherHtml(currentPath, locale)}
  <div class="mobile-menu__social">
    <a href="https://instagram.com/${SITE.instagram}" target="_blank" rel="noopener">Instagram</a>
    <a href="https://${SITE.facebook}" target="_blank" rel="noopener">Facebook</a>
  </div>
</div>`;
}

function renderFooter(locale) {
  const waMsg = t(locale, 'common.waDefaultMessage');
  return `
<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__col">
      <img src="/assets/images/logo.svg" alt="${SITE.name}" class="site-footer__logo">
      <span class="site-footer__tagline">${t(locale, 'common.tagline')}</span>
    </div>
    <div class="site-footer__col">
      <span class="site-footer__heading">${t(locale, 'common.explore')}</span>
      ${NAV_ITEMS.map(function (n) { return '<a href="' + localePath(locale, n.href) + '">' + t(locale, 'nav.' + n.key) + '</a>'; }).join('\n      ')}
    </div>
    <div class="site-footer__col">
      <span class="site-footer__heading">${t(locale, 'nav.contact')}</span>
      <a href="#" data-wa-message="${attr(waMsg)}" target="_blank" rel="noopener">WhatsApp +${SITE.whatsapp}</a>
      <a href="mailto:${SITE.email}">${SITE.email}</a>
      <span style="color:rgba(244,240,232,.75)">${t(locale, 'common.bishkekLocation')}</span>
    </div>
    <div class="site-footer__col">
      <span class="site-footer__heading">${t(locale, 'common.follow')}</span>
      <a href="https://instagram.com/${SITE.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a href="https://${SITE.facebook}" target="_blank" rel="noopener">Facebook</a>
      <a href="#" data-wa-message="${attr(waMsg)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--sm" style="margin-top:8px;align-self:flex-start">${t(locale, 'common.whatsapp')}</a>
    </div>
  </div>
  <div class="container site-footer__bottom">
    <span>&copy; ${new Date().getFullYear()} ${SITE.name}</span>
    <span class="site-footer__legal"><a href="#">${t(locale, 'common.terms')}</a><a href="#">${t(locale, 'common.privacy')}</a></span>
  </div>
</footer>
<a href="#" data-wa-message="${attr(waMsg)}" target="_blank" rel="noopener" class="whatsapp-floating-btn" aria-label="${t(locale, 'common.chatOnWhatsapp')}">
  <svg viewBox="0 0 24 24" fill="#fff"><path d="${ICONS.whatsapp}"></path></svg>
</a>
<script>window.SITE_LOCALE = "${locale}"; window.SITE_WHATSAPP = "${SITE.whatsapp}";</script>
<script src="/assets/js/i18n-strings.js"></script>
<script src="/assets/js/whatsapp.js"></script>
<script src="/assets/js/calculator.js"></script>
<script src="/assets/js/main.js"></script>`;
}

function layout(opts, locale) {
  const currentPath = opts.path;
  const gtmNoscript = SITE.gtmId ? '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + SITE.gtmId + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>' : '';
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
${renderHead(opts, locale)}
</head>
<body>
${gtmNoscript}
${renderHeader(opts.activeHref || '', locale, currentPath)}
<main id="main-content">
${opts.body}
</main>
${renderFooter(locale)}
</body>
</html>
`;
  writeFile(localePath(locale, opts.path), html);
}

/* ------------------------------------------------------------------ */
/* Reusable components */
/* ------------------------------------------------------------------ */
function tourCardHtml(tour, locale) {
  const tt = tr(tour, locale);
  const dur = durationLabel(locale, tour.durationMin, tour.durationMax);
  const activityLabel = t(locale, 'toursIndex.activities.' + tour.activity) || tour.activity;
  return `
<article class="tour-card" data-activity="${tour.activity}" data-regions="${tour.region.join('|')}" data-duration-min="${tour.durationMin}" data-duration-max="${tour.durationMax}">
  <div class="tour-card__media"><img src="${tour.image}" alt="${attr(tt.title)}" loading="lazy"></div>
  <div class="tour-card__body">
    <div class="tour-card__tags">
      <span class="tour-card__tag tour-card__tag--region">${regionLabel(locale, tour.region[0])}</span>
      <span class="tour-card__tag tour-card__tag--activity">${activityLabel}</span>
    </div>
    <h3 class="tour-card__title"><a href="${localePath(locale, '/tours/' + tour.slug + '/')}" style="color:inherit">${tt.title}</a></h3>
    <div class="tour-card__meta">${dur} &middot; ${tt.difficulty}</div>
    <div class="tour-card__actions">
      <a href="${localePath(locale, '/tours/' + tour.slug + '/')}" class="btn btn--primary btn--block">${t(locale, 'common.viewTour')}</a>
    </div>
  </div>
</article>`;
}

function destTileHtml(dest, locale, aspect) {
  const dt = tr(dest, locale);
  return `
<a href="${localePath(locale, '/destinations/' + dest.slug + '/')}" class="dest-tile" style="${aspect ? 'aspect-ratio:' + aspect : ''}">
  <img src="${dest.tileImage}" alt="${attr(dt.name)}" loading="lazy">
  <span class="dest-tile__scrim"></span>
  <span class="dest-tile__text">
    <span class="name">${dt.name}</span>
    <span class="short">${dt.short}</span>
    <span class="explore btn btn--primary btn--sm">${UI[locale].home.heroCta}</span>
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

function testimonialsHtml(locale) {
  const items = UI[locale].home.testimonials.slice(0, 1); /* show first review only for now */
  if (!items.length) {
    return `
<div class="testimonial-card" style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">
  <p style="font-style:normal;color:var(--color-text-muted)">${t(locale, 'home.testimonialPlaceholder')}</p>
</div>`;
  }
  return items.map(function (r) {
    const avatar = r.avatar
      ? '<img class="testimonial-card__avatar" src="' + r.avatar + '" alt="' + attr(r.name) + '">'
      : '<span class="testimonial-card__avatar testimonial-card__avatar--initial">' + attr(r.name.slice(0, 1)) + '</span>';
    return `
<div class="testimonial-card">
  <div class="testimonial-card__person">
    ${avatar}
    <span class="testimonial-card__name">${r.name}</span>
  </div>
  <p>${r.quote}</p>
</div>`;
  }).join('\n');
}

/* ------------------------------------------------------------------ */
/* Page: Home
/* ------------------------------------------------------------------ */
function buildHome(locale) {
  const h = UI[locale].home;
  const featured = TOURS.slice(0, 3);
  const gallery = IMAGE_POOL.slice(0, 6);
  const masonryImages = IMAGE_POOL;

  const galleryCols = [
    masonryImages.filter(function (_, i) { return i % 3 === 0; }),
    masonryImages.filter(function (_, i) { return i % 3 === 1; }),
    masonryImages.filter(function (_, i) { return i % 3 === 2; })
  ];
  const founderFlowing = h.founderBio.slice(0, h.founderBio.length - 2);
  const founderCard1Body = h.founderBio[h.founderBio.length - 2];
  const founderCard2Body = h.founderBio[h.founderBio.length - 1];

  const body = `
<section class="hero hero--intro">
  <div class="hero-intro">
    <div class="hero-intro__content">
      <p class="eyebrow">${h.heroEyebrow}</p>
      <h1>${h.heroTitle}</h1>
      <p class="hero-intro__lead">${h.heroSubtitle}</p>
      <div class="hero__actions">
        <a href="${localePath(locale, '/tours/')}" class="btn btn--primary btn--lg">${h.heroCta} →</a>
        <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--outline btn--lg">${iconColor('whatsapp', 'currentColor', 18)}<span>${t(locale, 'common.chatOnWhatsapp')}</span></a>
      </div>
      <div class="hero-intro__pills">
        ${h.heroPills.map(function (p) { return '<span class="hero-intro__pill">' + p + '</span>'; }).join('\n        ')}
      </div>
    </div>
    <div class="hero-intro__gallery">
      ${galleryCols.map(function (col, idx) {
        const doubled = col.concat(col);
        return '<div class="hero-intro__col' + (idx % 2 === 1 ? ' hero-intro__col--reverse' : '') + '">' +
          doubled.map(function (src) { return '<img src="' + src + '" alt="Kyrgyzstan mountain landscape" loading="lazy">'; }).join('') +
          '</div>';
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section guide-section">
  <div class="container guide-grid">
    <div class="guide-grid__media">
      <img class="guide-grid__photo" src="/assets/images/general/saikal.JPG" alt="${h.founderGreeting}">
      <img class="guide-grid__photo-inset" src="/assets/images/general/saikal2.jpg" alt="${h.founderGreeting}">
      <div class="guide-grid__badge"><strong>${h.guideSeasonsBadge}</strong><span>${h.guideSeasonsLabel}</span></div>
    </div>
    <div class="guide-grid__text">
      <h2>${h.founderGreeting}</h2>
      <p class="guide-grid__role">${h.founderRole}</p>
      ${founderFlowing.map(function (p) { return '<p>' + p + '</p>'; }).join('\n      ')}
      <div class="guide-grid__cards">
        <div class="guide-card">
          <span class="guide-card__icon">${iconColor('mountain', 'var(--color-accent-2)', 24)}</span>
          <h3>${h.guideCardTitles[0]}</h3>
          <p>${founderCard1Body}</p>
        </div>
        <div class="guide-card guide-card--dark">
          <span class="guide-card__icon">${iconColor('heart', 'var(--color-accent-2)', 24)}</span>
          <h3>${h.guideCardTitles[1]}</h3>
          <p>${founderCard2Body}</p>
        </div>
      </div>
      <div class="guide-grid__cta">
        <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--primary btn--lg">${h.guideCta} →</a>
        <span class="guide-grid__languages">${h.guideLanguages}</span>
      </div>
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container section-intro">
    <h2 class="text-center">${h.chooseAdventureHeading}</h2>
    <div class="grid-4">
      ${h.categories.map(function (c, i) {
        const activityKey = ['Horse', '4x4', 'Hiking', 'Custom'][i];
        return `<div class="value-card"><div class="t">${c.t}</div><div class="d">${c.d}</div><a href="${localePath(locale, '/tours/#' + activityKey)}" class="btn btn--outline" style="margin-top:auto">${h.heroCta}</a></div>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container stack">
    <h2 class="text-center">${h.popularToursHeading}</h2>
    <div class="grid-3">${featured.map(function (tour) { return tourCardHtml(tour, locale); }).join('\n')}</div>
    <div class="text-center"><a href="${localePath(locale, '/tours/')}" class="btn btn--outline">${t(locale, 'common.viewAllTours')}</a></div>
  </div>
</section>

${SHOW_REGIONS_SECTION ? `
<section class="section section--mint">
  <div class="container stack">
    <h2 class="text-center">${h.exploreRegionsHeading}</h2>
    <div class="region-columns">
      ${h.oblasts.map(function (name) { return '<button type="button" class="region-col">' + name + '</button>'; }).join('\n      ')}
    </div>
    <div class="text-center"><a href="${localePath(locale, '/destinations/')}" class="btn btn--pill-outline">${t(locale, 'common.viewAllDestinations')}</a></div>
  </div>
</section>` : ''}

<section class="section section--photo">
  <img class="section__bg" src="/assets/images/general/mountain-lake-yurts.webp" alt="Snow-capped mountains above a valley in Kyrgyzstan">
  <div class="section__scrim"></div>
  <div class="container stack">
    <h2 class="text-center">${h.whyTravelHeading}</h2>
    <div class="value-grid">
      ${h.whyUs.map(function (v, i) {
        return `<div class="value-item"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${v[0]}</h3><p>${v[1]}</p></div>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">${h.whatTravelersSayHeading}</h2>
    <div class="testimonial-grid">${testimonialsHtml(locale)}</div>
  </div>
</section>

<section class="section section--black">
  <div class="container stack">
    <h2 class="text-center">${h.lifeOnTrailHeading}</h2>
    <div class="gallery-grid">
      ${gallery.map(function (src) { return '<div class="gallery-grid__item"><img src="' + src + '" alt="' + attr(h.galleryAlt) + '" loading="lazy"></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2 class="text-center">${h.commonQuestionsHeading}</h2>
    ${faqBlock(h.faqHome, 'fh')}
    <div class="text-center"><a href="${localePath(locale, '/practical-info/#info-getting')}" class="btn--link">${h.viewAllFaqs}</a></div>
  </div>
</section>

<section class="section" style="position:relative;background:#E0663A;overflow:hidden;padding:clamp(80px,9vw,120px) var(--page-pad)">
  <img class="hero__media" src="/assets/images/general/camel-pastures.webp" alt="Camel grazing in front of snow-capped peaks at sunset" style="opacity:.55">
  <div style="position:absolute;inset:0;background:rgba(138,58,28,.62)"></div>
  <div class="container text-center" style="position:relative;max-width:720px;display:flex;flex-direction:column;align-items:center;gap:20px">
    <h2 style="color:#fff">${h.ctaHeading}</h2>
    <p style="color:rgba(255,255,255,.92);font-size:20px;margin:0">${h.ctaSubheading}</p>
    <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${h.ctaButton}</a>
  </div>
</section>`;

  layout({
    path: '/',
    title: h.pageTitle,
    description: h.pageDescription,
    image: '/assets/images/general/mountain-lake-yurts.webp',
    activeHref: '',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Tours catalog
/* ------------------------------------------------------------------ */
function buildToursIndex(locale) {
  const ti = UI[locale].toursIndex;
  const ACTIVITIES = ['All', 'Horse', '4x4', 'Hiking', 'Custom'];
  const REGIONS = ['All', 'At-Bashy', 'Naryn', 'Kel-Suu', 'Song-Kul', 'Issyk-Kul', 'Chuy', 'Jalal-Abad', 'Osh'];
  const DURATIONS = ['All', '1-3', '4-6', '7-10', '11+'];

  const tabs = ACTIVITIES.map(function (k) {
    const count = k === 'All' ? TOURS.length : TOURS.filter(function (t_) { return t_.activity === k; }).length;
    const countLabel = k === 'Custom' ? ti.customWord : count + ' ' + (count === 1 ? ti.routeWord : ti.routesWord);
    return `<button type="button" class="cat-tabs__tab" data-filter-tab="${k}">${ti.activities[k]}<span class="count">${countLabel}</span></button>`;
  }).join('\n      ');

  const durationPills = DURATIONS.map(function (d) { return `<button type="button" class="pill" data-filter-group="duration" data-filter-pill="${d}">${ti.durations[d]}</button>`; }).join('\n        ');
  const regionPills = REGIONS.map(function (r) { return `<button type="button" class="pill" data-filter-group="region" data-filter-pill="${r}">${regionLabel(locale, r)}</button>`; }).join('\n        ');

  const grandTour = TOURS.find(function (t_) { return t_.activity === 'Custom'; });
  const allCount = TOURS.length;

  const builderRegions = ['At-Bashy', 'Naryn', 'Kel-Suu', 'Song-Kul', 'Tash-Rabat', 'Chatyr-Kol', 'Issyk-Kul', 'Sary-Chelek', 'Arslanbob', 'Osh'];

  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/destinations/kel-suu-valley.jpg" alt="Mountains and river valley near Kel-Suu, Kyrgyzstan">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>${ti.heroTitle}</h1>
    <p>${ti.heroSubtitle}</p>
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
    ${SHOW_DURATION_FILTER ? '<div class="filter-row"><span class="filter-row__label">' + ti.durationLabel + '</span>' + durationPills + '</div>' : ''}
    <div class="filter-row"><span class="filter-row__label">${ti.regionLabel}</span>${regionPills}</div>
    <div class="results-label" data-results-label>${ti.resultsLabel(allCount)}</div>
  </div>
</section>

<section class="section--tight section--bg">
  <div class="container">
    <div class="grid-3" data-tour-grid data-default-activity="All">
      ${TOURS.map(function (tour) { return tourCardHtml(tour, locale); }).join('\n')}
    </div>
    <p class="text-center" data-no-results hidden style="color:var(--color-text-muted)">${ti.noResults}</p>
  </div>
</section>

<section class="section--tight section--bg" data-builder-panel hidden>
  <div class="container grid-2" data-builder data-per-day-base="${SITE.perDayBase}" data-markup="${SITE.markup}" data-min-billable="${SITE.minBillable}">
    <div style="background:#fff;border-radius:8px;padding:32px;display:flex;flex-direction:column;gap:28px">
      <h2 style="margin:0">${ti.builder.heading}</h2>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">${ti.builder.whereHeading}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${builderRegions.map(function (r) { return '<button type="button" class="pill" data-b-chip="' + r + '" data-b-group="region">' + regionLabel(locale, r) + '</button>'; }).join('\n          ')}
        </div>
      </div>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">${ti.builder.whatHeading}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${ti.builder.activityChips.map(function (a) { return '<button type="button" class="pill" data-b-chip="' + attr(a) + '" data-b-group="activity">' + a + '</button>'; }).join('\n          ')}
        </div>
      </div>
      <div class="stack--sm" style="padding-top:20px;border-top:1px solid var(--color-border)">
        <a href="#" data-b-wa target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg btn--block">${ti.builder.sendPlanBtn}</a>
        <div style="font-size:13px;color:var(--color-text-mute-2)">${ti.builder.replyNote}</div>
      </div>
    </div>
    <div class="stack--sm">
      <div style="font-size:14px;font-weight:600;color:var(--color-text-muted)">${ti.builder.exampleLabel}</div>
      ${grandTour ? tourCardHtml(grandTour, locale) : ''}
    </div>
  </div>
</section>

<section class="section section--peach text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h3 style="margin:0">${ti.cantFindHeading}</h3>
    <p style="margin:0;font-size:18px;color:var(--color-text-muted)">${ti.cantFindText}</p>
    <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${ti.customTourBtn}</a>
  </div>
</section>`;

  layout({
    path: '/tours/',
    title: ti.pageTitle,
    description: ti.pageDescription,
    image: '/assets/images/destinations/kel-suu-valley.jpg',
    activeHref: '/tours/',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Tour detail (x7)
/* ------------------------------------------------------------------ */
function buildTourDetail(tour, index, locale) {
  const tt = tr(tour, locale);
  const td = UI[locale].tourDetail;
  const dur = durationLabel(locale, tour.durationMin, tour.durationMax);
  const grp = groupLabel(locale, tour.groupSize.min, tour.groupSize.max);
  const facts = [
    { k: td.factsDuration, v: dur },
    { k: td.factsLevel, v: tt.difficulty },
    { k: td.factsSeason, v: seasonLabel(locale, tour.season) },
    { k: td.factsGroup, v: grp }
  ];
  const infoTable = [
    { k: td.infoDuration, v: dur },
    { k: td.infoDifficulty, v: tt.difficulty },
    { k: td.infoBestSeason, v: seasonLabel(locale, tour.season) },
    { k: td.infoStartingPoint, v: tt.startingPoint },
    { k: td.infoGroupSize, v: grp },
    { k: td.infoFormat, v: tour.format.map(function (f) { return formatLabel(locale, f); }).join(' / ') }
  ];

  const itineraryHtml = tt.itinerary.length
    ? `<div>${tt.itinerary.map(function (d, i) {
        return `
<div class="itinerary-item">
  <span class="itinerary-item__num">${d.day}</span>
  <div>
    ${accordionItem('itin-' + tour.slug, i, td.dayLabel + ' ' + d.day + ': ' + d.title, '<p style="margin:0">' + d.description + '</p>', i === 0).replace('<div class="accordion-item', '<div style="border-bottom:0" class="accordion-item')}
  </div>
</div>`;
      }).join('\n')}</div>`
    : `<p style="text-align:center;color:var(--color-text-muted)">${td.itineraryFallback}</p>`;

  const faqItems = tt.faq.length ? tt.faq.map(function (f) { return { q: f.question, a: f.answer }; }) : UI[locale].home.faqHome.slice(0, 3);

  const similar = TOURS.filter(function (t_) { return t_.id !== tour.id && (t_.activity === tour.activity || t_.region.some(function (r) { return tour.region.indexOf(r) !== -1; })); }).slice(0, 3);
  const similarFallback = similar.length ? similar : TOURS.filter(function (t_) { return t_.id !== tour.id; }).slice(0, 3);

  const isHorse = tour.activity === 'Horse' || tour.activity === 'Custom';

  const safetyRows = isHorse
    ? [{ k: td.safetyWeightLimit, v: td.safetyWeightVal }, { k: td.safetyHelmet, v: td.safetyHelmetVal }, { k: td.safetyGuide, v: td.safetyGuideVal }, { k: td.safetyInsurance, v: td.safetyInsuranceVal }]
    : [{ k: td.safetyGuide, v: td.safetyGuideVal }, { k: td.safetyVehicle, v: td.safetyVehicleVal }, { k: td.safetyInsurance, v: td.safetyInsuranceVal }];

  const body = `
<section class="hero-detail">
  <img class="hero-detail__media" src="${tour.image}" alt="${attr(tt.title)}">
  <div class="hero-detail__scrim"></div>
  <div class="hero-detail__content">
    <div class="container">
      <span class="hero-detail__badge">${regionLabel(locale, tour.region[0])}</span>
      <h1>${tt.title}</h1>
      <div class="hero-detail__facts">
        ${facts.map(function (f) { return '<span><span class="k">' + f.k + '</span> ' + f.v + '</span>'; }).join('\n        ')}
      </div>
    </div>
  </div>
</section>

${SHOW_CALCULATOR ? `
<section class="section--tight section--white">
  <div class="container grid-2">
    <div class="stack" data-calculator
         data-duration-min="${tour.durationMin}" data-duration-max="${tour.durationMax}"
         data-days-default="${tour.durationMin}" data-pax-default="${tour.groupSize.min}"
         data-per-day-base="${tour.pricing.perDayBase}" data-markup="${tour.pricing.organizerMarkup}"
         data-min-billable="${tour.pricing.minBillableParticipants}" data-tour-title="${attr(tt.title)}">
      <h2>${td.calcHeading}</h2>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">${td.numDaysLabel}</div>
        <div class="stepper">
          <button type="button" class="stepper__btn" data-days-dec>&minus;</button>
          <span class="stepper__value" data-days-value>${tour.durationMin}</span>
          <button type="button" class="stepper__btn" data-days-inc>+</button>
          <span class="stepper__hint">${durationLabel(locale, tour.durationMin, tour.durationMax)}</span>
        </div>
      </div>
      <div class="stack--sm">
        <div style="font-size:14px;font-weight:600">${td.numTravelersLabel}</div>
        <div class="stepper">
          <button type="button" class="stepper__btn" data-pax-dec>&minus;</button>
          <span class="stepper__value" data-pax-value>${tour.groupSize.min}</span>
          <button type="button" class="stepper__btn" data-pax-inc>+</button>
          <span class="stepper__hint">${grp}</span>
        </div>
      </div>
      <p data-min-note style="margin:0;font-size:14px;color:var(--color-text-mute-2)">${td.minRateApplies}</p>

      <div class="price-box">
        <div class="price-box__label">${td.totalForGroup}</div>
        <div class="price-box__total" data-total>$0</div>
        <div class="price-box__label" style="margin-top:12px">${td.perPerson}</div>
        <div class="price-box__per-person" data-per-person>$0</div>
        <div class="price-box__note">${td.priceNote}</div>
      </div>
      <a href="#" data-wa-book target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg btn--block">${td.bookBtn}</a>
    </div>
  </div>
</section>` : ''}

<section class="section section--bg">
  <div class="container grid-2">
    <div class="stack">
      <h2>${td.overviewHeading}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${tt.description}</p>
      <h3>${td.highlightsHeading}</h3>
      <div class="checklist checklist--yes">
        ${tt.highlights.map(function (h) { return '<div class="checklist__item"><span class="mark">&#10003;</span>' + h + '</div>'; }).join('\n        ')}
      </div>
    </div>
    <div class="info-table">
      ${infoTable.map(function (i) { return '<div class="info-table__row"><span class="k">' + i.k + '</span><span class="v">' + i.v + '</span></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2 class="text-center">${td.itineraryHeading}</h2>
    ${tour.routeMap ? '<img src="' + tour.routeMap + '" alt="' + attr(tt.title) + ' route map" style="width:100%;border-radius:var(--radius);margin:0 0 8px">' : ''}
    ${itineraryHtml}
  </div>
</section>

<section class="section section--bg">
  <div class="container grid-2">
    <div class="stack--sm">
      <h3 style="font-family:var(--font-heading);font-weight:400;font-size:26px">${td.includedHeading}</h3>
      <div class="checklist checklist--yes">${tt.included.map(function (x) { return '<div class="checklist__item"><span class="mark">&#10003;</span>' + x + '</div>'; }).join('\n')}</div>
    </div>
    <div class="stack--sm">
      <h3 style="font-family:var(--font-heading);font-weight:400;font-size:26px">${td.notIncludedHeading}</h3>
      <div class="checklist checklist--no">${tt.notIncluded.map(function (x) { return '<div class="checklist__item"><span class="mark">&#10007;</span>' + x + '</div>'; }).join('\n')}</div>
    </div>
  </div>
</section>

${tour.photos && tour.photos.length ? `
<section class="section section--white">
  <div class="container stack">
    <h2 class="text-center">${td.photosHeading}</h2>
    <div class="gallery-grid">
      ${tour.photos.map(function (src) { return '<div class="gallery-grid__item"><img src="' + src + '" alt="' + attr(tt.title) + '" loading="lazy"></div>'; }).join('\n      ')}
    </div>
  </div>
</section>` : ''}

<section class="section section--cream">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>${isHorse ? td.horseSafetyHeading : td.roadSafetyHeading}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${isHorse ? td.horseSafetyText : td.roadSafetyText}</p>
    </div>
    <div class="info-table">
      ${safetyRows.map(function (i) { return '<div class="info-table__row"><span class="k">' + i.k + '</span><span class="v">' + i.v + '</span></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2 class="text-center">${td.faqHeading}</h2>
    ${faqBlock(faqItems, 'faq-' + tour.slug)}
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">${td.similarToursHeading}</h2>
    <div class="grid-3">${similarFallback.map(function (st) { return tourCardHtml(st, locale); }).join('\n')}</div>
  </div>
</section>

<section class="section section--forest text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">${td.readyToBookHeading}</h2>
    <p style="color:rgba(255,255,255,.9);font-size:18px;margin:0">${td.readyToBookText}</p>
    <a href="#" data-wa-message="${attr(tt.whatsappMessage)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${td.checkAvailabilityBtn}</a>
  </div>
</section>`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tt.title,
    description: tt.description,
    provider: {
      '@type': 'LocalBusiness',
      name: SITE.name,
      image: SITE.url + '/assets/images/logo.svg',
      telephone: '+' + SITE.whatsapp,
      url: SITE.url,
      address: { '@type': 'PostalAddress', addressCountry: 'KG' }
    },
    itinerary: tt.itinerary.length ? {
      '@type': 'ItemList',
      itemListElement: tt.itinerary.map(function (d) { return { '@type': 'ListItem', position: d.day, name: td.dayLabel + ' ' + d.day + ': ' + d.title, description: d.description }; })
    } : undefined,
    offers: { '@type': 'Offer', price: String(tour.priceFrom), priceCurrency: tour.currency, availability: 'https://schema.org/InStock' },
    duration: 'P' + tour.durationMin + 'D/P' + tour.durationMax + 'D',
    touristType: ['Adventure travelers', 'Horse riding enthusiasts', 'Nature lovers'],
    travelMode: tour.activity,
    startsAt: { '@type': 'Place', name: tt.startingPoint, address: { '@type': 'PostalAddress', addressCountry: 'KG' } },
    endsAt: { '@type': 'Place', name: tt.endingPoint, address: { '@type': 'PostalAddress', addressCountry: 'KG' } }
  };

  layout({
    path: '/tours/' + tour.slug + '/',
    title: tt.title,
    description: td.pageDescription(tt.description, durationLabel(locale, tour.durationMin, tour.durationMax), tour.priceFrom),
    image: tour.image,
    activeHref: '/tours/',
    structuredData: structuredData,
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Destinations catalog
/* ------------------------------------------------------------------ */
function buildDestinationsIndex(locale) {
  const di = UI[locale].destinationsIndex;
  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/mountain-lake-yurts.webp" alt="Mountain landscape in Kyrgyzstan">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>${di.heroTitle}</h1>
    <p>${di.heroSubtitle}</p>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-3--dest">
    ${DESTINATIONS.map(function (d) { return destTileHtml(d, locale); }).join('\n')}
  </div>
</section>

<section class="section section--mint">
  <div class="container">
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">
      ${DESTINATIONS.map(function (d) { const dt = tr(d, locale); return `<a href="${localePath(locale, '/destinations/' + d.slug + '/')}" class="dest-chip"><span class="dot"></span>${dt.name}</a>`; }).join('\n      ')}
    </div>
  </div>
</section>`;

  layout({
    path: '/destinations/',
    title: di.pageTitle,
    description: di.pageDescription,
    image: '/assets/images/general/mountain-lake-yurts.webp',
    activeHref: '/destinations/',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Destination detail (x6)
/* ------------------------------------------------------------------ */
function buildDestinationDetail(dest, locale) {
  const dt = tr(dest, locale);
  const dd = UI[locale].destinationDetail;
  const regionKeywords = DEST_REGION_MAP[dest.slug] || [];
  const destTours = TOURS.filter(function (t_) {
    return t_.region.some(function (r) { return regionKeywords.indexOf(r) !== -1; }) || t_.region.indexOf('All regions') !== -1;
  }).slice(0, 3);

  const body = `
<section class="hero-detail hero-detail--dest">
  <img class="hero-detail__media" src="${dest.heroImage}" alt="${attr(dt.name)}">
  <div class="hero-detail__scrim"></div>
  <div class="hero-detail__content">
    <div class="container stack--sm">
      <h1 style="margin:0">${dt.name}</h1>
      <p style="margin:0;font-size:20px;color:rgba(255,255,255,.92)">${dt.short}</p>
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>${dd.aboutHeading(dt.name)}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${dt.about}</p>
    </div>
    <div class="info-table info-table--flat">
      ${dt.info.map(function (i) { return '<div class="info-table__row"><span class="k">' + i.k + '</span><span class="v">' + i.v + '</span></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2>${dd.highlightsHeading}</h2>
    <div class="grid-3">
      ${dt.highlights.map(function (h) {
        const readMore = h.blogSlug ? `<a href="${localePath(locale, '/blog/' + h.blogSlug + '/')}" class="btn btn--outline btn--sm" style="align-self:flex-start;margin-top:4px">${UI[locale].blogIndex.readMore} →</a>` : '';
        return `<div style="background:#fff;border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
  <div style="position:relative;aspect-ratio:16/10"><img src="${h.img}" alt="${attr(h.t)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>
  <div style="padding:24px;display:flex;flex-direction:column;gap:8px"><div style="font:600 20px var(--font-body)">${h.t}</div><div style="font-size:16px;line-height:1.6;color:var(--color-text-muted)">${h.d}</div>${readMore}</div>
</div>`;
      }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2">
    <div class="stack--sm">
      <h2>${dd.gettingThereHeading}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${dt.gettingThere}</p>
      <div class="stack--sm">
        ${dt.gettingThereBullets.map(function (b) { return '<div>&bull; ' + b + '</div>'; }).join('\n        ')}
      </div>
    </div>
    <div class="info-table info-table--flat" style="padding:0;background:none;box-shadow:none">
      <img src="${dest.heroImage}" alt="${attr(dd.routeToAlt(dt.name))}" loading="lazy" style="width:100%;border-radius:8px;object-fit:cover;aspect-ratio:4/3">
    </div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2>${dd.toursInHeading(dt.name)}</h2>
    <div class="grid-3">${destTours.map(function (dtour) { return tourCardHtml(dtour, locale); }).join('\n')}</div>
  </div>
</section>

<section class="section section--forest text-center">
  <div class="container stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">${dt.ctaTitle}</h2>
    <a href="#" data-wa-message="${attr(dd.waMessage(dt.name))}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${dd.planYourTripBtn}</a>
  </div>
</section>`;

  layout({
    path: '/destinations/' + dest.slug + '/',
    title: dt.name,
    description: dt.about.slice(0, 150),
    image: dest.heroImage,
    activeHref: '/destinations/',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: About
/* ------------------------------------------------------------------ */
function buildAbout(locale) {
  const a = UI[locale].about;
  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/IND04269.JPG" alt="Founder with horses in Kyrgyzstan" style="object-position: center bottom;">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>${a.heroTitle}</h1>
    <p>${a.heroSubtitle}</p>
  </div>
</section>

<section class="section section--white">
  <div class="container grid-2" style="align-items:center">
    <div class="stack--sm">
      <h2>${a.ourStoryHeading}</h2>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${a.ourStoryText}</p>
      <p style="font-size:18px;line-height:1.7;color:var(--color-text-mute-3)">${a.ourStoryPersonal}</p>
    </div>
    <div style="position:relative;aspect-ratio:4/5;border-radius:8px;overflow:hidden"><img src="/assets/images/general/IND03973.JPG" alt="Kyrgyzstan mountain landscape" style="width:100%;height:100%;object-fit:cover"></div>
  </div>
</section>

<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">${a.ourValuesHeading}</h2>
    <div class="grid-4">
      ${a.values.map(function (v) { return '<div class="value-card"><div class="t">' + v[0] + '</div><div class="d">' + v[1] + '</div></div>'; }).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--white">
  <div class="container stack">
    <h2 class="text-center">${a.meetGuidesHeading}</h2>
    <p class="text-center" style="color:var(--color-text-mute-2)">${a.meetGuidesText}</p>
  </div>
</section>

<section class="section section--cream text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="margin:0">${a.meetUsHeading}</h2>
    <p style="margin:0;font-size:18px;color:#8A3A1C">${a.meetUsText}</p>
    <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${t(locale, 'common.chatOnWhatsapp')}</a>
  </div>
</section>`;

  layout({
    path: '/about/',
    title: a.pageTitle,
    description: a.pageDescription,
    image: '/assets/images/general/IND04269.JPG',
    activeHref: '/about/',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Practical Info
/* ------------------------------------------------------------------ */
function buildPracticalInfo(locale) {
  const p = UI[locale].practicalInfo;
  const navLinks = p.sections.map(function (s) { return '<a href="#info-' + s[0] + '">' + s[1] + '</a>'; }).join('\n    ');
  const sections = p.sections.map(function (s) {
    const bullets = s[3].length ? '<div class="stack--sm">' + s[3].map(function (b) { return '<div class="info-section__bullet"><span class="dot">&bull;</span>' + b + '</div>'; }).join('\n') + '</div>' : '';
    return `<div class="info-section" id="info-${s[0]}"><h2>${s[1]}</h2><p>${s[2]}</p>${bullets}</div>`;
  }).join('\n    ');

  const allFaq = UI[locale].home.faqHome.concat(p.faqMore);

  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/pexels-tomas-malik-793526-27245324.jpg" alt="Traveler in the Kyrgyz mountains">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>${p.heroTitle}</h1>
    <p>${p.heroSubtitle}</p>
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
    <h2 class="text-center">${t(locale, 'tourDetail.faqHeading')}</h2>
    ${faqBlock(allFaq, 'faq-all')}
  </div>
</section>

<section class="section section--forest text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">${p.stillQuestionsHeading}</h2>
    <p style="color:rgba(255,255,255,.9);font-size:18px;margin:0">${p.stillQuestionsText}</p>
    <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${p.askUsBtn}</a>
  </div>
</section>`;

  layout({
    path: '/practical-info/',
    title: p.pageTitle,
    description: p.pageDescription,
    image: '/assets/images/general/pexels-tomas-malik-793526-27245324.jpg',
    activeHref: '/practical-info/',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Blog index + article detail
/* ------------------------------------------------------------------ */
function articleListItemHtml(article, locale) {
  const at = tr(article, locale);
  return `
<article class="article-list__item">
  <h3 class="article-list__title"><a href="${localePath(locale, '/blog/' + article.slug + '/')}" style="color:inherit">${at.title}</a></h3>
  <p class="article-list__excerpt">${at.excerpt}</p>
  <a href="${localePath(locale, '/blog/' + article.slug + '/')}" class="btn btn--outline btn--sm" style="align-self:flex-start">${UI[locale].blogIndex.readMore} →</a>
</article>`;
}

function buildBlogIndex(locale) {
  const bi = UI[locale].blogIndex;
  const body = `
<section class="section--tight section--bg">
  <div class="container">
    <h1 style="max-width:820px;margin:0 auto 8px">${bi.heroTitle}</h1>
    <p style="max-width:820px;margin:0 auto 32px;font-size:16px;color:var(--color-text-muted)">${bi.heroSubtitle}</p>
    <div class="article-list">
      ${ARTICLES.map(function (a) { return articleListItemHtml(a, locale); }).join('\n')}
    </div>
  </div>
</section>`;

  layout({
    path: '/blog/',
    title: bi.pageTitle,
    description: bi.pageDescription,
    image: '/assets/images/destinations/kel-suu-valley.jpg',
    activeHref: '/blog/',
    body: body
  }, locale);
}

function buildArticleDetail(article, locale) {
  const at = tr(article, locale);
  const bd = UI[locale].blogDetail;
  const relatedTours = (article.relatedTourSlugs || []).map(function (slug) { return TOURS.find(function (t_) { return t_.slug === slug; }); }).filter(Boolean);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: at.title,
    description: at.seoDescription || at.excerpt,
    image: SITE.url + article.image,
    datePublished: article.publishDate,
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: SITE.url + '/assets/images/logo.svg' } }
  };

  const body = `
<section class="section section--white" style="padding-bottom:0">
  <div class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${localePath(locale, '/')}">${t(locale, 'common.home')}</a>
      <span class="breadcrumbs__sep">/</span>
      <a href="${localePath(locale, '/blog/')}">${t(locale, 'nav.blog')}</a>
      <span class="breadcrumbs__sep">/</span>
      <span class="breadcrumbs__current">${at.title}</span>
    </nav>
    <h1 style="max-width:760px;margin:0 auto 28px">${at.title}</h1>
  </div>
</section>

<section class="section section--white">
  <div class="container">
    <div class="article-body">
      ${at.bodyHtml}
    </div>
  </div>
</section>

${article.gallery && article.gallery.length ? `
<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">${bd.galleryHeading}</h2>
    <div class="gallery-grid">
      ${article.gallery.map(function (src) { return '<div class="gallery-grid__item"><img src="' + src + '" alt="' + attr(at.title) + '" loading="lazy"></div>'; }).join('\n      ')}
    </div>
  </div>
</section>` : ''}

${relatedTours.length ? `
<section class="section section--bg">
  <div class="container stack">
    <h2 class="text-center">${t(locale, 'common.viewRelatedTours')}</h2>
    <div class="grid-3">
      ${relatedTours.map(function (tour) { return tourCardHtml(tour, locale); }).join('\n')}
    </div>
  </div>
</section>` : ''}

<section class="section section--forest text-center">
  <div class="container max-w-800 stack--sm" style="align-items:center;display:flex;flex-direction:column">
    <h2 style="color:#fff">${bd.ctaHeading}</h2>
    <p style="color:rgba(255,255,255,.9);font-size:18px;margin:0">${bd.ctaText}</p>
    <a href="#" data-wa-message="${attr(t(locale, 'common.waDefaultMessage'))}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--lg">${bd.ctaBtn}</a>
  </div>
</section>`;

  layout({
    path: '/blog/' + article.slug + '/',
    title: at.title,
    description: at.seoDescription || at.excerpt,
    image: article.image,
    activeHref: '/blog/',
    structuredData: articleLd,
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* Page: Contact
/* ------------------------------------------------------------------ */
function buildContact(locale) {
  const c = UI[locale].contact;
  const contacts = [
    { k: c.contactLabels.whatsapp, v: '+' + SITE.whatsapp, href: waLink(t(locale, 'common.waDefaultMessage')), bg: '#5FAD56', iconName: 'whatsapp' },
    { k: c.contactLabels.email, v: SITE.email, href: 'mailto:' + SITE.email, bg: '#F78154', iconName: 'email' },
    { k: c.contactLabels.instagram, v: '@' + SITE.instagram, href: 'https://instagram.com/' + SITE.instagram, bg: '#B4436C', iconName: 'instagram' },
    { k: c.contactLabels.facebook, v: SITE.facebook, href: 'https://' + SITE.facebook, bg: '#385A68', iconName: 'facebook' }
  ];

  const body = `
<section class="hero hero--page">
  <img class="hero__media" src="/assets/images/general/pexels-liuguangxi-12836297.jpg" alt="Team photo placeholder">
  <div class="hero__scrim"></div>
  <div class="hero__content">
    <h1>${c.heroTitle}</h1>
    <p>${c.heroSubtitle}</p>
  </div>
</section>

<section class="section section--white">
  <div class="container max-w-800 stack">
    <h2>${c.getInTouchHeading}</h2>
    <div>
      ${contacts.map(function (ct) {
        return `<a href="${ct.href}" target="_blank" rel="noopener" class="contact-link">
  <span class="contact-link__icon" style="background:${ct.bg}">${icon(ct.iconName, 22)}</span>
  <span class="contact-link__key">${ct.k}</span>
  <span class="contact-link__value">${ct.v}</span>
</a>`;
      }).join('\n      ')}
    </div>
    <div style="font-size:14px;color:var(--color-text-mute-2)">${c.replyNote}</div>
  </div>
</section>`;

  layout({
    path: '/contact/',
    title: c.pageTitle,
    description: c.pageDescription,
    image: '/assets/images/general/pexels-liuguangxi-12836297.jpg',
    activeHref: '/contact/',
    body: body
  }, locale);
}

/* ------------------------------------------------------------------ */
/* sitemap.xml & robots.txt (cover all locales) */
/* ------------------------------------------------------------------ */
function buildSitemapAndRobots() {
  const urlPaths = ['/', '/tours/', '/destinations/', '/about/', '/practical-info/', '/blog/', '/contact/']
    .concat(TOURS.map(function (t_) { return '/tours/' + t_.slug + '/'; }))
    .concat(DESTINATIONS.map(function (d) { return '/destinations/' + d.slug + '/'; }))
    .concat(ARTICLES.map(function (a) { return '/blog/' + a.slug + '/'; }));

  const today = new Date().toISOString().slice(0, 10);
  const entries = [];
  urlPaths.forEach(function (urlPath) {
    LOCALES.forEach(function (locale) {
      const loc = SITE.url + localePath(locale, urlPath);
      const alternates = LOCALES.map(function (l) {
        return '      <xhtml:link rel="alternate" hreflang="' + l + '" href="' + SITE.url + localePath(l, urlPath) + '"/>';
      }).join('\n');
      entries.push('  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + today + '</lastmod>\n' + alternates + '\n  </url>');
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
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

/* Thin redirect pages at the pre-move /ru/ and /ky/ URLs, pointing at the
   new /locales/<locale>/ location, so old links/bookmarks/search results
   still land somewhere useful. */
function buildLegacyLocaleRedirects() {
  const urlPaths = ['/', '/tours/', '/destinations/', '/about/', '/practical-info/', '/blog/', '/contact/']
    .concat(TOURS.map(function (t_) { return '/tours/' + t_.slug + '/'; }))
    .concat(DESTINATIONS.map(function (d) { return '/destinations/' + d.slug + '/'; }))
    .concat(ARTICLES.map(function (a) { return '/blog/' + a.slug + '/'; }));

  LOCALES.filter(function (l) { return l !== DEFAULT_LOCALE; }).forEach(function (locale) {
    urlPaths.forEach(function (urlPath) {
      const oldPath = oldLocalePath(locale, urlPath);
      const newUrl = SITE.url + localePath(locale, urlPath);
      const html = `<!DOCTYPE html>
<html lang="${locale}"><head><meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=${newUrl}">
<link rel="canonical" href="${newUrl}">
<title>${SITE.name}</title>
</head><body>Moved to <a href="${newUrl}">${newUrl}</a></body></html>
`;
      const dest = outPath(oldPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, html);
    });
  });
  console.log('wrote legacy locale redirect stubs');
}

/* ------------------------------------------------------------------ */
/* Client-side i18n strings (dynamic JS-rendered text) */
/* ------------------------------------------------------------------ */
function buildClientI18n() {
  const perLocale = {};
  LOCALES.forEach(function (locale) {
    perLocale[locale] = {
      resultsPrefix: locale === 'ru' ? 'Показано' : locale === 'ky' ? '' : 'Showing',
      resultsWords: locale === 'ru' ? ['тур', 'тура', 'туров'] : locale === 'ky' ? ['маршрут', 'маршрут', 'маршрут'] : ['tour', 'tours', 'tours'],
      resultsSuffix: locale === 'ky' ? 'көрсөтүлдү' : '',
      waDefaultMessage: UI[locale].common.waDefaultMessage,
      builderWaLabels: {
        hello: locale === 'ru' ? 'Здравствуйте! Хочу собрать индивидуальный тур.' : locale === 'ky' ? 'Салам! Жеке тур чогулткум келет.' : "Hello! I'd like to build a custom tour.",
        regions: locale === 'ru' ? 'Регионы' : locale === 'ky' ? 'Аймактар' : 'Regions',
        activities: locale === 'ru' ? 'Активности' : locale === 'ky' ? 'Иш-аракеттер' : 'Activities',
        days: locale === 'ru' ? 'Дни' : locale === 'ky' ? 'Күндөр' : 'Days',
        travelers: locale === 'ru' ? 'Путешественники' : locale === 'ky' ? 'Саякатчылар' : 'Travelers',
        openToSuggestions: locale === 'ru' ? 'открыто к предложениям' : locale === 'ky' ? 'сунуштарга ачык' : 'open to suggestions'
      },
      bookingWaLabel: locale === 'ru' ? 'Здравствуйте! Хочу забронировать' : locale === 'ky' ? 'Салам! Брондогум келет' : "Hello! I'd like to book",
      estimateLabel: UI[locale].toursIndex.builder.estimate('__AMOUNT__'),
      contactForm: {
        hello: locale === 'ru' ? 'Здравствуйте! Хочу спланировать поездку.' : locale === 'ky' ? 'Салам! Саякатты пландаштыргым келет.' : 'Hello! I would like to plan a trip.',
        name: UI[locale].contact.fields.name.label,
        country: UI[locale].contact.fields.country.label,
        email: UI[locale].contact.fields.email.label,
        whatsapp: UI[locale].contact.fields.whatsapp.label,
        dates: UI[locale].contact.fields.dates.label,
        travelers: UI[locale].contact.fields.travelers.label,
        interest: UI[locale].contact.fields.interest.label,
        message: UI[locale].contact.messageLabel,
        thankYou: locale === 'ru' ? 'Спасибо!' : locale === 'ky' ? 'Рахмат!' : 'Thank you!',
        continueOnWhatsapp: locale === 'ru' ? 'Продолжить в WhatsApp' : locale === 'ky' ? 'WhatsAppта улантуу' : 'Continue on WhatsApp',
        toFinish: locale === 'ru' ? 'чтобы завершить запрос — мы ответим в течение 24 часов.' : locale === 'ky' ? 'сурооңузду бүтүрүү үчүн — биз 24 сааттын ичинде жооп беребиз.' : 'to finish your request — we reply within 24 hours.'
      }
    };
  });
  const js = '/* Auto-generated by scripts/build.js — do not edit by hand. */\nwindow.I18N_STRINGS = ' + JSON.stringify(perLocale, null, 2) + ';\n';
  fs.mkdirSync(path.join(ROOT, 'assets/js'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets/js/i18n-strings.js'), js);
  console.log('wrote assets/js/i18n-strings.js');
}

/* ------------------------------------------------------------------ */
/* Run */
/* ------------------------------------------------------------------ */
buildClientI18n();
LOCALES.forEach(function (locale) {
  buildHome(locale);
  buildToursIndex(locale);
  TOURS.forEach(function (tour, i) { buildTourDetail(tour, i, locale); });
  buildDestinationsIndex(locale);
  DESTINATIONS.forEach(function (dest) { buildDestinationDetail(dest, locale); });
  buildAbout(locale);
  buildPracticalInfo(locale);
  buildBlogIndex(locale);
  ARTICLES.forEach(function (article) { buildArticleDetail(article, locale); });
  buildContact(locale);
});
buildSitemapAndRobots();
buildLegacyLocaleRedirects();
console.log('\nBuild complete:', TOURS.length, 'tours,', DESTINATIONS.length, 'destinations,', ARTICLES.length, 'articles,', LOCALES.length, 'locales.');
