/**
 * Safe HTML & Tracking Injector
 * Injects GTM, Meta Pixel, Form Sync runtime, and configuration
 */
const fs = require('fs');
const path = require('path');
const {
  HEAD_START_MARKER,
  HEAD_END_MARKER,
  BODY_START_MARKER,
  BODY_END_MARKER,
  generateHeadSnippet,
  generateBodySnippet
} = require('../templates/gtm-meta-snippets');
const { createBackup } = require('./rollback');

const RUNTIME_START_MARKER = '<!-- BUZL_TRACKING_RUNTIME_START -->';
const RUNTIME_END_MARKER = '<!-- BUZL_TRACKING_RUNTIME_END -->';

/**
 * Generate runtime script tag & inline configuration
 */
function generateRuntimeSnippet(config, scriptRelPath) {
  const zohoObj = config.zoho || {};
  const zohoXn = (config.zohoXnqsjsdp || zohoObj.xnQsjsdp || '').trim();
  const zohoEndpoint = zohoXn ? (config.zohoEndpoint || zohoObj.endpoint || 'https://crm.zoho.in/crm/WebToLeadForm') : '';
  const zohoXm = zohoXn ? (config.zohoXmiwtld || zohoObj.xmIwtLD || '') : '';
  const zohoFields = zohoXn ? (config.zohoFields || zohoObj.fields || { lastName: 'Last Name', phone: 'Mobile', location: 'City' }) : {};

  const clientConfig = {
    enableGTM: !!(config.gtmId && config.gtmId.trim()),
    gtmEvent: config.gtmEvent || 'lead_form_submitted',
    enableMeta: !!(config.metaPixelId && config.metaPixelId.trim()),
    trackMetaLeadEvent: !!config.trackMetaLeadEvent,
    googleSheetUrl: config.googleSheetUrl || '',
    siteLocation: config.siteLocation || '',
    zoho: {
      endpoint: zohoEndpoint,
      xnQsjsdp: zohoXn,
      xmIwtLD: zohoXm,
      fields: zohoFields
    },
    buzlCapi: {
      endpoint: (config.buzlCapi && config.buzlCapi.endpoint) || config.buzlCapiEndpoint || '',
      authUser: (config.buzlCapi && config.buzlCapi.authUser) || config.buzlCapiUser || '',
      authPass: (config.buzlCapi && config.buzlCapi.authPass) || config.buzlCapiPass || ''
    },
    whatsapp: {
      number: config.whatsappNumber || (config.whatsapp && config.whatsapp.number) || '',
      template: config.whatsappTemplate || (config.whatsapp && config.whatsapp.template) || 'Hi, I submitted an inquiry from {name} in {location}.'
    },
    safetyTimeoutMs: config.safetyTimeoutMs || 800
  };

  return [
    RUNTIME_START_MARKER,
    '  <script id="buzl-tracking-config">',
    `    window.__BUZL_CONFIG__ = ${JSON.stringify(clientConfig, null, 2)};`,
    '  </script>',
    `  <script src="${scriptRelPath}" defer></script>`,
    RUNTIME_END_MARKER
  ].join('\n');
}

/**
 * Injects tracking into a single HTML string
 */
function injectHtml(htmlContent, config, scriptRelPath = 'assets/js/buzl-tracking.js') {
  let content = htmlContent;

  const hasHeadTrackers = !!((config.gtmId && config.gtmId.trim()) || (config.metaPixelId && config.metaPixelId.trim()));
  const headSnippet = hasHeadTrackers ? generateHeadSnippet(config) : '';
  const bodySnippet = hasHeadTrackers ? generateBodySnippet(config) : '';
  const runtimeSnippet = generateRuntimeSnippet(config, scriptRelPath);

  // 1. Head snippet replacement or injection
  const headMarkerRegex = new RegExp(`[\\t ]*${HEAD_START_MARKER}[\\s\\S]*?${HEAD_END_MARKER}\\r?\\n?`, 'g');
  if (headMarkerRegex.test(content)) {
    content = content.replace(headMarkerRegex, hasHeadTrackers ? `${headSnippet}\n` : '');
  } else if (hasHeadTrackers) {
    if (/<\/head>/i.test(content)) {
      content = content.replace(/<\/head>/i, `${headSnippet}\n</head>`);
    } else if (/<head[\s>]/i.test(content)) {
      content = content.replace(/(<head[\s>][^>]*>)/i, `$1\n${headSnippet}`);
    }
  }

  // 2. Body noscript snippet replacement or injection
  const bodyMarkerRegex = new RegExp(`[\\t ]*${BODY_START_MARKER}[\\s\\S]*?${BODY_END_MARKER}\\r?\\n?`, 'g');
  if (bodyMarkerRegex.test(content)) {
    content = content.replace(bodyMarkerRegex, hasHeadTrackers ? `${bodySnippet}\n` : '');
  } else if (hasHeadTrackers) {
    if (/<body[\s>]/i.test(content)) {
      content = content.replace(/(<body[\s>][^>]*>)/i, `$1\n${bodySnippet}`);
    }
  }

  // 3. Runtime script replacement or injection
  const runtimeMarkerRegex = new RegExp(`${RUNTIME_START_MARKER}[\\s\\S]*?${RUNTIME_END_MARKER}`, 'g');
  if (runtimeMarkerRegex.test(content)) {
    content = content.replace(runtimeMarkerRegex, runtimeSnippet);
  } else if (/<\/body>/i.test(content)) {
    content = content.replace(/<\/body>/i, `${runtimeSnippet}\n</body>`);
  } else {
    content += `\n${runtimeSnippet}`;
  }

  // 4. Form tag attribute injection (adds data-buzl-track="true" to forms if missing)
  content = content.replace(/<form\b(?![^>]*\bdata-buzl-)([^>]*)>/gi, (match, p1) => {
    return `<form data-buzl-track="true"${p1}>`;
  });

  return content;
}

/**
 * Apply injection across the whole project
 */
function applyInjection(rootDir, htmlFiles, config) {
  // If whatsapp number is not explicitly configured, fallback to auto-detected number from buttons
  if (!config.whatsappNumber && !(config.whatsapp && config.whatsapp.number)) {
    try {
      const { scanProject } = require('./scanner');
      const scan = scanProject(rootDir);
      if (scan && scan.detectedWhatsapp) {
        config = Object.assign({}, config, {
          whatsappNumber: scan.detectedWhatsapp,
          whatsapp: Object.assign({}, config.whatsapp || {}, { number: scan.detectedWhatsapp, autoDetected: true })
        });
      }
    } catch (e) {}
  }

  // 1. Ensure backup first
  const backup = createBackup(htmlFiles, rootDir);

  // 2. Deploy runtime SDK script into assets/js/
  const targetJsDir = path.join(rootDir, 'assets', 'js');
  fs.mkdirSync(targetJsDir, { recursive: true });

  const sdkSourcePath = path.join(__dirname, '..', 'templates', 'buzl-tracking.js');
  const sdkDestPath = path.join(targetJsDir, 'buzl-tracking.js');
  fs.copyFileSync(sdkSourcePath, sdkDestPath);

  // 3. Deploy GoogleAppsScript.gs to root or reference folder
  const gsSource = path.join(__dirname, '..', 'templates', 'GoogleAppsScript.gs');
  const gsDest = path.join(rootDir, 'Buzl_GoogleAppsScript_Template.gs');
  if (!fs.existsSync(gsDest)) {
    fs.copyFileSync(gsSource, gsDest);
  }

  // 4. Process each HTML file
  const modifiedFiles = [];
  for (const filePath of htmlFiles) {
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    // Calculate relative path to assets/js/buzl-tracking.js
    let scriptRelPath = 'assets/js/buzl-tracking.js';
    if (config && config.pathMode === 'root-absolute') {
      scriptRelPath = '/assets/js/buzl-tracking.js';
    } else {
      const relToTarget = path.relative(path.dirname(filePath), targetJsDir).replace(/\\/g, '/');
      scriptRelPath = relToTarget ? `${relToTarget}/buzl-tracking.js` : 'assets/js/buzl-tracking.js';
    }

    const modifiedHtml = injectHtml(originalHtml, config, scriptRelPath);
    fs.writeFileSync(filePath, modifiedHtml, 'utf8');
    modifiedFiles.push({
      path: filePath,
      relative: path.relative(rootDir, filePath).replace(/\\/g, '/')
    });
  }

  return {
    success: true,
    backupDir: backup.backupDir,
    modifiedFiles,
    runtimeScript: path.relative(rootDir, sdkDestPath),
    googleAppsScriptFile: path.relative(rootDir, gsDest)
  };
}

/**
 * Cleanly remove all Buzl tracking tags and restore pristine HTML files
 */
function removeTracking(rootDir, htmlFiles) {
  if (!htmlFiles || !Array.isArray(htmlFiles)) {
    const { findHtmlFiles } = require('./scanner');
    htmlFiles = findHtmlFiles(rootDir);
  }

  // 1. Create a named safety backup before removal
  const backup = createBackup(htmlFiles, rootDir, 'Pre-Uninstall Clean Backup');

  const headMarkerRegex = new RegExp(`[\\t ]*${HEAD_START_MARKER}[\\s\\S]*?${HEAD_END_MARKER}\\r?\\n?`, 'g');
  const bodyMarkerRegex = new RegExp(`[\\t ]*${BODY_START_MARKER}[\\s\\S]*?${BODY_END_MARKER}\\r?\\n?`, 'g');
  const runtimeMarkerRegex = new RegExp(`[\\t ]*${RUNTIME_START_MARKER}[\\s\\S]*?${RUNTIME_END_MARKER}\\r?\\n?`, 'g');

  const cleanedFiles = [];

  for (const filePath of htmlFiles) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Strip markers
    content = content.replace(headMarkerRegex, '');
    content = content.replace(bodyMarkerRegex, '');
    content = content.replace(runtimeMarkerRegex, '');

    // Strip data-buzl-track="true" attribute from forms
    content = content.replace(/\s*data-buzl-track=["']true["']/gi, '');

    // Clean up any double blank lines before </head> or </body>
    content = content.replace(/(\r?\n\s*){2,}<\/head>/i, '\n</head>');
    content = content.replace(/(\r?\n\s*){2,}<\/body>/i, '\n</body>');

    fs.writeFileSync(filePath, content, 'utf8');
    cleanedFiles.push({
      path: filePath,
      relative: path.relative(rootDir, filePath)
    });
  }

  return {
    success: true,
    backupDir: backup.backupDir,
    cleanedFiles,
    message: `Successfully removed all tracking from ${cleanedFiles.length} file(s). Clean safety backup saved in ${path.basename(backup.backupDir)}.`
  };
}

/**
 * Selectively remove a single tracking service or configuration without breaking other services
 */
function removeService(rootDir, serviceName) {
  const normService = (serviceName || '').toLowerCase().trim();
  const { scanProject } = require('./scanner');
  const scan = scanProject(rootDir);
  const htmlFiles = scan.files.map(f => f.filePath);

  if (htmlFiles.length === 0) {
    return { success: false, message: 'No HTML files found in project.' };
  }

  // If full uninstall requested
  if (normService === 'all' || normService === 'everything') {
    return removeTracking(rootDir, htmlFiles);
  }

  // 1. Create safety snapshot backup before selective removal
  const backup = createBackup(htmlFiles, rootDir, `Pre-Remove ${normService.toUpperCase()} Backup`);

  // 2. Derive new configuration by blanking the selected service
  const current = scan.existingConfig || {};
  const newConfig = {
    gtmId: normService === 'gtm' ? '' : (current.gtmId || (normService !== 'gtm' && scan.liveState.gtm.id) || ''),
    enableDeferred: current.enableDeferred !== false,
    metaPixelId: normService === 'meta' ? '' : (current.metaPixelId || (normService !== 'meta' && scan.liveState.meta.id) || ''),
    trackMetaLeadEvent: normService === 'meta' ? false : !!current.trackMetaLeadEvent,
    googleSheetUrl: normService === 'sheets' ? '' : (current.googleSheetUrl || ''),
    siteLocation: current.siteLocation || scan.detectedLocation || '',
    dynamicFields: current.dynamicFields || [],
    buzlCapi: {
      endpoint: normService === 'capi' ? '' : ((current.buzlCapi && current.buzlCapi.endpoint) || ''),
      authUser: normService === 'capi' ? '' : ((current.buzlCapi && current.buzlCapi.authUser) || ''),
      authPass: normService === 'capi' ? '' : ((current.buzlCapi && current.buzlCapi.authPass) || '')
    },
    zoho: {
      endpoint: normService === 'zoho' ? '' : ((current.zoho && current.zoho.endpoint) || ''),
      xnQsjsdp: normService === 'zoho' ? '' : ((current.zoho && current.zoho.xnQsjsdp) || ''),
      xmIwtLD: normService === 'zoho' ? '' : ((current.zoho && current.zoho.xmIwtLD) || ''),
      fields: normService === 'zoho' ? {} : ((current.zoho && current.zoho.fields) || {})
    },
    whatsappNumber: normService === 'whatsapp' ? '' : (current.whatsappNumber || (current.whatsapp && current.whatsapp.number) || '')
  };

  // 3. Inject updated HTML files
  const targetJsDir = path.join(rootDir, 'assets', 'js');
  const modifiedFiles = [];

  for (const filePath of htmlFiles) {
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    let scriptRelPath = 'assets/js/buzl-tracking.js';
    if (current && current.pathMode === 'root-absolute') {
      scriptRelPath = '/assets/js/buzl-tracking.js';
    } else {
      const relToTarget = path.relative(path.dirname(filePath), targetJsDir).replace(/\\/g, '/');
      scriptRelPath = relToTarget ? `${relToTarget}/buzl-tracking.js` : 'assets/js/buzl-tracking.js';
    }

    const modifiedHtml = injectHtml(originalHtml, newConfig, scriptRelPath);
    fs.writeFileSync(filePath, modifiedHtml, 'utf8');
    modifiedFiles.push({
      path: filePath,
      relative: path.relative(rootDir, filePath).replace(/\\/g, '/')
    });
  }

  const serviceLabels = {
    gtm: 'Google Tag Manager (GTM)',
    meta: 'Meta Pixel & Client CAPI',
    capi: 'Buzl CAPI Server-Side Endpoint',
    sheets: 'Google Sheets Direct Sync',
    zoho: 'Zoho CRM Web-to-Lead',
    whatsapp: 'WhatsApp Handoff'
  };

  return {
    success: true,
    service: normService,
    serviceLabel: serviceLabels[normService] || normService,
    backupDir: backup.backupDir,
    modifiedFiles,
    message: `Successfully removed ${serviceLabels[normService] || normService} from site. Clean safety backup saved in ${path.basename(backup.backupDir)}.`
  };
}

module.exports = {
  injectHtml,
  applyInjection,
  removeTracking,
  removeService
};
