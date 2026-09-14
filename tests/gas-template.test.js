/**
 * Automated Tests for Buzl Google Apps Script CRM Template
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running Google Apps Script Template Verification Tests...\n');

const templatePath = path.join(__dirname, '..', 'src', 'templates', 'GoogleAppsScript.gs');
const rootTemplatePath = path.join(__dirname, '..', 'Buzl_GoogleAppsScript_Template.gs');

assert.ok(fs.existsSync(templatePath), 'src/templates/GoogleAppsScript.gs must exist');
assert.ok(fs.existsSync(rootTemplatePath), 'Buzl_GoogleAppsScript_Template.gs must exist');

const content = fs.readFileSync(templatePath, 'utf8');
const rootContent = fs.readFileSync(rootTemplatePath, 'utf8');

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✔ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ✖ FAIL: ${desc}`);
    console.error(err);
  }
}

// Test 1: File consistency
it('Root template and src template are 100% synchronized', () => {
  assert.strictEqual(content, rootContent, 'Both files must have identical contents');
});

// Test 2: New leads at Row 2 (Top of sheet)
it('Inserts new incoming leads at Row 2 (Top of sheet)', () => {
  assert.ok(content.includes('sheet.insertRowBefore(2)'), 'Must call insertRowBefore(2)');
  assert.ok(content.includes('sheet.getRange(2, 1, 1, rowData.length).setValues([rowData])'), 'Must write values to row 2');
});

// Test 3: 12-Hour format & Date formatting
it('Uses 12-hour format with AM/PM and dd-MMM-yyyy date format', () => {
  assert.ok(content.includes('"dd-MMM-yyyy hh:mm a"'), 'Must format Event Time as dd-MMM-yyyy hh:mm a');
  assert.ok(content.includes('"dd-MMM-yyyy"'), 'Must format Qualified Date as dd-MMM-yyyy');
  assert.ok(content.includes('getSpreadsheetTz'), 'Must read dynamic spreadsheet timezone');
  assert.ok(content.includes("setNumberFormat('dd-mmm-yyyy hh:mm am/pm')"), 'Must set native number format for time');
  assert.ok(content.includes("setNumberFormat('dd-mmm-yyyy')"), 'Must set native number format for date');
});

// Test 4: Shift-proof INDIRECT formulas
it('Uses shift-proof INDIRECT filter formulas in status tabs', () => {
  assert.ok(content.includes('INDIRECT('), 'Must use INDIRECT in formulas to prevent row shift');
  assert.ok(content.includes('INDIRECT("\'${MASTER_SHEET_NAME}\'!A2:'), 'Must reference INDIRECT for data range');
});

// Test 5: Full-row conditional formatting
it('Applies full-row conditional formatting formula (=$D2="Stage")', () => {
  assert.ok(content.includes('whenFormulaSatisfied'), 'Must use whenFormulaSatisfied');
  assert.ok(content.includes("'=$' + stageColLetter + '2=\"'"), 'Must anchor to stage column with $');
});

// Test 6: Colored tabs
it('Applies high-contrast brand colors to bottom sheet tabs', () => {
  assert.ok(content.includes('TAB_COLORS'), 'Must define TAB_COLORS');
  assert.ok(content.includes('tab.setTabColor'), 'Must call tab.setTabColor');
  assert.ok(content.includes('#1E293B'), 'Must color master tab');
  assert.ok(content.includes('#0284C7'), 'Must color New tab');
  assert.ok(content.includes('#16A34A'), 'Must color Qualified tab');
  assert.ok(content.includes('#0D9488'), 'Must color Team tabs');
});

// Test 7: Clean Team member tabs (no 'Rep -')
it('Strips Rep prefix and names team tabs directly after members', () => {
  assert.ok(content.includes('replace(/^rep'), 'Must strip Rep prefix');
  assert.ok(content.includes('var tabName = repName;'), 'Tab name must be clean person name');
});

// Test 8: Custom Menu
it('Keeps ⚡ Buzl Lead CRM menu with newest-first sort action', () => {
  assert.ok(content.includes("createMenu('⚡ Buzl Lead CRM')"), 'Menu title must be ⚡ Buzl Lead CRM');
  assert.ok(content.includes("addItem('⚡ Initialize & Upgrade All CRM Tabs'"), 'Must have initialize menu item');
  assert.ok(content.includes("addItem('🔄 Sort All Leads (Newest First)'"), 'Must have sort newest first menu item');
});

// Test 9: Forward operational columns (Handled By & Comments next to Lead Stage)
it('Positions Handled By & Comments directly next to Lead Stage', () => {
  const stageIdx = content.indexOf("'Lead Stage'");
  const handledIdx = content.indexOf("'Handled By'");
  const commentsIdx = content.indexOf("'Comments'");
  assert.ok(stageIdx > -1 && handledIdx > stageIdx && commentsIdx > handledIdx, 'Handled By and Comments must follow Lead Stage');
  assert.ok(content.indexOf("'Event Time'") > commentsIdx, 'Event Time must sit after Comments');
});

// Test 10: Official Buzl Navy Blue Header (#1E4E9E / #FFFFFF)
it('Styles Header Row with Buzl official Navy Blue and bold white text', () => {
  assert.ok(content.includes('#1E4E9E'), 'Must use Buzl navy blue #1E4E9E for header background');
  assert.ok(content.includes('#FFFFFF'), 'Must use pure white text for maximum contrast');
  assert.ok(content.includes('formatHeaderRow'), 'Must implement formatHeaderRow');
  assert.ok(content.includes('sheet.setRowHeight(1, 32)'), 'Must set header height to 32px');
});

// Test 11: Team Member Tabs placed at the very end
it('Ensures Team Member tabs are strictly positioned at the end', () => {
  assert.ok(content.includes('ss.moveActiveSheet(ss.getNumSheets())'), 'Must move active team tab to last position');
});

// Test 12: Auto-pruning 0-lead team tabs
it('Automatically deletes team tabs when rep has 0 leads', () => {
  assert.ok(content.includes('ss.deleteSheet(s)'), 'Must delete empty sheets when lead count is 0');
});

// Test 13: Team Member Dropdown & Configurable List
it('Provides configurable team members and dynamic Handled By dropdown', () => {
  assert.ok(content.includes('DEFAULT_TEAM_MEMBERS'), 'Must define DEFAULT_TEAM_MEMBERS');
  assert.ok(content.includes('getTeamMembersList'), 'Must implement getTeamMembersList');
  assert.ok(content.includes('requireValueInList(teamList'), 'Must set dropdown validation on Handled By');
});

// Test 14: Full-column data validation across Sub-Tabs and Master
it('Applies full-column dropdown validations across all subtabs and master', () => {
  assert.ok(content.includes('applyDropdownValidations(tab, headers, null, ss)'), 'Must call dropdown validations on subtabs');
  assert.ok(content.includes('Math.max(sheet.getLastRow() - 1, 1000)'), 'Must span full column up to 1000 rows');
  assert.ok(content.includes('addItem(\'📋 Apply Dropdowns & Layout to All Sheets\''), 'Must have 1-click layout menu item');
});

// Test 15: Professional column width auto-layout
it('Applies professional column widths for high readability', () => {
  assert.ok(content.includes('applyColumnWidths'), 'Must implement applyColumnWidths');
  assert.ok(content.includes('sheet.setColumnWidth'), 'Must set tailored column widths');
  assert.ok(content.includes('sheet.setHiddenGridlines(false)'), 'Must ensure visible gridlines');
});

console.log(`\n========================================\nResults: ${passed}/${total} passed\n========================================\n`);
if (passed !== total) process.exit(1);

