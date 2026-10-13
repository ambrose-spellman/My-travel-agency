/* WhatsApp link helpers. Shared across all pages. */
(function (window) {
  'use strict';

  var FALLBACK_NUMBER = '996557475741';

  function buildWaLink(message) {
    var digits = (window.SITE_WHATSAPP || FALLBACK_NUMBER).replace(/\D/g, '');
    var strings = (window.I18N_STRINGS && window.I18N_STRINGS[window.SITE_LOCALE]) || {};
    var fallbackMessage = strings.waDefaultMessage || 'Hello! I would like to plan a trip in Kyrgyzstan.';
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(message || fallbackMessage);
  }

  function applyStaticLinks(root) {
    var scope = root || document;
    scope.querySelectorAll('[data-wa-message]').forEach(function (el) {
      el.setAttribute('href', buildWaLink(el.getAttribute('data-wa-message')));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyStaticLinks(document);
  });

  window.SiteWhatsApp = {
    buildWaLink: buildWaLink,
    applyStaticLinks: applyStaticLinks
  };
})(window);
