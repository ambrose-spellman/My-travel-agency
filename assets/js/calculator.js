/* Tour price calculator: pure pricing math + calculator widget wiring. */
(function (window) {
  'use strict';

  function calculateTourPrice(days, participants, options) {
    options = options || {};
    var PER_DAY_BASE = options.perDayBase || 100;
    var MARKUP = options.markup != null ? options.markup : 0.30;
    var MIN_BILLABLE_PAX = options.minBillable || 4;

    var base = days * PER_DAY_BASE;
    var total = base * (1 + MARKUP);
    var billablePax = Math.max(participants, MIN_BILLABLE_PAX);
    var perPerson = total / billablePax;

    return { base: base, total: total, perPerson: perPerson, billablePax: billablePax };
  }

  function formatUsd(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function initCalculator(root) {
    var el = root || document.querySelector('[data-calculator]');
    if (!el) return;

    var dMin = parseInt(el.dataset.durationMin, 10) || 1;
    var dMax = parseInt(el.dataset.durationMax, 10) || 30;
    var perDayBase = parseInt(el.dataset.perDayBase, 10) || 100;
    var markup = parseFloat(el.dataset.markup);
    if (isNaN(markup)) markup = 0.30;
    var minBillable = parseInt(el.dataset.minBillable, 10) || 4;
    var tourTitle = el.dataset.tourTitle || 'this tour';

    var days = Math.min(Math.max(parseInt(el.dataset.daysDefault, 10) || dMin, dMin), dMax);
    var pax = parseInt(el.dataset.paxDefault, 10) || minBillable;

    var daysValueEl = el.querySelector('[data-days-value]');
    var paxValueEl = el.querySelector('[data-pax-value]');
    var totalEl = el.querySelector('[data-total]');
    var perPersonEl = el.querySelector('[data-per-person]');
    var minNoteEl = el.querySelector('[data-min-note]');
    var waLinkEl = el.querySelector('[data-wa-book]');

    function render() {
      var result = calculateTourPrice(days, pax, { perDayBase: perDayBase, markup: markup, minBillable: minBillable });
      if (daysValueEl) daysValueEl.textContent = days;
      if (paxValueEl) paxValueEl.textContent = pax;
      if (totalEl) totalEl.textContent = formatUsd(result.total);
      if (perPersonEl) perPersonEl.textContent = formatUsd(result.perPerson);
      if (minNoteEl) minNoteEl.hidden = pax >= minBillable;
      if (waLinkEl && window.SiteWhatsApp) {
        var msg = 'Hello! I\'d like to book "' + tourTitle + '" for ' + pax + ' traveler(s), ' + days + ' days. Estimated total ' + formatUsd(result.total) + '.';
        waLinkEl.setAttribute('href', window.SiteWhatsApp.buildWaLink(msg));
      }
    }

    el.querySelectorAll('[data-days-dec]').forEach(function (btn) {
      btn.addEventListener('click', function () { days = Math.max(dMin, days - 1); render(); });
    });
    el.querySelectorAll('[data-days-inc]').forEach(function (btn) {
      btn.addEventListener('click', function () { days = Math.min(dMax, days + 1); render(); });
    });
    el.querySelectorAll('[data-pax-dec]').forEach(function (btn) {
      btn.addEventListener('click', function () { pax = Math.max(1, pax - 1); render(); });
    });
    el.querySelectorAll('[data-pax-inc]').forEach(function (btn) {
      btn.addEventListener('click', function () { pax = Math.min(8, pax + 1); render(); });
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-calculator]').forEach(initCalculator);
  });

  window.TourCalculator = {
    calculateTourPrice: calculateTourPrice,
    formatUsd: formatUsd,
    initCalculator: initCalculator
  };
})(window);
