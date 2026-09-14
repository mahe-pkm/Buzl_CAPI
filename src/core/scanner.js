/**
 * HTML, Form & Site Location Scanner
 * Scans directories recursively to discover HTML files, existing tags, form fields, and site location
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORED_DIRS = [
  'node_modules',
  '.git',
  '.github',
  'Dev_CAPi',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'vendor',
  'partials',
  'includes',
  'components'
];

/**
 * Recursively find all HTML files
 */
function findHtmlFiles(dir, ignoredDirs = DEFAULT_IGNORED_DIRS) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat && stat.isDirectory()) {
        if (file.startsWith('.buzl-backup') || ignoredDirs.includes(file)) {
          continue;
        }
        results = results.concat(findHtmlFiles(fullPath, ignoredDirs));
      } else if (file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`[Scanner] Error reading directory ${dir}:`, err.message);
  }
  return results;
}

/**
 * Sanitize and normalize WhatsApp phone numbers to international digits format
 */
function sanitizeWhatsappNumber(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  // If 10 digits starting with [6-9] (Indian mobile like 9591318811), prepend country code 91
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return '91' + digits;
  }
  // If 11 digits starting with 0, replace 0 with 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.slice(1);
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return digits;
}

/**
 * Extract WhatsApp numbers from markup strings or attributes
 */
function extractWhatsappFromText(text) {
  if (!text) return null;
  // 1. wa.me/919591318811
  const waMeMatch = text.match(/wa\.me\/(\+?\d+)/i);
  if (waMeMatch) return sanitizeWhatsappNumber(waMeMatch[1]);

  // 2. api.whatsapp.com/send?phone=919591318811
  const apiMatch = text.match(/api\.whatsapp\.com\/send\?[^"'>]*phone=(\+?\d+)/i);
  if (apiMatch) return sanitizeWhatsappNumber(apiMatch[1]);

  // 3. data-whatsapp="919591318811" or data-wa, data-phone, data-number, data-buzl-wa
  const dataAttrMatch = text.match(/data-(?:whatsapp|wa|phone|number|buzl-wa)=["'](\+?\d+)["']/i);
  if (dataAttrMatch) return sanitizeWhatsappNumber(dataAttrMatch[1]);

  // 4. tel:+919591318811
  const telMatch = text.match(/href=["']tel:(\+?\d+)["']/i);
  if (telMatch) return sanitizeWhatsappNumber(telMatch[1]);

  // 5. JS variable like WA_NUMBER = '919591318811'
  const jsVarMatch = text.match(/(?:WA_NUMBER|waNumber|whatsapp_number)\s*=\s*["'](\+?\d+)["']/i);
  if (jsVarMatch) return sanitizeWhatsappNumber(jsVarMatch[1]);

  return null;
}

/**
 * Auto-detect site location from metadata or markup
 */
function detectSiteLocation(rootDir, htmlContent = '') {
  // 1. Check website_context.json
  const ctxPath = path.join(rootDir, 'website_context.json');
  if (fs.existsSync(ctxPath)) {
    try {
      const ctx = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
      if (ctx.address) {
        // Extract area and city from address (e.g. "Sahakar Nagar, Byatarayanapura, Bengaluru")
        const parts = ctx.address.split(',').map(s => s.trim()).filter(s => !s.toLowerCase().includes('floor') && !/\d{6}/.test(s));
        if (parts.length >= 2) {
          return parts.slice(-3).join(', ');
        }
        return ctx.address;
      }
      if (ctx.location) return ctx.location;
      if (ctx.city) return ctx.city;
    } catch (e) {}
  }

  // 2. Check assets/data/business.json
  const bizPath = path.join(rootDir, 'assets', 'data', 'business.json');
  if (fs.existsSync(bizPath)) {
    try {
      const biz = JSON.parse(fs.readFileSync(bizPath, 'utf8'));
      if (biz.location) return biz.location;
      if (biz.address) {
        if (biz.address.area && biz.address.city) return `${biz.address.area}, ${biz.address.city}`;
        if (biz.address.city) return biz.address.city;
      }
    } catch (e) {}
  }

  // 3. Scan HTML for <address> or hero kicker text
  if (htmlContent) {
    const kickerM = htmlContent.match(/class=["'][^"']*(?:hero__kicker|kicker)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    if (kickerM) {
      const plain = kickerM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain && plain.length < 100) return plain;
    }
    const addrM = htmlContent.match(/<address\b[^>]*>([\s\S]*?)<\/address>/i);
    if (addrM) {
      const plain = addrM[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain && plain.length < 120) return plain;
    }
  }

  return 'Bengaluru';
}

/**
 * Analyze a single HTML file for head, body, forms, inputs in order
 */
function analyzeHtmlFile(filePath, rootDir = null) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = rootDir ? path.relative(rootDir, filePath).replace(/\\/g, '/') : path.basename(filePath);

  const hasHead = /<head[\s>]/i.test(content);
  const hasBody = /<body[\s>]/i.test(content);

  // Check existing tracking tags
  const hasGTM = /googletagmanager\.com/i.test(content) || /GTM-[A-Z0-9]+/i.test(content);
  const hasMeta = /connect\.facebook\.net/i.test(content) || /fbq\(/i.test(content);
  const hasBuzl = /buzl-tracking/i.test(content) || /BuzlTracker/i.test(content) || /BUZL_TRACKING_/i.test(content);

  // Extract existing IDs if present
  const gtmMatch = content.match(/GTM-[A-Z0-9]+/i);
  const existingGtmId = gtmMatch ? gtmMatch[0] : null;

  const metaMatch = content.match(/fbq\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i);
  const existingMetaPixelId = metaMatch ? metaMatch[1] : null;

  // Extract existing Buzl configuration if previously injected
  let existingConfig = null;
  const configMatch = content.match(/window\.__BUZL_CONFIG__\s*=\s*(\{[\s\S]*?\});/);
  if (configMatch) {
    try {
      existingConfig = JSON.parse(configMatch[1]);
    } catch (e) {}
  }

  // Detect forms and inputs in exact DOM order
  const forms = [];
  const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let match;

  while ((match = formRegex.exec(content)) !== null) {
    const formAttrs = match[1] || '';
    const formInner = match[2] || '';

    const idMatch = formAttrs.match(/id=['"]([^'"]+)['"]/i);
    const actionMatch = formAttrs.match(/action=['"]([^'"]+)['"]/i);
    const formId = idMatch ? idMatch[1] : `form_${forms.length + 1}`;
    const action = actionMatch ? actionMatch[1] : '';

    // Extract all interactive form elements in DOM order: <input>, <select>, <textarea>
    const inputs = [];
    const elemRegex = /<(input|select|textarea)\b([^>]*)>/gi;
    let elemMatch;

    while ((elemMatch = elemRegex.exec(formInner)) !== null) {
      const tag = elemMatch[1].toLowerCase();
      const attrs = elemMatch[2];

      const nameM = attrs.match(/name=['"]([^'"]+)['"]/i);
      const typeM = attrs.match(/type=['"]([^'"]+)['"]/i);
      const idM = attrs.match(/id=['"]([^'"]+)['"]/i);

      const type = typeM ? typeM[1].toLowerCase() : (tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : 'text');
      if (['submit', 'button', 'reset', 'hidden'].includes(type)) continue;

      const name = nameM ? nameM[1] : (idM ? idM[1] : '');
      if (name) {
        inputs.push({
          tag,
          name,
          type,
          id: idM ? idM[1] : ''
        });
      }
    }

    // Inspect form and its submit buttons for WhatsApp number
    let detectedWhatsapp = extractWhatsappFromText(formAttrs);

    if (!detectedWhatsapp) {
      const btnRegex = /<(button|input|a)\b([^>]*)>([\s\S]*?)<\/\1>|<(input)\b([^>]*)>/gi;
      let btnM;
      while ((btnM = btnRegex.exec(formInner)) !== null) {
        const btnAttrs = btnM[2] || btnM[5] || '';
        const num = extractWhatsappFromText(btnAttrs);
        if (num) {
          detectedWhatsapp = num;
          break;
        }
        if (btnAttrs.includes('type="hidden"') && /name=["'](?:whatsapp|wa|phone_to)["']/i.test(btnAttrs)) {
          const valM = btnAttrs.match(/value=["'](\+?\d+)["']/i);
          if (valM) {
            detectedWhatsapp = sanitizeWhatsappNumber(valM[1]);
            break;
          }
        }
      }
    }

    forms.push({
      id: formId,
      action: action,
      inputCount: inputs.length,
      inputs: inputs,
      detectedWhatsapp: detectedWhatsapp || null
    });
  }

  // Collect all WhatsApp numbers across the page (buttons, links, floating CTAs, script vars)
  const detectedWhatsappNumbers = [];
  const waRegex = /(?:wa\.me\/|api\.whatsapp\.com\/send\?[^"'>]*phone=|data-(?:whatsapp|wa|phone|buzl-wa)=["']|href=["']tel:)(\+?\d+)/gi;
  let waM;
  while ((waM = waRegex.exec(content)) !== null) {
    const cleanNum = sanitizeWhatsappNumber(waM[1]);
    if (cleanNum && !detectedWhatsappNumbers.includes(cleanNum)) {
      detectedWhatsappNumbers.push(cleanNum);
    }
  }

  const jsWaRegex = /(?:WA_NUMBER|waNumber|whatsapp_number)\s*=\s*["'](\+?\d+)["']/gi;
  while ((waM = jsWaRegex.exec(content)) !== null) {
    const cleanNum = sanitizeWhatsappNumber(waM[1]);
    if (cleanNum && !detectedWhatsappNumbers.includes(cleanNum)) {
      detectedWhatsappNumbers.push(cleanNum);
    }
  }

  // If a form didn't have an explicit button number, associate the page's detected number as fallback
  if (detectedWhatsappNumbers.length > 0) {
    forms.forEach(f => {
      if (!f.detectedWhatsapp) {
        f.detectedWhatsapp = detectedWhatsappNumbers[0];
      }
    });
  }

  return {
    filePath,
    relativePath,
    hasHead,
    hasBody,
    hasGTM,
    existingGtmId,
    hasMeta,
    existingMetaPixelId,
    existingConfig,
    hasBuzl,
    forms,
    detectedWhatsappNumbers,
    content
  };
}

/**
 * Scan entire project directory
 */
function scanProject(rootDir) {
  const htmlFiles = findHtmlFiles(rootDir);
  const analyzedFiles = htmlFiles.map(f => analyzeHtmlFile(f, rootDir));

  const totalForms = analyzedFiles.reduce((acc, f) => acc + f.forms.length, 0);
  const filesWithGtm = analyzedFiles.filter(f => f.hasGTM).length;
  const filesWithMeta = analyzedFiles.filter(f => f.hasMeta).length;

  // Collect unique form fields in order of discovery
  const uniqueFields = [];
  const fieldSet = new Set();

  analyzedFiles.forEach(f => {
    f.forms.forEach(form => {
      form.inputs.forEach(input => {
        const lowerName = input.name.toLowerCase();
        if (!fieldSet.has(lowerName)) {
          fieldSet.add(lowerName);
          uniqueFields.push({
            name: input.name,
            type: input.type,
            tag: input.tag,
            isCore: ['name', 'phone', 'location', 'bizname', 'bizphone', 'bizlocation'].includes(lowerName)
          });
        }
      });
    });
  });

  // Detect site location from first HTML file or metadata
  const firstHtmlContent = analyzedFiles.length > 0 ? analyzedFiles[0].content : '';
  const detectedLocation = detectSiteLocation(rootDir, firstHtmlContent);

  // Strip large content strings from final return
  const cleanFiles = analyzedFiles.map(({ content, ...rest }) => rest);

  // Extract first found existingConfig
  const existingConfig = (analyzedFiles.find(f => f.existingConfig && Object.keys(f.existingConfig).length > 0) || {}).existingConfig || null;

  // Compute live state of the site
  const { listBackups } = require('./rollback');
  const backups = listBackups(rootDir);

  const gtmId = analyzedFiles.find(f => f.existingGtmId)?.existingGtmId || (existingConfig && existingConfig.gtmId) || null;
  const metaPixelId = analyzedFiles.find(f => f.existingMetaPixelId)?.existingMetaPixelId || (existingConfig && existingConfig.metaPixelId) || null;

  const capiCfg = existingConfig && existingConfig.buzlCapi;
  const hasCapi = !!(capiCfg && capiCfg.endpoint && capiCfg.authUser);

  const sheetUrl = existingConfig && existingConfig.googleSheetUrl;
  const hasSheets = !!(sheetUrl && sheetUrl.trim().length > 0);

  const zohoCfg = existingConfig && existingConfig.zoho;
  const hasZoho = !!(zohoCfg && zohoCfg.xnQsjsdp && zohoCfg.xnQsjsdp.trim().length > 0);

  const waCfg = existingConfig && existingConfig.whatsapp;
  const hasWhatsapp = !!(waCfg && waCfg.number);

  // Aggregate detected WhatsApp numbers across all forms & page buttons
  const waCountMap = new Map();
  analyzedFiles.forEach(f => {
    f.forms.forEach(form => {
      if (form.detectedWhatsapp) {
        waCountMap.set(form.detectedWhatsapp, (waCountMap.get(form.detectedWhatsapp) || 0) + 1);
      }
    });
    (f.detectedWhatsappNumbers || []).forEach(num => {
      waCountMap.set(num, (waCountMap.get(num) || 0) + 1);
    });
  });

  let detectedWhatsapp = null;
  let maxCount = 0;
  for (const [num, count] of waCountMap.entries()) {
    if (count > maxCount) {
      maxCount = count;
      detectedWhatsapp = num;
    }
  }

  // Collect all forms across files with detailed identifiers & archetype grouping
  const allDiscoveredForms = [];
  const formSignatureMap = new Map();

  analyzedFiles.forEach(f => {
    f.forms.forEach((form, idx) => {
      const selector = form.id.startsWith('form_') ? `form:nth-of-type(${idx + 1})` : `#${form.id}`;
      const inputNames = form.inputs.map(i => i.name).sort().join('|');
      const signature = `${form.id}::${inputNames}`;

      if (!formSignatureMap.has(signature)) {
        formSignatureMap.set(signature, {
          formId: form.id,
          selector: selector,
          action: form.action,
          inputs: form.inputs,
          inputCount: form.inputs.length,
          detectedWhatsapp: form.detectedWhatsapp || detectedWhatsapp || null,
          pages: [f.relativePath],
          isShared: false
        });
      } else {
        const existing = formSignatureMap.get(signature);
        if (!existing.pages.includes(f.relativePath)) {
          existing.pages.push(f.relativePath);
          existing.isShared = true;
        }
        if (!existing.detectedWhatsapp && form.detectedWhatsapp) {
          existing.detectedWhatsapp = form.detectedWhatsapp;
        }
      }

      allDiscoveredForms.push({
        formId: form.id,
        file: f.relativePath,
        selector: selector,
        action: form.action,
        inputs: form.inputs,
        inputCount: form.inputs.length,
        detectedWhatsapp: form.detectedWhatsapp || detectedWhatsapp || null
      });
    });
  });

  const formArchetypes = Array.from(formSignatureMap.values());
  const directories = Array.from(new Set(cleanFiles.map(f => {
    const dir = path.dirname(f.relativePath).replace(/\\/g, '/');
    return dir === '.' ? '/' : `/${dir}`;
  }))).sort();

  const liveState = {
    gtm: { active: !!gtmId, id: gtmId },
    meta: { active: !!metaPixelId, id: metaPixelId },
    buzlCapi: {
      active: hasCapi,
      endpoint: (capiCfg && capiCfg.endpoint) || '',
      authUser: (capiCfg && capiCfg.authUser) || ''
    },
    googleSheets: { active: hasSheets, url: sheetUrl || '' },
    zoho: { active: hasZoho, endpoint: (zohoCfg && zohoCfg.endpoint) || '', xnQsjsdp: (zohoCfg && zohoCfg.xnQsjsdp) || '' },
    whatsapp: {
      active: hasWhatsapp,
      number: (waCfg && waCfg.number) || '',
      detectedNumber: detectedWhatsapp || ''
    },
    forms: allDiscoveredForms,
    formArchetypes: formArchetypes,
    directories: directories,
    backups: backups.map(b => ({
      dirName: b.dirName,
      name: b.name,
      timestamp: b.timestamp,
      filesCount: b.filesCount
    }))
  };

  return {
    rootDir,
    totalHtmlFiles: htmlFiles.length,
    files: cleanFiles,
    totalForms,
    totalUniqueForms: formArchetypes.length,
    directories,
    filesWithGtm,
    filesWithMeta,
    uniqueFields,
    detectedLocation,
    detectedWhatsapp,
    existingConfig,
    liveState,
    forms: allDiscoveredForms,
    formArchetypes: formArchetypes,
    backups: liveState.backups
  };
}

module.exports = {
  findHtmlFiles,
  analyzeHtmlFile,
  detectSiteLocation,
  scanProject
};
