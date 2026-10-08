/* Site-wide interactivity: mobile menu, accordions, tour filters, builder, contact form. */
(function () {
  'use strict';

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

  function initTourFilters() {
    var grid = document.querySelector('[data-tour-grid]');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.tour-card'));
    var tabs = document.querySelectorAll('[data-filter-tab]');
    var pills = document.querySelectorAll('[data-filter-pill]');
    var resultsLabel = document.querySelector('[data-results-label]');
    var noResults = document.querySelector('[data-no-results]');
    var builderPanel = document.querySelector('[data-builder-panel]');

    var state = { activity: (grid.dataset.defaultActivity || 'Horse'), duration: 'All', region: 'All' };

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
        var matchesActivity = card.dataset.activity === state.activity;
        var matchesRegion = state.region === 'All' || (card.dataset.regions || '').split('|').indexOf(state.region) !== -1;
        var matchesDuration = durationMatches(card, state.duration);
        var visible = matchesActivity && matchesRegion && matchesDuration;
        card.hidden = !visible;
        if (visible) visibleCount++;
      });

      if (resultsLabel) resultsLabel.textContent = 'Showing ' + visibleCount + ' tour' + (visibleCount === 1 ? '' : 's');
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

    var perDayBase = parseInt(el.dataset.perDayBase, 10) || 100;
    var markup = parseFloat(el.dataset.markup);
    if (isNaN(markup)) markup = 0.30;
    var minBillable = parseInt(el.dataset.minBillable, 10) || 4;

    var days = 7;
    var pax = 2;
    var regions = [];
    var activities = [];

    var daysValueEl = el.querySelector('[data-b-days-value]');
    var paxValueEl = el.querySelector('[data-b-pax-value]');
    var estimateEl = el.querySelector('[data-b-estimate]');
    var waLinkEl = el.querySelector('[data-b-wa]');

    function render() {
      if (daysValueEl) daysValueEl.textContent = days;
      if (paxValueEl) paxValueEl.textContent = pax;
      var result = window.TourCalculator.calculateTourPrice(days, pax, { perDayBase: perDayBase, markup: markup, minBillable: minBillable });
      if (estimateEl) estimateEl.textContent = 'Estimate from ' + window.TourCalculator.formatUsd(result.total) + ' for the group';
      if (waLinkEl && window.SiteWhatsApp) {
        var msg = 'Hello! I\'d like to build a custom tour.\nRegions: ' + (regions.join(', ') || 'open to suggestions') +
          '\nActivities: ' + (activities.join(', ') || 'open to suggestions') + '\nDays: ' + days + '\nTravelers: ' + pax;
        waLinkEl.setAttribute('href', window.SiteWhatsApp.buildWaLink(msg));
      }
    }

    el.querySelectorAll('[data-b-days-dec]').forEach(function (b) { b.addEventListener('click', function () { days = Math.max(1, days - 1); render(); }); });
    el.querySelectorAll('[data-b-days-inc]').forEach(function (b) { b.addEventListener('click', function () { days = Math.min(30, days + 1); render(); }); });
    el.querySelectorAll('[data-b-pax-dec]').forEach(function (b) { b.addEventListener('click', function () { pax = Math.max(1, pax - 1); render(); }); });
    el.querySelectorAll('[data-b-pax-inc]').forEach(function (b) { b.addEventListener('click', function () { pax = Math.min(12, pax + 1); render(); }); });

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
      var lines = [
        'Hello! I would like to plan a trip.',
        'Name: ' + (data.get('name') || ''),
        'Country: ' + (data.get('country') || ''),
        'Email: ' + (data.get('email') || ''),
        'WhatsApp: ' + (data.get('whatsapp') || ''),
        'Preferred dates: ' + (data.get('dates') || ''),
        'Travelers: ' + (data.get('travelers') || ''),
        'Tour or region: ' + (data.get('interest') || ''),
        'Message: ' + (data.get('message') || '')
      ];
      var link = window.SiteWhatsApp.buildWaLink(lines.join('\n'));
      if (successEl) {
        successEl.hidden = false;
        successEl.innerHTML = 'Thank you! <a href="' + link + '" target="_blank" rel="noopener">Continue on WhatsApp</a> to finish your request — we reply within 24 hours.';
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      window.open(link, '_blank', 'noopener');
      form.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initAccordions();
    initTourFilters();
    initTourBuilder();
    initContactForm();
  });
})();
