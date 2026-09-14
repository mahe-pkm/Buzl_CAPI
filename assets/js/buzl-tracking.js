/**
 * =========================================================================
 * BUZL UNIVERSAL TRACKING & FORM DISPATCHER RUNTIME
 * Headless SDK for GTM, Meta Pixel/CAPI, Google Sheets, & Zoho CRM
 * =========================================================================
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BuzlTracker = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  function win() { return typeof window !== 'undefined' ? window : {}; }
  function doc() { return typeof document !== 'undefined' ? document : {}; }
  function nav() { return typeof navigator !== 'undefined' ? navigator : {}; }

  function getCookie(name) {
    try {
      var m = doc().cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  function sessionGet(key) {
    try { return (win().sessionStorage && win().sessionStorage.getItem(key)) || ''; }
    catch (e) { return ''; }
  }

  function sessionSet(key, val) {
    try { if (win().sessionStorage) win().sessionStorage.setItem(key, val); }
    catch (e) {}
  }

  function getFbclid() {
    try {
      return new URLSearchParams(win().location.search).get('fbclid') || sessionGet('fbclid') || '';
    } catch (e) { return ''; }
  }

  function getFbc() {
    var fbc = getCookie('_fbc');
    if (fbc) return fbc;
    var fbclid = getFbclid();
    return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : '';
  }

  function getFbp() {
    return getCookie('_fbp') || '';
  }

  function getDomainLabel() {
    try {
      var host = (win().location.hostname || '').trim().toLowerCase();
      host = host.replace(/^www\./, '');
      host = host.replace(/[^a-z0-9_-]/g, '-').slice(0, 63);
      return host || 'website';
    } catch (e) {
      return 'website';
    }
  }

  function generateLeadId() {
    var uuid = '';
    try {
      if (win().crypto && win().crypto.randomUUID) {
        uuid = win().crypto.randomUUID();
      } else if (win().crypto && win().crypto.getRandomValues) {
        var b = win().crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var h = [];
        for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
        uuid = h[0] + h[1] + h[2] + h[3] + '-' + h[4] + h[5] + '-' + h[6] + h[7] + '-' + h[8] + h[9] + '-' + h[10] + h[11] + h[12] + h[13] + h[14] + h[15];
      }
    } catch (e) {}

    if (!uuid) {
      uuid = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
    }
    return getDomainLabel() + '-' + uuid;
  }

  function captureUtm() {
    try {
      var params = new URLSearchParams(win().location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      keys.forEach(function (k) {
        var v = params.get(k);
        if (v) sessionSet(k, v);
      });
    } catch (e) {}
  }

  function getUtm() {
    return {
      source: sessionGet('utm_source'),
      medium: sessionGet('utm_medium'),
      campaign: sessionGet('utm_campaign'),
      term: sessionGet('utm_term'),
      content: sessionGet('utm_content'),
      fbclid: sessionGet('fbclid'),
      gclid: sessionGet('gclid')
    };
  }

  function createTracker(userConfig) {
    var cfg = userConfig || {};
    var googleSheetUrl = cfg.googleSheetUrl || '';
    var gtmEvent = cfg.gtmEvent || 'lead_form_submitted';
    var safetyTimeoutMs = typeof cfg.safetyTimeoutMs === 'number' ? cfg.safetyTimeoutMs : 800;
    var zoho = cfg.zoho || {};
    var buzlCapi = cfg.buzlCapi || {};
    var whatsapp = cfg.whatsapp || {};

    captureUtm();

    /* 1. Push to GTM dataLayer */
    function pushGTM(leadId, payload) {
      if (!cfg.enableGTM) return;
      if (!win().dataLayer) win().dataLayer = [];
      try {
        win().dataLayer.push({
          event: gtmEvent,
          leadId: leadId,
          contact: payload.contact,
          utm: payload.utm,
          pageUrl: win().location.href
        });
      } catch (e) {
        console.warn('[BuzlTracker] GTM push error', e);
      }
    }

    /* 2. Track with Meta Pixel */
    function trackMeta(leadId, payload) {
      if (!cfg.enableMeta || typeof win().fbq !== 'function') return;
      try {
        var customData = {
          content_name: payload.source || 'Lead Form',
          buzl_lead_id: leadId,
          utm_source: payload.utm.source,
          utm_medium: payload.utm.medium,
          utm_campaign: payload.utm.campaign
        };
        win().fbq('trackCustom', 'formSubmitted', customData, { eventID: leadId });
        if (cfg.trackMetaLeadEvent) {
          win().fbq('track', 'Lead', customData, { eventID: leadId });
        }
      } catch (e) {
        console.warn('[BuzlTracker] Meta track error', e);
      }
    }

    /* 3. Sync to Google Sheets */
    function syncToGoogleSheet(leadId, payload) {
      if (!googleSheetUrl) return Promise.resolve();
      return new Promise(function (resolve) {
        var sheetPayload = {
          timestamp: new Date().toISOString(),
          leadId: leadId,
          name: payload.contact.name || '',
          phone: payload.contact.phone || '',
          email: payload.contact.email || '',
          location: payload.contact.location || cfg.siteLocation || '',
          siteLocation: cfg.siteLocation || '',
          source: payload.source || 'Website Form',
          utm: payload.utm,
          fbclid: getFbclid(),
          fbc: getFbc(),
          fbp: getFbp(),
          eventSourceUrl: win().location.href,
          userAgent: nav().userAgent || '',
          rawFields: payload.rawFields || {}
        };

        // Attach dynamic fields directly for top-level access
        if (payload.rawFields) {
          for (var rk in payload.rawFields) {
            if (sheetPayload[rk] === undefined) {
              sheetPayload[rk] = payload.rawFields[rk];
            }
          }
        }

        try {
          win().fetch(googleSheetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sheetPayload),
            keepalive: true
          }).then(function () { resolve({ status: 'sent' }); })
            .catch(function () { resolve({ status: 'error' }); });
        } catch (e) {
          resolve({ status: 'exception' });
        }
      });
    }

    /* 4. Sync to Zoho CRM Web-to-Lead */
    function syncToZoho(payload) {
      if (!zoho.endpoint || !zoho.xnQsjsdp) return Promise.resolve();
      return new Promise(function (resolve) {
        try {
          var fd = new FormData();
          fd.append('xnQsjsdp', zoho.xnQsjsdp);
          if (zoho.xmIwtLD) fd.append('xmIwtLD', zoho.xmIwtLD);
          fd.append('actionType', zoho.actionType || 'TGVhZHM=');

          var fMap = zoho.fields || {};
          var nameField = fMap.lastName || 'Last Name';
          var phoneField = fMap.phone || 'Phone';
          var emailField = fMap.email || 'Email';
          var locationField = fMap.location || 'City';
          var sourceField = fMap.source || 'Lead Source';

          if (payload.contact.name) fd.append(nameField, payload.contact.name);
          if (payload.contact.phone) fd.append(phoneField, payload.contact.phone);
          if (payload.contact.email) fd.append(emailField, payload.contact.email);
          if (payload.contact.location) fd.append(locationField, payload.contact.location);
          if (payload.source) fd.append(sourceField, payload.source);

          if (nav().sendBeacon && nav().sendBeacon(zoho.endpoint, fd)) {
            resolve({ status: 'beacon_sent' });
          } else {
            win().fetch(zoho.endpoint, { method: 'POST', body: fd, mode: 'no-cors', keepalive: true })
              .then(function () { resolve({ status: 'sent' }); })
              .catch(function () { resolve({ status: 'error' }); });
          }
        } catch (e) {
          resolve({ status: 'exception' });
        }
      });
    }

    /* 5. Sync to Server-Side Buzl CAPI */
    function syncToBuzlCAPI(leadId, payload) {
      if (!buzlCapi.endpoint || !buzlCapi.authUser) return Promise.resolve();
      return new Promise(function (resolve) {
        try {
          var capiData = {
            leadId: leadId,
            domain: getDomainLabel(),
            eventName: 'Lead',
            eventTime: Math.floor(Date.now() / 1000),
            actionSource: 'website',
            eventSourceUrl: win().location.href,
            contact: payload.contact,
            source: payload.source,
            fbc: getFbc(),
            fbp: getFbp(),
            fbclid: getFbclid(),
            userAgent: nav().userAgent || '',
            utm: payload.utm
          };

          win().fetch(buzlCapi.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + win().btoa(buzlCapi.authUser + ':' + (buzlCapi.authPass || ''))
            },
            body: JSON.stringify(capiData),
            keepalive: true
          }).then(function () { resolve({ status: 'capi_sent' }); })
            .catch(function () { resolve({ status: 'capi_error' }); });
        } catch (e) {
          resolve({ status: 'capi_exception' });
        }
      });
    }

    /* Extract contact inputs from a Form element */
    function extractFormFields(form) {
      var data = {};
      var elements = form.elements || [];
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        if (!el.name || el.type === 'submit' || el.type === 'button') continue;
        data[el.name] = el.value;
      }

      // Semantic inference
      var name = data.name || data.fullName || data.bizName || data['first-name'] || data['Last Name'] || '';
      var phone = data.phone || data.mobile || data.tel || data.bizPhone || data['Phone'] || '';
      var email = data.email || data.mail || data['Email'] || '';
      var location = data.location || data.city || data.bizLocation || data['City'] || cfg.siteLocation || '';

      return {
        contact: { name: name, phone: phone, email: email, location: location },
        rawFields: data
      };
    }

    /* Main Submit Handler */
    function submitLead(opts) {
      opts = opts || {};
      var leadId = generateLeadId();
      var utm = getUtm();
      var contact = opts.contact || {};
      var source = opts.source || 'Website Form';
      var payload = {
        leadId: leadId,
        contact: contact,
        source: source,
        utm: utm,
        rawFields: opts.rawFields || {}
      };

      // 1. GTM & Meta client triggers
      pushGTM(leadId, payload);
      trackMeta(leadId, payload);

      // 2. Race async endpoints against safety timeout
      var safetyTimer = new Promise(function (res) { setTimeout(res, safetyTimeoutMs); });
      var networkPromises = Promise.all([
        syncToGoogleSheet(leadId, payload),
        syncToZoho(payload),
        syncToBuzlCAPI(leadId, payload)
      ]);

      return Promise.race([networkPromises, safetyTimer]).then(function () {
        // Redirection or follow-up
        if (whatsapp.number && opts.redirect !== false) {
          var textTmpl = whatsapp.template || 'Hi, I submitted an inquiry from {name} in {location}.';
          var msg = textTmpl
            .replace(/{name}/g, contact.name || 'my business')
            .replace(/{location}/g, contact.location || '')
            .replace(/{phone}/g, contact.phone || '');
          var waUrl = 'https://wa.me/' + whatsapp.number + '?text=' + encodeURIComponent(msg);
          win().location.href = waUrl;
        }
        return { leadId: leadId, success: true };
      });
    }

    /* Auto-bind to forms */
    function autoBindForms() {
      var forms = doc().querySelectorAll('form[data-buzl-track], form:not([data-buzl-ignore])');
      forms.forEach(function (f) {
        if (f._buzlBound) return;
        f._buzlBound = true;
        f.addEventListener('submit', function (e) {
          // If form already validated or native
          var extracted = extractFormFields(f);
          var formSource = f.getAttribute('data-buzl-source') || f.getAttribute('id') || 'Form Submission';
          submitLead({
            contact: extracted.contact,
            rawFields: extracted.rawFields,
            source: formSource,
            redirect: f.getAttribute('data-buzl-no-redirect') !== 'true'
          });
        });
      });
    }

    if (doc().readyState === 'loading') {
      doc().addEventListener('DOMContentLoaded', autoBindForms);
    } else {
      autoBindForms();
    }

    return {
      version: VERSION,
      submitLead: submitLead,
      getUtm: getUtm,
      getLeadId: generateLeadId,
      autoBindForms: autoBindForms
    };
  }

  // Global auto-init if config object is defined on window
  var Tracker = {
    version: VERSION,
    init: createTracker
  };

  if (typeof win().__BUZL_CONFIG__ !== 'undefined') {
    win().buzl = Tracker.init(win().__BUZL_CONFIG__);
  }

  return Tracker;
}));
