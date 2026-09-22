/**
 * =========================================================================
 * BUZL MULTI-TAB CRM & FORM DISPATCHER SCRIPT
 * Google Apps Script Web App & Automated Sheet CRM Engine
 * =========================================================================
 * 
 * FEATURES:
 * 1. 'All Leads' (Master Sheet): Inbound leads insert at Row 2 (Top of sheet).
 * 2. Standard 15-Column CRM Layout: Name, Location, Phone, Lead Stage, Event Time, Is Qualified, Qualified Date, Is Spam, Handled By, Comments, Action Source, Source, UTM Source, UTM Campaign, Lead ID.
 * 3. Universal Fuzzy Matcher: Case-insensitive & whitespace-tolerant header mapping.
 * 4. Official Buzl Navy Header: #1E4E9E background with bold white text (#FFFFFF).
 * 5. Full-Row Highlighting: Entire rows (A:Z) color-coded by Lead Stage (LOWER formula).
 * 6. Global Time & 12-Hour Format: 'dd-MMM-yyyy hh:mm a' with dynamic timezone.
 * 7. Colored Sheet Tabs: Bottom tabs styled with high-contrast CRM colors.
 * 8. Clean Team Tabs: Placed at the very end; auto-deleted when rep has 0 leads.
 * 9. Shift-Proof INDIRECT Formulas: Sub-tabs never break when rows insert at top.
 * 10. '⚡ Buzl Lead CRM' Top Menu: 1-click management, upgrades, and newest-first sorting.
 * =========================================================================
 */

// Core column definitions
var MASTER_SHEET_NAME = 'All Leads';
var STATUS_TABS = ['New', 'Contacted', 'Qualified', 'Converted', 'Spam', 'Test'];
// Configurable Team Members (Leave empty [] to discover reps dynamically from sheet entries)
var DEFAULT_TEAM_MEMBERS = [];

// Standard 15-Column CRM Layout
var STANDARD_CRM_COLUMNS = [
  'Lead Stage',
  'Event Time',
  'Is Qualified',
  'Qualified Date',
  'Is Spam',
  'Handled By',
  'Comments',
  'Action Source',
  'Source',
  'UTM Source',
  'UTM Campaign',
  'Lead ID'
];

var TAB_COLORS = {
  'All Leads': '#1E293B',   // Deep Charcoal / Slate
  'New': '#0284C7',         // Ocean Blue
  'Contacted': '#D97706',   // Warm Amber
  'Qualified': '#16A34A',   // Emerald Green
  'Converted': '#9333EA',   // Royal Purple
  'Spam': '#DC2626',        // Crimson Red
  'Test': '#64748B'         // Cool Slate Gray
};

var COLUMN_ALIASES = {
  name: ['Name', 'Full Name', 'Patient Name', 'Client Name', 'Customer'],
  location: ['Location', 'City', 'Address', 'Branch', 'Site Location'],
  phone: ['Phone', 'Mobile', 'Contact', 'Tel', 'WhatsApp'],
  email: ['Email', 'E-mail', 'Mail'],
  service: ['Service', 'Treatment', 'Inquiry', 'Department', 'Specialty'],
  leadStage: ['Lead Stage', 'Lead stage', 'Stage', 'Status', 'Lead Status'],
  handledBy: ['Handled By', 'Handled by', 'handledby', 'Rep', 'Assigned To', 'Doctor', 'Staff'],
  comments: ['Comments', 'Comment', 'Notes', 'Note', 'Remarks', 'Call Notes'],
  isQualified: ['Is Qualified', 'Qualified', 'Qualified?'],
  qualifiedDate: ['Qualified Date', 'Qualification Date', 'Date Qualified'],
  isSpam: ['Is Spam', 'Spam', 'Spam?'],
  eventTime: ['Event Time', 'Timestamp', 'Date', 'Time', 'Created At'],
  actionSource: ['Action Source', 'ActionSource', 'Source Type'],
  source: ['Source', 'Source / Form', 'Form', 'Page', 'Source/Form'],
  utmSource: ['UTM Source', 'utm_source'],
  utmCampaign: ['UTM Campaign', 'utm_campaign'],
  leadId: ['Lead ID', 'lead_id', 'leadId', 'ID']
};

/**
 * Universal Case-Insensitive Header Index Matcher
 */
function findHeaderIndex(headers, aliases) {
  if (!headers || !headers.length) return -1;
  for (var i = 0; i < headers.length; i++) {
    var clean = (headers[i] || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    for (var a = 0; a < aliases.length; a++) {
      var aliasClean = aliases[a].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === aliasClean) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Main Webhook Receiver
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateMasterSheet(ss);
    var tz = getSpreadsheetTz(ss);

    // Parse incoming payload
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    var contact = data.contact || {};
    var rawFields = data.rawFields || data.rawPayload || {};
    var utm = data.utm || {};

    // 1. Core Contact Fields
    var name = data.name || contact.name || data.bizName || rawFields.name || rawFields.fullName || '';
    var phone = data.phone || contact.phone || data.bizPhone || rawFields.phone || rawFields.mobile || '';
    var location = data.location || contact.location || data.bizLocation || data.siteLocation || rawFields.location || rawFields.city || '';
    var email = data.email || contact.email || rawFields.email || '';

    // 2. Dynamic Inquiry Fields (next to Phone)
    var excludedKeys = [
      'name', 'bizname', 'fullname', 'phone', 'bizphone', 'mobile',
      'location', 'bizlocation', 'city', 'leadid', 'timestamp', 'utm',
      'rawfields', 'rawpayload', 'contact', 'source', 'actionsource',
      'sitelocation', 'eventsourceurl', 'useragent', 'fbclid', 'fbc',
      'fbp', 'leadstage', 'isqualified', 'qualifieddate', 'isspam',
      'handledby', 'comments', 'istest', 'email', 'eventtime'
    ];
    var dynamicFields = {};

    for (var k in rawFields) {
      if (excludedKeys.indexOf(k.toLowerCase()) === -1 && typeof rawFields[k] !== 'object' && rawFields[k] !== '') {
        dynamicFields[capitalize(k)] = rawFields[k];
      }
    }
    for (var dk in data) {
      if (excludedKeys.indexOf(dk.toLowerCase()) === -1 && typeof data[dk] !== 'object' && data[dk] !== '') {
        var cleanDk = capitalize(dk);
        if (!dynamicFields[cleanDk]) dynamicFields[cleanDk] = data[dk];
      }
    }

    // Default 'Service' if discovered in source
    if (Object.keys(dynamicFields).length === 0 && data.source && data.source !== 'Website Form') {
      dynamicFields['Service'] = data.source;
    }

    // 3. Status & CRM Fields (12-Hour Format: dd-MMM-yyyy hh:mm a)
    var leadDate = new Date();
    if (data.timestamp || data.eventTime) {
      var candidate = new Date(data.timestamp || data.eventTime);
      if (!isNaN(candidate.getTime())) leadDate = candidate;
    }
    var timestamp = Utilities.formatDate(leadDate, tz, "dd-MMM-yyyy hh:mm a");

    var isTestSubmission = data.isTest === true || (rawFields && rawFields.isTest === true) || (utm.source && utm.source.toString().indexOf('test') !== -1);
    var leadStage = isTestSubmission ? 'Test' : (data.leadStage || 'New');
    var isQualified = data.isQualified || 'No';
    var qualifiedDate = data.qualifiedDate || '';
    if (leadStage === 'Qualified' && !qualifiedDate) {
      qualifiedDate = Utilities.formatDate(leadDate, tz, "dd-MMM-yyyy");
    }
    var isSpam = data.isSpam || 'No';

    // Clean 'Rep - ' from Handled By if present
    var rawHandledBy = data.handledBy || '';
    var handledBy = rawHandledBy.replace(/^rep\s*[-:]?\s*/i, '').trim();

    var comments = data.comments || '';
    var actionSource = data.actionSource || 'website';
    var source = data.source || data.formName || data.formId || 'Website Form';
    var utmSource = utm.source || data.utm_source || '';
    var utmCampaign = utm.campaign || data.utm_campaign || '';
    var leadId = data.leadId || data.event_id || data.buzl_lead_id || ('lead-' + Date.now());

    // 4. Ensure Form-First CRM Layout & Auto-Migrate Legacy Columns if present
    var headers = ensureCrmLayout(sheet, dynamicFields, false);

    // 5. Build New Lead Row
    var rowData = [];
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      var cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (cleanH === 'name') rowData.push(name);
      else if (cleanH === 'location') rowData.push(location);
      else if (cleanH === 'phone') rowData.push(phone);
      else if (cleanH === 'email') rowData.push(email);
      else if (cleanH === 'leadstage') rowData.push(leadStage);
      else if (cleanH === 'handledby') rowData.push(handledBy);
      else if (cleanH === 'comments') rowData.push(comments);
      else if (cleanH === 'isqualified') rowData.push(isQualified);
      else if (cleanH === 'qualifieddate') rowData.push(qualifiedDate);
      else if (cleanH === 'isspam') rowData.push(isSpam);
      else if (cleanH === 'eventtime') rowData.push(timestamp);
      else if (cleanH === 'actionsource') rowData.push(actionSource);
      else if (cleanH === 'source' || cleanH === 'sourceform') rowData.push(source);
      else if (cleanH === 'utmsource') rowData.push(utmSource);
      else if (cleanH === 'utmcampaign') rowData.push(utmCampaign);
      else if (cleanH === 'leadid') rowData.push(leadId);
      else if (dynamicFields[h] !== undefined) rowData.push(dynamicFields[h]);
      else rowData.push('');
    }

    // Insert at Row 2 (Top of Sheet, below header)
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
    sheet.getRange(2, 1, 1, rowData.length).setFontWeight('normal');
    var insertedRowIndex = 2;

    // 6. Ensure Dropdowns, Formatting, Number Formats, and Sub-Tabs exist
    applyDropdownValidations(sheet, headers, insertedRowIndex);
    applyDateFormatting(sheet, headers, insertedRowIndex);
    applyColorCoding(sheet, headers);
    initializeCrmTabs(ss, headers);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Lead recorded at top of CRM sheet',
      leadId: leadId,
      row: insertedRowIndex
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var tz = 'UTC';
  try { tz = getSpreadsheetTz(SpreadsheetApp.getActiveSpreadsheet()); } catch (err) {}
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    service: 'Buzl Multi-Tab CRM Sync Web App',
    timestamp: Utilities.formatDate(new Date(), tz, "dd-MMM-yyyy hh:mm:ss a")
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get active spreadsheet timezone safely
 */
function getSpreadsheetTz(ss) {
  try {
    if (ss && ss.getSpreadsheetTimeZone) {
      var tz = ss.getSpreadsheetTimeZone();
      if (tz) return tz;
    }
    return Session.getScriptTimeZone() || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

/**
 * Format Header Row 1 with official Buzl Navy Blue and crisp white text
 */
function formatHeaderRow(sheet, numCols) {
  if (!numCols || numCols < 1) numCols = sheet.getLastColumn() || 1;
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setFontWeight('bold')
    .setBackground('#1E4E9E')
    .setFontColor('#FFFFFF')
    .setFontSize(10)
    .setVerticalAlignment('middle');
  try {
    sheet.setRowHeight(1, 32);
  } catch (e) {}
  sheet.setFrozenRows(1);
}

/**
 * Ensure Master Sheet is named 'All Leads'
 */
function getOrCreateMasterSheet(ss) {
  var sheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!sheet) {
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var sName = allSheets[s].getName();
      if (STATUS_TABS.indexOf(sName) === -1 && sName.indexOf('Rep -') !== 0) {
        try {
          allSheets[s].setName(MASTER_SHEET_NAME);
          sheet = allSheets[s];
          break;
        } catch (e) {}
      }
    }
    if (!sheet) {
      sheet = ss.insertSheet(MASTER_SHEET_NAME, 0);
    }
  }
  try {
    sheet.setTabColor(TAB_COLORS['All Leads']);
  } catch (e) {}
  return sheet;
}

/**
 * Ensure Form-First CRM Layout & Auto-Migrate Legacy Sheets with Resilient Fuzzy Mapping
 */
function ensureCrmLayout(sheet, dynamicFields, forceReorganize) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var tz = getSpreadsheetTz(sheet.getParent());

  // Empty sheet -> Build initial headers
  if (lastRow === 0) {
    var initialHeaders = ['Name', 'Location', 'Phone'];
    if (dynamicFields) {
      for (var df in dynamicFields) {
        if (initialHeaders.indexOf(df) === -1) initialHeaders.push(df);
      }
    }
    initialHeaders = initialHeaders.concat(STANDARD_CRM_COLUMNS);

    sheet.appendRow(initialHeaders);
    formatHeaderRow(sheet, initialHeaders.length);
    applyDateFormatting(sheet, initialHeaders);
    return initialHeaders;
  }

  var allData = sheet.getDataRange().getValues();
  var oldHeaders = allData[0] || [];
  var oldRows = allData.slice(1);

  var leadStageIdx = findHeaderIndex(oldHeaders, COLUMN_ALIASES.leadStage);
  var handledByIdx = findHeaderIndex(oldHeaders, COLUMN_ALIASES.handledBy);
  var commentsIdx = findHeaderIndex(oldHeaders, COLUMN_ALIASES.comments);

  // Determine if column reorganization is needed
  var needsReorganization = forceReorganize === true ||
    leadStageIdx === -1 ||
    handledByIdx === -1 ||
    commentsIdx === -1;

  if (needsReorganization) {
    // 1. Build index mapping for all standard fields
    var idxMap = {};
    for (var key in COLUMN_ALIASES) {
      idxMap[key] = findHeaderIndex(oldHeaders, COLUMN_ALIASES[key]);
    }

    // 2. Build target headers: Name, Location, Phone, [Email if present], [Dynamic fields], [Service if present], Standard CRM Columns
    var targetHeaders = ['Name', 'Location', 'Phone'];
    if (idxMap.email > -1) {
      targetHeaders.push('Email');
    }
    if (dynamicFields) {
      for (var k in dynamicFields) {
        if (targetHeaders.indexOf(k) === -1) targetHeaders.push(k);
      }
    }
    if (idxMap.service > -1 && targetHeaders.indexOf('Service') === -1) {
      targetHeaders.push('Service');
    }
    targetHeaders = targetHeaders.concat(STANDARD_CRM_COLUMNS);

    // 3. Preserve any additional custom columns from old headers
    for (var c = 0; c < oldHeaders.length; c++) {
      var rawH = (oldHeaders[c] || '').toString().trim();
      if (!rawH) continue;
      var matched = false;
      for (var aKey in COLUMN_ALIASES) {
        if (findHeaderIndex([rawH], COLUMN_ALIASES[aKey]) > -1) {
          matched = true;
          break;
        }
      }
      if (!matched && targetHeaders.indexOf(rawH) === -1) {
        targetHeaders.push(rawH);
      }
    }

    // 4. Migrate every existing row into the target columns
    var migratedRows = [];
    for (var r = 0; r < oldRows.length; r++) {
      var oldRow = oldRows[r];

      var rawPayload = {};
      var rawPayloadIdx = -1;
      for (var hi = 0; hi < oldHeaders.length; hi++) {
        if ((oldHeaders[hi] || '').toString().toLowerCase().includes('raw')) {
          rawPayloadIdx = hi;
          break;
        }
      }
      if (rawPayloadIdx > -1 && oldRow[rawPayloadIdx]) {
        try { rawPayload = JSON.parse(oldRow[rawPayloadIdx]); } catch (e) {}
      }

      var rowName = (idxMap.name > -1 ? oldRow[idxMap.name] : '') || rawPayload.name || '';
      var rowLoc = (idxMap.location > -1 ? oldRow[idxMap.location] : '') || rawPayload.location || rawPayload.siteLocation || '';
      var rowPhone = (idxMap.phone > -1 ? oldRow[idxMap.phone] : '') || rawPayload.phone || '';
      var rowEmail = (idxMap.email > -1 ? oldRow[idxMap.email] : '') || rawPayload.email || '';
      var rowService = (idxMap.service > -1 ? oldRow[idxMap.service] : '') || (rawPayload.rawFields && rawPayload.rawFields.service) || rawPayload.service || '';
      var rowStage = (idxMap.leadStage > -1 && oldRow[idxMap.leadStage]) ? oldRow[idxMap.leadStage] : 'New';
      var rowHandledBy = (idxMap.handledBy > -1 ? oldRow[idxMap.handledBy] : '').toString().replace(/^rep\s*[-:]?\s*/i, '').trim();
      var rowComments = idxMap.comments > -1 ? oldRow[idxMap.comments] : '';
      var rowIsQual = idxMap.isQualified > -1 ? (oldRow[idxMap.isQualified] || 'No') : 'No';
      var rowQualDate = idxMap.qualifiedDate > -1 ? oldRow[idxMap.qualifiedDate] : '';
      var rowIsSpam = idxMap.isSpam > -1 ? (oldRow[idxMap.isSpam] || 'No') : 'No';

      var rawTime = (idxMap.eventTime > -1 ? oldRow[idxMap.eventTime] : '') || rawPayload.timestamp;
      var rowDateObj = new Date();
      if (rawTime) {
        var parsed = new Date(rawTime);
        if (!isNaN(parsed.getTime())) rowDateObj = parsed;
      }
      var formattedRowTime = Utilities.formatDate(rowDateObj, tz, "dd-MMM-yyyy hh:mm a");

      var rowAction = (idxMap.actionSource > -1 ? oldRow[idxMap.actionSource] : '') || 'website';
      var rowSource = (idxMap.source > -1 ? oldRow[idxMap.source] : '') || rawPayload.source || 'Website Form';
      var rowUtmSrc = (idxMap.utmSource > -1 ? oldRow[idxMap.utmSource] : '') || (rawPayload.utm && rawPayload.utm.source) || '';
      var rowUtmCmp = (idxMap.utmCampaign > -1 ? oldRow[idxMap.utmCampaign] : '') || (rawPayload.utm && rawPayload.utm.campaign) || '';
      var rowLeadId = (idxMap.leadId > -1 ? oldRow[idxMap.leadId] : '') || rawPayload.leadId || ('lead-' + (r + 1));

      var newRow = [];
      for (var th = 0; th < targetHeaders.length; th++) {
        var tHeader = targetHeaders[th];
        var cleanTH = tHeader.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cleanTH === 'name') newRow.push(rowName);
        else if (cleanTH === 'location') newRow.push(rowLoc);
        else if (cleanTH === 'phone') newRow.push(rowPhone);
        else if (cleanTH === 'email') newRow.push(rowEmail);
        else if (cleanTH === 'service') newRow.push(rowService);
        else if (cleanTH === 'leadstage') newRow.push(rowStage);
        else if (cleanTH === 'handledby') newRow.push(rowHandledBy);
        else if (cleanTH === 'comments') newRow.push(rowComments);
        else if (cleanTH === 'isqualified') newRow.push(rowIsQual);
        else if (cleanTH === 'qualifieddate') newRow.push(rowQualDate);
        else if (cleanTH === 'isspam') newRow.push(rowIsSpam);
        else if (cleanTH === 'eventtime') newRow.push(formattedRowTime);
        else if (cleanTH === 'actionsource') newRow.push(rowAction);
        else if (cleanTH === 'source' || cleanTH === 'sourceform') newRow.push(rowSource);
        else if (cleanTH === 'utmsource') newRow.push(rowUtmSrc);
        else if (cleanTH === 'utmcampaign') newRow.push(rowUtmCmp);
        else if (cleanTH === 'leadid') newRow.push(rowLeadId);
        else {
          var originalIdx = oldHeaders.indexOf(tHeader);
          newRow.push(originalIdx > -1 ? oldRow[originalIdx] : '');
        }
      }
      migratedRows.push(newRow);
    }

    // 5. Clear sheet and write reorganized forward structure
    sheet.clear();
    sheet.appendRow(targetHeaders);
    formatHeaderRow(sheet, targetHeaders.length);

    if (migratedRows.length > 0) {
      sheet.getRange(2, 1, migratedRows.length, targetHeaders.length).setValues(migratedRows);
    }
    applyDateFormatting(sheet, targetHeaders);
    return targetHeaders;
  }

  // Already properly organized: ensure styling and return
  formatHeaderRow(sheet, oldHeaders.length);
  applyDateFormatting(sheet, oldHeaders);
  return oldHeaders;
}

/**
 * Apply native date/time number formats to Event Time & Qualified Date
 */
function applyDateFormatting(sheet, headers, targetRow) {
  var timeCol = findHeaderIndex(headers, COLUMN_ALIASES.eventTime) + 1;
  var qualDateCol = findHeaderIndex(headers, COLUMN_ALIASES.qualifiedDate) + 1;
  var startRow = targetRow || 2;
  var numRows = targetRow ? 1 : Math.max(sheet.getLastRow() - 1, 1000);

  if (timeCol > 0) {
    sheet.getRange(startRow, timeCol, numRows, 1).setNumberFormat('dd-mmm-yyyy hh:mm am/pm');
  }
  if (qualDateCol > 0) {
    sheet.getRange(startRow, qualDateCol, numRows, 1).setNumberFormat('dd-mmm-yyyy');
  }
}

/**
 * Initialize / Update Auto-Filtered Status Tabs with shift-proof INDIRECT formulas
 */
function initializeCrmTabs(ss, headers) {
  var master = getOrCreateMasterSheet(ss);
  if (!headers || headers.length === 0) {
    headers = ensureCrmLayout(master, null, false);
  }

  var lastColLetter = getColLetter(headers.length);
  var stageCol = findHeaderIndex(headers, COLUMN_ALIASES.leadStage) + 1;
  var qualCol = findHeaderIndex(headers, COLUMN_ALIASES.isQualified) + 1;
  var spamCol = findHeaderIndex(headers, COLUMN_ALIASES.isSpam) + 1;

  var stageColLetter = getColLetter(stageCol);
  var qualColLetter = getColLetter(qualCol);
  var spamColLetter = getColLetter(spamCol);

  // Keep master at index 1
  try {
    ss.setActiveSheet(master);
    ss.moveActiveSheet(1);
  } catch (e) {}

  STATUS_TABS.forEach(function (tabName, index) {
    var tab = ss.getSheetByName(tabName);
    if (!tab) {
      tab = ss.insertSheet(tabName);
    }

    // Ensure status tab sequence (tabs 2 through 7)
    try {
      ss.setActiveSheet(tab);
      ss.moveActiveSheet(index + 2);
    } catch (e) {}

    // Tab Color
    if (TAB_COLORS[tabName]) {
      try { tab.setTabColor(TAB_COLORS[tabName]); } catch (e) {}
    }

    // Set Header with official Buzl Navy Blue
    tab.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(tab, headers.length);

    // Clear previous formula contents below row 1 to prevent collision (#REF!)
    var maxRows = Math.max(tab.getLastRow(), 2);
    tab.getRange(2, 1, maxRows, tab.getLastColumn() || headers.length).clearContent();

    // Shift-Proof Dynamic Filter Formula using INDIRECT and case-insensitive LOWER matching
    var formula = '';
    if (tabName === 'New') {
      formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${stageColLetter}2:${stageColLetter}")) = "new"), "No new leads yet")`;
    } else if (tabName === 'Contacted') {
      formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${stageColLetter}2:${stageColLetter}")) = "contacted"), "No contacted leads yet")`;
    } else if (tabName === 'Qualified') {
      formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), (LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${stageColLetter}2:${stageColLetter}")) = "qualified") + (LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${qualColLetter}2:${qualColLetter}")) = "yes")), "No qualified leads yet")`;
    } else if (tabName === 'Converted') {
      formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${stageColLetter}2:${stageColLetter}")) = "converted"), "No converted leads yet")`;
    } else if (tabName === 'Spam') {
      formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), (LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${stageColLetter}2:${stageColLetter}")) = "spam") + (LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${spamColLetter}2:${spamColLetter}")) = "yes")), "No spam leads")`;
    } else if (tabName === 'Test') {
      formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${stageColLetter}2:${stageColLetter}")) = "test"), "No test leads")`;
    }

    if (formula) {
      tab.getRange('A2').setFormula(formula);
    }

    applyColorCoding(tab, headers);
    applyDateFormatting(tab, headers);
    applyDropdownValidations(tab, headers, null, ss);
    applyColumnWidths(tab, headers);
    applyDropdownValidations(tab, headers, null, ss);
    applyColumnWidths(tab, headers);
  });

  // Check, prune, and sync team member tabs at the very end
  syncTeamMemberTabs(ss, headers);
}

/**
 * Dynamic Team Member Tabs: Positioned at the very end; auto-pruned when 0 leads
 */
function syncTeamMemberTabs(ss, headers) {
  var master = getOrCreateMasterSheet(ss);
  if (!headers) {
    headers = master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0];
  }

  var handledByIndex = findHeaderIndex(headers, COLUMN_ALIASES.handledBy);
  if (handledByIndex === -1) return;

  var lastColLetter = getColLetter(headers.length);
  var handledByColLetter = getColLetter(handledByIndex + 1);

  // 1. Calculate active lead counts per team member
  var repCounts = {};
  if (master.getLastRow() >= 2) {
    var values = master.getRange(2, handledByIndex + 1, master.getLastRow() - 1, 1).getValues();
    values.forEach(function (row) {
      var rawVal = (row[0] || '').toString().trim();
      if (rawVal && rawVal !== '') {
        var cleanVal = rawVal.replace(/^rep\s*[-:]?\s*/i, '').trim();
        if (cleanVal) {
          repCounts[cleanVal] = (repCounts[cleanVal] || 0) + 1;
        }
      }
    });
  }

  // 2. Auto-Prune: Delete any team tabs for reps who now have 0 leads
  var allSheets = ss.getSheets();
  allSheets.forEach(function (s) {
    var sName = s.getName();
    if (sName !== MASTER_SHEET_NAME && STATUS_TABS.indexOf(sName) === -1) {
      var cleanSName = sName.replace(/^rep\s*[-:]?\s*/i, '').trim();
      if (!repCounts[cleanSName] || repCounts[cleanSName] === 0) {
        try {
          ss.deleteSheet(s);
        } catch (err) {}
      }
    }
  });

  // 3. Create or update tabs for active members and move them to the very end
  var uniqueReps = Object.keys(repCounts);

  uniqueReps.forEach(function (repName) {
    if (!repCounts[repName] || repCounts[repName] < 1) return;

    var tabName = repName; // Direct clean name (no 'Rep -')
    
    // Auto-migrate legacy 'Rep - <Name>' tabs if present
    var legacyTab = ss.getSheetByName('Rep - ' + repName);
    var tab = ss.getSheetByName(tabName);
    if (!tab && legacyTab) {
      try {
        legacyTab.setName(tabName);
        tab = legacyTab;
      } catch (e) {
        tab = legacyTab;
      }
    }
    if (!tab) {
      tab = ss.insertSheet(tabName);
    }

    try { tab.setTabColor('#0D9488'); } catch (e) {} // Elegant Teal

    tab.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(tab, headers.length);

    var maxRows = Math.max(tab.getLastRow(), 2);
    tab.getRange(2, 1, maxRows, tab.getLastColumn() || headers.length).clearContent();

    // Shift-Proof INDIRECT formula matching both clean and legacy names
    var formula = `=IFERROR(FILTER(INDIRECT("'${MASTER_SHEET_NAME}'!A2:${lastColLetter}"), (LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${handledByColLetter}2:${handledByColLetter}")) = "${repName.toLowerCase()}") + (LOWER(INDIRECT("'${MASTER_SHEET_NAME}'!${handledByColLetter}2:${handledByColLetter}")) = "rep - ${repName.toLowerCase()}")), "No leads assigned to ${repName}")`;
    tab.getRange('A2').setFormula(formula);

    applyColorCoding(tab, headers);
    applyDateFormatting(tab, headers);

    // Strictly position team member tab at the very end
    try {
      ss.setActiveSheet(tab);
      ss.moveActiveSheet(ss.getNumSheets());
    } catch (e) {}
  });
}

/**
 * Dynamic Team Member List Aggregator
 * Merges DEFAULT_TEAM_MEMBERS with any active members assigned in 'All Leads'
 */
function getTeamMembersList(ss, master) {
  var members = DEFAULT_TEAM_MEMBERS.slice();
  if (!master && ss) master = getOrCreateMasterSheet(ss);
  if (master && master.getLastRow() >= 2) {
    var headers = master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0];
    var handledByIndex = findHeaderIndex(headers, COLUMN_ALIASES.handledBy);
    if (handledByIndex > -1) {
      var vals = master.getRange(2, handledByIndex + 1, master.getLastRow() - 1, 1).getValues();
      vals.forEach(function (row) {
        var raw = (row[0] || '').toString().trim();
        if (raw) {
          var clean = raw.replace(/^rep\s*[-:]?\s*/i, '').trim();
          if (clean && members.indexOf(clean) === -1) {
            members.push(clean);
          }
        }
      });
    }
  }
  return members;
}

/**
 * Professional Column Widths for Optimal Readability
 */
function applyColumnWidths(sheet, headers) {
  if (!sheet || !headers) return;
  try {
    sheet.setHiddenGridlines(false);
  } catch (e) {}

  var widthMap = {
    name: 160,
    location: 130,
    phone: 135,
    email: 185,
    service: 150,
    leadStage: 125,
    handledBy: 140,
    comments: 220,
    isQualified: 95,
    qualifiedDate: 120,
    isSpam: 95,
    eventTime: 165,
    actionSource: 120,
    source: 140,
    utmSource: 120,
    utmCampaign: 130,
    leadId: 130
  };

  for (var i = 0; i < headers.length; i++) {
    var colNum = i + 1;
    for (var key in COLUMN_ALIASES) {
      var aliases = COLUMN_ALIASES[key];
      for (var a = 0; a < aliases.length; a++) {
        if ((headers[i] || '').toString().trim().toLowerCase() === aliases[a].toLowerCase()) {
          if (widthMap[key]) {
            try {
              sheet.setColumnWidth(colNum, widthMap[key]);
            } catch (e) {}
          }
          break;
        }
      }
    }
  }
}

/**
 * Dropdown Validations for Status, Team Members, and Spam
 * Applies across full column (rows 2 to 1000) or a targeted row
 */
function applyDropdownValidations(sheet, headers, targetRow, ss) {
  if (!sheet || !headers || headers.length === 0) return;
  var stageCol = findHeaderIndex(headers, COLUMN_ALIASES.leadStage) + 1;
  var qualCol = findHeaderIndex(headers, COLUMN_ALIASES.isQualified) + 1;
  var spamCol = findHeaderIndex(headers, COLUMN_ALIASES.isSpam) + 1;
  var handledByCol = findHeaderIndex(headers, COLUMN_ALIASES.handledBy) + 1;

  var stageRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['New', 'Contacted', 'Qualified', 'Converted', 'Spam', 'Test'], true)
    .build();

  var yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['No', 'Yes'], true)
    .build();

  var startRow = targetRow || 2;
  var numRows = targetRow ? 1 : Math.max(sheet.getLastRow() - 1, 1000);
  if (numRows < 1) numRows = 1;

  if (stageCol > 0) {
    sheet.getRange(startRow, stageCol, numRows, 1).setDataValidation(stageRule);
  }
  if (qualCol > 0) {
    sheet.getRange(startRow, qualCol, numRows, 1).setDataValidation(yesNoRule);
  }
  if (spamCol > 0) {
    sheet.getRange(startRow, spamCol, numRows, 1).setDataValidation(yesNoRule);
  }

  // Handled By Dropdown Validation (Team Members)
  if (handledByCol > 0) {
    var parentSs = ss || (sheet.getParent ? sheet.getParent() : SpreadsheetApp.getActiveSpreadsheet());
    var teamList = getTeamMembersList(parentSs, sheet.getName() === MASTER_SHEET_NAME ? sheet : null);
    if (teamList && teamList.length > 0) {
      var handledByRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(teamList, true)
        .build();
      sheet.getRange(startRow, handledByCol, numRows, 1).setDataValidation(handledByRule);
    }
  }
}


/**
 * Conditional Formatting: Full-Row Highlighting for Lead Stage (with case-insensitive LOWER matching)
 */
function applyColorCoding(sheet, headers) {
  var stageCol = findHeaderIndex(headers, COLUMN_ALIASES.leadStage) + 1;
  if (stageCol === 0) return;

  var lastRow = Math.max(sheet.getLastRow(), 1000);
  var numCols = headers.length;
  var stageColLetter = getColLetter(stageCol);

  // Full-Row Range spanning Column A to last column
  var fullRowRange = sheet.getRange(2, 1, lastRow - 1, numCols);

  var colorMap = [
    { text: 'new', bg: '#EBF5FF', fg: '#0369A1' },        // Soft Ice Blue
    { text: 'contacted', bg: '#FEF9C3', fg: '#854D0E' },  // Soft Pale Amber
    { text: 'qualified', bg: '#DCFCE7', fg: '#166534' },  // Soft Mint Green
    { text: 'converted', bg: '#F3E8FF', fg: '#6B21A8' },  // Soft Lavender Purple
    { text: 'spam', bg: '#FEE2E2', fg: '#991B1B' },       // Soft Blush Red
    { text: 'test', bg: '#F3F4F6', fg: '#4B5563' }        // Soft Slate Gray
  ];

  var newRules = [];
  colorMap.forEach(function (c) {
    var formula = '=$' + stageColLetter + '2="' + c.text + '"';
    var rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(formula)
      .setBackground(c.bg)
      .setFontColor(c.fg)
      .setRanges([fullRowRange])
      .build();
    newRules.push(rule);
  });

  sheet.setConditionalFormatRules(newRules);
}

/**
 * Custom UI Menu inside Google Sheets
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('⚡ Buzl Lead CRM')
      .addItem('⚡ Initialize & Upgrade All CRM Tabs', 'menuInitCrm')
      .addItem('🔄 Sort All Leads (Newest First)', 'menuSortNewestFirst')
      .addItem('🎨 Apply Status Color Coding', 'menuColorCoding')
      .addItem('👥 Sync Team Member Tabs', 'menuSyncReps')
      .addItem('📋 Apply Dropdowns & Layout to All Sheets', 'menuApplyDropdownsAndLayout')
      .addToUi();
  } catch (e) {}
}

function menuInitCrm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = getOrCreateMasterSheet(ss);
  var headers = ensureCrmLayout(master, null, false);
  initializeCrmTabs(ss, headers);
  applyDropdownValidations(master, headers, null, ss);
  applyColumnWidths(master, headers);
  applyColorCoding(master, headers);
  applyDateFormatting(master, headers);
  SpreadsheetApp.getUi().alert('✔ Buzl CRM Upgraded! CRM headers verified, full-row colors active, and team tabs synced.');
}

function menuSortNewestFirst() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = getOrCreateMasterSheet(ss);
  if (master.getLastRow() < 3) {
    SpreadsheetApp.getUi().alert('Not enough rows to sort.');
    return;
  }
  var headers = master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0];
  var timeCol = findHeaderIndex(headers, COLUMN_ALIASES.eventTime) + 1;
  if (timeCol > 0) {
    var range = master.getRange(2, 1, master.getLastRow() - 1, master.getLastColumn());
    range.sort({ column: timeCol, ascending: false });
    SpreadsheetApp.getUi().alert('✔ Master sheet sorted: newest leads are on top!');
  } else {
    SpreadsheetApp.getUi().alert('Event Time column not found for sorting.');
  }
}

function menuColorCoding() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = getOrCreateMasterSheet(ss);
  var headers = master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0];
  applyColorCoding(master, headers);
  SpreadsheetApp.getUi().alert('✔ Full-row conditional status colors applied!');
}

function menuSyncReps() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  syncTeamMemberTabs(ss);
  SpreadsheetApp.getUi().alert('✔ Team Member tabs refreshed & pruned!');
}

function menuApplyDropdownsAndLayout() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = getOrCreateMasterSheet(ss);
  var headers = master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0];
  
  applyDropdownValidations(master, headers, null, ss);
  applyColumnWidths(master, headers);
  
  STATUS_TABS.forEach(function (name) {
    var tab = ss.getSheetByName(name);
    if (tab) {
      applyDropdownValidations(tab, headers, null, ss);
      applyColumnWidths(tab, headers);
    }
  });

  syncTeamMemberTabs(ss, headers);
  SpreadsheetApp.getUi().alert('✔ Full-column dropdowns and column widths applied to all sheets!');
}

/**
 * Trigger: On Edit in Google Sheets
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== MASTER_SHEET_NAME) return;

  var row = e.range.getRow();
  var col = e.range.getColumn();
  if (row <= 1) return;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var stageCol = findHeaderIndex(headers, COLUMN_ALIASES.leadStage) + 1;
  var qualCol = findHeaderIndex(headers, COLUMN_ALIASES.isQualified) + 1;
  var qualDateCol = findHeaderIndex(headers, COLUMN_ALIASES.qualifiedDate) + 1;
  var handledByCol = findHeaderIndex(headers, COLUMN_ALIASES.handledBy) + 1;

  if (col === stageCol && (e.value || '').toString().toLowerCase() === 'qualified') {
    if (qualCol > 0) sheet.getRange(row, qualCol).setValue('Yes');
    if (qualDateCol > 0) {
      var tz = getSpreadsheetTz(SpreadsheetApp.getActiveSpreadsheet());
      var today = Utilities.formatDate(new Date(), tz, "dd-MMM-yyyy");
      sheet.getRange(row, qualDateCol).setValue(today);
    }
  }

  if (col === handledByCol) {
    syncTeamMemberTabs(SpreadsheetApp.getActiveSpreadsheet(), headers);
  }
}

function getColLetter(colIndex) {
  var temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = Math.floor((colIndex - temp - 1) / 26);
  }
  return letter;
}

function capitalize(str) {
  if (!str) return '';
  var clean = str.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
