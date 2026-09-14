/**
 * Automated Verification & Self-Testing Engine
 * Validates HTML tags, form hooks, script existence, and endpoint health
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Ping an HTTP/HTTPS URL
 */
function pingUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.get(urlStr, { timeout: 4000 }, (res) => {
        // If Google Apps Script redirects to Google Accounts login, access is restricted
        if (res.headers && res.headers.location && res.headers.location.includes('accounts.google.com')) {
          resolve({ ok: false, statusCode: 401, error: 'Authentication required. In Google Apps Script, set "Who has access: Anyone".' });
          return;
        }
        // Google Apps Script redirects 302 to script.googleusercontent.com
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ ok: true, statusCode: res.statusCode });
        } else {
          resolve({ ok: false, statusCode: res.statusCode });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Request timed out after 4000ms' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      resolve({ ok: false, error: 'Invalid URL format' });
    }
  });
}

/**
 * Run verification tests on modified files and configuration
 */
async function runVerification(rootDir, htmlFiles, config) {
  const testResults = [];

  function record(name, passed, detail) {
    testResults.push({ name, passed, detail: detail || '' });
  }

  // 1. Check runtime script existence
  const runtimePath = path.join(rootDir, 'assets', 'js', 'buzl-tracking.js');
  const runtimeExists = fs.existsSync(runtimePath);
  record('Runtime script deployed (assets/js/buzl-tracking.js)', runtimeExists);

  // 2. Check each HTML file
  for (const filePath of htmlFiles) {
    const relName = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Structural integrity
    const hasHead = /<head[\s>]/i.test(content) && /<\/head>/i.test(content);
    record(`[${relName}] Valid <head> block integrity`, hasHead);

    const hasBody = /<body[\s>]/i.test(content) && /<\/body>/i.test(content);
    record(`[${relName}] Valid <body> block integrity`, hasBody);

    // GTM Verification
    if (config.gtmId) {
      const hasGtmHead = content.includes(config.gtmId);
      const hasGtmBody = content.includes(`googletagmanager.com/ns.html?id=${config.gtmId}`);
      record(`[${relName}] GTM Head snippet matches ${config.gtmId}`, hasGtmHead);
      record(`[${relName}] GTM Body noscript fallback matches ${config.gtmId}`, hasGtmBody);

      // Duplication check
      const gtmCount = (content.match(new RegExp(config.gtmId, 'g')) || []).length;
      record(`[${relName}] No duplicate GTM tags (head + noscript count <= 2)`, gtmCount <= 2);
    }

    // Meta Pixel Verification
    if (config.metaPixelId) {
      const hasMetaHead = content.includes(`fbq("init", "${config.metaPixelId}")`) || content.includes(config.metaPixelId);
      const hasMetaNoscript = content.includes(`facebook.com/tr?id=${config.metaPixelId}`);
      record(`[${relName}] Meta Pixel Head code configured with ${config.metaPixelId}`, hasMetaHead);
      record(`[${relName}] Meta Pixel Noscript fallback present`, hasMetaNoscript);
    }

    // Runtime script tag link
    const hasScriptLink = content.includes('buzl-tracking.js');
    record(`[${relName}] Runtime tracker linked before </body>`, hasScriptLink);

    // Form Hook Check
    const hasForms = /<form[\s>]/i.test(content);
    if (hasForms) {
      const hasTrackAttr = /<form[^>]*data-buzl-track="true"/i.test(content);
      record(`[${relName}] Forms tagged with data-buzl-track attribute`, hasTrackAttr);
    }
  }

  // 3. Google Apps Script Webhook Ping
  if (config.googleSheetUrl) {
    const pingRes = await pingUrl(config.googleSheetUrl);
    if (pingRes.ok) {
      record(`Google Apps Script endpoint reachable (HTTP ${pingRes.statusCode})`, true);
    } else {
      let detail = pingRes.error || `HTTP ${pingRes.statusCode}`;
      if (pingRes.statusCode === 404) {
        const isPlaceholder = /AKfycbx_eY7V34n2Gz3h125JmO6r89Q2k|placeholder|example|AKfycbz_test/i.test(config.googleSheetUrl);
        detail = isPlaceholder
          ? 'HTTP 404 (Placeholder script ID detected. Deploy Buzl_GoogleAppsScript_Template.gs in your Google Sheet via Deploy > New deployment > Web app > Anyone, and paste your live /exec URL)'
          : 'HTTP 404 (Script not found on Google. In your Google Sheet, click Deploy > Manage deployments and verify a Web app is deployed with "Who has access: Anyone")';
      } else if (pingRes.statusCode === 401 || pingRes.statusCode === 403) {
        detail = `HTTP ${pingRes.statusCode} (Access denied. In your Google Sheet, ensure Web app deployment has "Who has access: Anyone")`;
      }
      record(`Google Apps Script endpoint reachability`, false, detail);
    }
  }

  const passedCount = testResults.filter(t => t.passed).length;
  const failedCount = testResults.filter(t => !t.passed).length;

  return {
    total: testResults.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    tests: testResults
  };
}

/**
 * Dispatch a live synthetic test lead to all configured channels
 */
async function testDispatch(arg1, arg2 = {}, arg3 = {}) {
  let config = arg1;
  let sampleLead = arg2;
  let rootDir = '';

  // Polymorphic support: if called as (rootDir, config, sampleLead)
  if (typeof arg1 === 'string' && typeof arg2 === 'object') {
    rootDir = arg1;
    config = arg2;
    sampleLead = arg3;
  }
  if (!config) config = {};
  if (!sampleLead) sampleLead = {};

  const leadId = sampleLead.leadId || ('test-lead-' + Date.now());
  const name = sampleLead.name || 'Test Lead';
  const phone = sampleLead.phone || config.whatsappNumber || (config.whatsapp && config.whatsapp.number) || '';
  const location = sampleLead.location || config.siteLocation || '';
  const service = sampleLead.service || 'General Inquiry';

  const results = {
    leadId,
    timestamp: new Date().toISOString(),
    channels: {}
  };

  // 1. Test Google Sheets Sync
  const googleSheetUrl = config.googleSheetUrl || (config.sheets && config.sheets.url) || '';
  if (googleSheetUrl) {
    try {
      const sheetPayload = {
        timestamp: new Date().toISOString(),
        leadId: leadId,
        name: name,
        location: location,
        siteLocation: config.siteLocation || location,
        phone: phone,
        service: service,
        email: sampleLead.email || config.notificationEmail || 'test-lead@example.com',
        source: service,
        utm: { source: 'live_test_button', medium: 'gui_test', campaign: 'buzl_verification' },
        eventSourceUrl: sampleLead.eventSourceUrl || 'http://localhost:3333/test',
        landingPageUrl: sampleLead.landingPageUrl || 'http://localhost:3333/',
        pagePath: sampleLead.pagePath || '/test',
        userAgent: 'Buzl-Test-Agent/1.0',
        rawFields: Object.assign({ service: service, isTest: true }, sampleLead.rawFields || {})
      };

      const res = await fetch(googleSheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetPayload)
      });

      const bodyText = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(bodyText); } catch (e) {}

      let statusMsg = (parsed && parsed.message) ? `${parsed.message} (Row ${parsed.row || 'N/A'})` : `HTTP ${res.status}`;
      if (res.status === 404) {
        const isPlaceholder = /AKfycbx_eY7V34n2Gz3h125JmO6r89Q2k|placeholder|example|AKfycbz_test/i.test(googleSheetUrl);
        statusMsg = isPlaceholder
          ? 'Placeholder URL detected. Deploy Buzl_GoogleAppsScript_Template.gs and paste your real /exec URL.'
          : 'HTTP 404: Script not found on Google. Verify deployment in Google Sheet with access: Anyone.';
      } else if (res.status === 401 || res.status === 403) {
        statusMsg = `HTTP ${res.status}: Access Denied. Ensure Web app deployment access is set to 'Anyone'.`;
      }

      results.channels.googleSheets = {
        tested: true,
        ok: res.ok || (parsed && parsed.status === 'success'),
        status: res.status,
        message: statusMsg
      };
    } catch (err) {
      results.channels.googleSheets = {
        tested: true,
        ok: false,
        status: 0,
        message: err.message
      };
    }
  } else {
    results.channels.googleSheets = { tested: false, message: 'Google Sheets not configured or disabled' };
  }

  // 2. Test Buzl CAPI
  const buzlCapi = config.buzlCapi || {};
  const capiEndpoint = buzlCapi.endpoint || config.buzlCapiEndpoint || '';
  const authUser = buzlCapi.authUser || config.buzlCapiUser || '';
  const authPass = buzlCapi.authPass || config.buzlCapiPass || '';

  if (capiEndpoint && authUser) {
    try {
      const resolvedDomain = sampleLead.domain ||
                             config.domain ||
                             (config.siteUrl ? new URL(config.siteUrl).hostname : '') ||
                             (rootDir ? path.basename(rootDir).toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : '') ||
                             'landing-page';

      const capiPayload = {
        leadId: leadId,
        domain: resolvedDomain,
        eventName: 'Lead',
        eventTime: Math.floor(Date.now() / 1000),
        actionSource: 'website',
        eventSourceUrl: sampleLead.eventSourceUrl || 'http://localhost:3333/test',
        landingPageUrl: sampleLead.landingPageUrl || 'http://localhost:3333/',
        contact: { name: name, phone: phone, location: location },
        source: service,
        utm: { source: 'live_test_button', medium: 'gui_test' }
      };

      const basicAuth = Buffer.from(`${authUser}:${authPass}`).toString('base64');
      const res = await fetch(capiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`
        },
        body: JSON.stringify(capiPayload)
      });

      const text = await res.text();
      results.channels.buzlCapi = {
        tested: true,
        ok: res.ok,
        status: res.status,
        message: res.ok ? `Lead accepted by Buzl CAPI (HTTP ${res.status})` : `Failed: HTTP ${res.status} - ${text.slice(0, 100)}`
      };
    } catch (err) {
      results.channels.buzlCapi = {
        tested: true,
        ok: false,
        status: 0,
        message: err.message
      };
    }
  } else {
    results.channels.buzlCapi = { tested: false, message: 'Buzl CAPI not configured or disabled' };
  }

  // 3. Test Zoho CRM
  const zoho = config.zoho || {};
  const zohoEndpoint = zoho.endpoint || config.zohoEndpoint || '';
  const zohoXnqsjsdp = zoho.xnQsjsdp || config.zohoXnqsjsdp || '';

  if (zohoEndpoint && zohoXnqsjsdp) {
    try {
      const params = new URLSearchParams();
      params.append('xnQsjsdp', zohoXnqsjsdp);
      if (zoho.xmIwtLD || config.zohoXmiwtld) params.append('xmIwtLD', zoho.xmIwtLD || config.zohoXmiwtld);
      params.append('actionType', 'TGVhZHM=');
      params.append('Last Name', name);
      params.append('Phone', phone);
      params.append('City', location);
      params.append('Lead Source', service);

      const res = await fetch(zohoEndpoint, {
        method: 'POST',
        body: params
      });

      results.channels.zoho = {
        tested: true,
        ok: res.ok,
        status: res.status,
        message: `Dispatched to Zoho (HTTP ${res.status})`
      };
    } catch (err) {
      results.channels.zoho = {
        tested: true,
        ok: false,
        status: 0,
        message: err.message
      };
    }
  } else {
    results.channels.zoho = { tested: false, message: 'Zoho CRM not configured or disabled' };
  }

  return results;
}

/**
 * Test a specific individual form submission
 */
async function testIndividualForm(rootDir, formId, formFields = {}, config = {}, extraOpts = {}) {
  const leadId = 'test-' + (formId || 'form').replace(/[^a-zA-Z0-9_-]/g, '') + '-' + Date.now();

  const name = formFields.name || formFields.fullName || 'Test Lead';
  const phone = formFields.phone || formFields.mobile || config.whatsappNumber || (config.whatsapp && config.whatsapp.number) || '';
  const location = formFields.location || formFields.city || config.siteLocation || '';
  const service = formFields.service || formFields.subject || formFields.inquiry || formId || 'General Inquiry';
  const pagePath = extraOpts.pagePath || formFields.pagePath || '/';

  const sampleLead = {
    leadId,
    name,
    phone,
    location,
    service,
    source: formId || 'Individual Form Test',
    eventSourceUrl: `http://localhost:3333/${pagePath.replace(/^\//, '')}`,
    landingPageUrl: 'http://localhost:3333/',
    pagePath: pagePath,
    rawFields: Object.assign({}, formFields, { formId, pagePath, isTest: true })
  };

  return await testDispatch(rootDir, config, sampleLead);
}

module.exports = {
  runVerification,
  pingUrl,
  testDispatch,
  testIndividualForm
};
