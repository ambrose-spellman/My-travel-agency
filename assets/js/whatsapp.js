/* WhatsApp link helpers. Shared across all pages. */
(function (window) {
  'use strict';

  var SITE = {
    whatsappNumber: '996700000000',
    email: 'hello@example.com',
    instagram: 'yourinstagram',
    facebook: 'facebook.com/yourpage'
  };

  function buildWaLink(message) {
    var digits = SITE.whatsappNumber.replace(/\D/g, '');
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(message || 'Hello! I would like to plan a trip in Kyrgyzstan.');
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
    config: SITE,
    buildWaLink: buildWaLink,
    applyStaticLinks: applyStaticLinks
  };
})(window);
