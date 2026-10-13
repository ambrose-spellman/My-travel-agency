/* Site-wide interactivity: mobile menu, accordions, tour filters, builder, contact form. */
(function () {
  'use strict';

  function i18n() {
    var locale = window.SITE_LOCALE || 'en';
    return (window.I18N_STRINGS && window.I18N_STRINGS[locale]) || (window.I18N_STRINGS && window.I18N_STRINGS.en) || {};
  }

  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-mobile-menu]');
    var close = document.querySelector('[data-menu-close]');
    if (!toggle || !menu) return;

    function open() {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function shut() {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', open);
    if (close) close.addEventListener('click', shut);
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', shut); });
  }

  /* ---------- Accordions (FAQ, itinerary, info) ---------- */
  function initAccordions() {
    document.querySelectorAll('[data-accordion-trigger]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var item = trigger.closest('.accordion-item');
        if (!item) return;
        var sign = trigger.querySelector('.sign');
        var willOpen = !item.classList.contains('is-open');
        item.classList.toggle('is-open', willOpen);
        if (sign) sign.textContent = willOpen ? '−' : '+';
      });
    });
  }

  /* ---------- Tours catalog: activity tabs + duration/region pills ---------- */
  function durationMatches(card, durKey) {
    if (durKey === 'All') return true;
    var min = parseInt(card.dataset.durationMin, 10);
    var max = parseInt(card.dataset.durationMax, 10);
    if (durKey === '1-3') return min <= 3;
    if (durKey === '4-6') return max >= 4 && min <= 6;
    if (durKey === '7-10') return max >= 7 && min <= 10;
    if (durKey === '11+') return max >= 11;
    return true;
  }

  function formatResultsLabel(n) {
    var s = i18n();
    var words = s.resultsWords || ['tour', 'tours', 'tours'];
    var locale = window.SITE_LOCALE || 'en';
    var word;
    if (locale === 'ru') {
      var mod10 = n % 10, mod100 = n % 100;
      word = (mod10 === 1 && mod100 !== 11) ? words[0] : (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) ? words[1] : words[2];
    } else {
      word = n === 1 ? words[0] : words[1];
    }
    var parts = [];
    if (s.resultsPrefix) parts.push(s.resultsPrefix);
    parts.push(n, word);
    if (s.resultsSuffix) parts.push(s.resultsSuffix);
    return parts.join(' ');
  }

  function initTourFilters() {
    var grid = document.querySelector('[data-tour-grid]');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.tour-card'));
    var tabs = document.querySelectorAll('[data-filter-tab]');
    var pills = document.querySelectorAll('[data-filter-pill]');
    var resultsLabel = document.querySelector('[data-results-label]');
    var noResults = document.querySelector('[data-no-results]');
    var builderPanel = document.querySelector('[data-builder-panel]');

    var state = { activity: (grid.dataset.defaultActivity || 'All'), duration: 'All', region: 'All' };

    function apply() {
      tabs.forEach(function (t) { t.classList.toggle('is-active', t.dataset.filterTab === state.activity); });
      pills.forEach(function (p) {
        var isActive = (p.dataset.filterGroup === 'duration' && p.dataset.filterPill === state.duration) ||
                        (p.dataset.filterGroup === 'region' && p.dataset.filterPill === state.region);
        p.classList.toggle('is-active', isActive);
      });

      var isCustom = state.activity === 'Custom';
      grid.hidden = isCustom;
      var filterBar = document.querySelector('[data-filter-bar]');
      if (filterBar) filterBar.hidden = isCustom;
      if (builderPanel) builderPanel.hidden = !isCustom;
      if (isCustom) return;

      var visibleCount = 0;
      cards.forEach(function (card) {
        var matchesActivity = state.activity === 'All' || card.dataset.activity === state.activity;
        var matchesRegion = state.region === 'All' || (card.dataset.regions || '').split('|').indexOf(state.region) !== -1;
        var matchesDuration = durationMatches(card, state.duration);
        var visible = matchesActivity && matchesRegion && matchesDuration;
        card.hidden = !visible;
        if (visible) visibleCount++;
      });

      if (resultsLabel) resultsLabel.textContent = formatResultsLabel(visibleCount);
      if (noResults) noResults.hidden = visibleCount !== 0;
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        state.activity = t.dataset.filterTab;
        state.duration = 'All';
        state.region = 'All';
        apply();
      });
    });
    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        state[p.dataset.filterGroup] = p.dataset.filterPill;
        apply();
      });
    });

    apply();
  }

  /* ---------- Tour builder (custom tour estimate) ---------- */
  function initTourBuilder() {
    var el = document.querySelector('[data-builder]');
    if (!el) return;

    var regions = [];
    var activities = [];

    var waLinkEl = el.querySelector('[data-b-wa]');

    function render() {
      var s = i18n();
      if (waLinkEl && window.SiteWhatsApp) {
        var bl = s.builderWaLabels || {};
        var open = bl.openToSuggestions || 'open to suggestions';
        var msg = (bl.hello || "Hello! I'd like to build a custom tour.") +
          '\n' + (bl.regions || 'Regions') + ': ' + (regions.join(', ') || open) +
          '\n' + (bl.activities || 'Activities') + ': ' + (activities.join(', ') || open);
        waLinkEl.setAttribute('href', window.SiteWhatsApp.buildWaLink(msg));
      }
    }

    el.querySelectorAll('[data-b-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var list = chip.dataset.bGroup === 'region' ? regions : activities;
        var value = chip.dataset.bChip;
        var idx = list.indexOf(value);
        if (idx === -1) { list.push(value); chip.classList.add('is-active'); }
        else { list.splice(idx, 1); chip.classList.remove('is-active'); }
        render();
      });
    });

    render();
  }

  /* ---------- Contact form (no backend: builds a WhatsApp message) ---------- */
  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var successEl = document.querySelector('[data-contact-success]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var cf = i18n().contactForm || {};
      var lines = [
        cf.hello || 'Hello! I would like to plan a trip.',
        (cf.name || 'Name') + ': ' + (data.get('name') || ''),
        (cf.country || 'Country') + ': ' + (data.get('country') || ''),
        (cf.email || 'Email') + ': ' + (data.get('email') || ''),
        (cf.whatsapp || 'WhatsApp') + ': ' + (data.get('whatsapp') || ''),
        (cf.dates || 'Preferred dates') + ': ' + (data.get('dates') || ''),
        (cf.travelers || 'Travelers') + ': ' + (data.get('travelers') || ''),
        (cf.interest || 'Tour or region') + ': ' + (data.get('interest') || ''),
        (cf.message || 'Message') + ': ' + (data.get('message') || '')
      ];
      var link = window.SiteWhatsApp.buildWaLink(lines.join('\n'));
      if (successEl) {
        successEl.hidden = false;
        successEl.innerHTML = (cf.thankYou || 'Thank you!') + ' <a href="' + link + '" target="_blank" rel="noopener">' + (cf.continueOnWhatsapp || 'Continue on WhatsApp') + '</a> ' + (cf.toFinish || 'to finish your request — we reply within 24 hours.');
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      window.open(link, '_blank', 'noopener');
      form.reset();
    });
  }

  /* ---------- Practical-info sidebar: highlight the section in view ---------- */
  function initInfoNavScrollSpy() {
    var nav = document.querySelector('.info-nav');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);
    if (!sections.length) return;

    function setActive(id) {
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-96px 0px -70% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
    setActive(sections[0].id);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initAccordions();
    initTourFilters();
    initInfoNavScrollSpy();
    initTourBuilder();
    initContactForm();
  });
})();
