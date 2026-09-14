/**
 * Automated Unit & Integration Tests for Buzl Tracker
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { scanProject } = require('../src/core/scanner');
const { injectHtml, applyInjection } = require('../src/core/injector');
const { runVerification } = require('../src/core/tester');
const { restoreLatestBackup } = require('../src/core/rollback');

const sampleDir = path.join(__dirname, 'test-sample');
const sampleHtmlPath = path.join(sampleDir, 'sample.html');

console.log('🧪 Running Buzl Tracker Unit & Integration Tests...\n');

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

async function runAsyncTests() {
  const originalHtml = fs.readFileSync(sampleHtmlPath, 'utf8');

  // Test 1: Scanner discovery
  it('Scanner detects HTML files and form inputs in test-sample', () => {
    const scan = scanProject(sampleDir);
    assert.strictEqual(scan.totalHtmlFiles, 1, 'Should find 1 HTML file');
    assert.strictEqual(scan.totalForms, 1, 'Should find 1 form');
    assert.strictEqual(scan.files[0].forms[0].inputs.length, 3, 'Form should have 3 inputs');
  });

  // Test 2: HTML Injection
  const testConfig = {
    gtmId: 'GTM-TEST1234',
    metaPixelId: '9876543210',
    googleSheetUrl: 'https://script.google.com/macros/s/AKfycbz_test/exec',
    zohoXnqsjsdp: 'zoho_token_123',
    whatsappNumber: '918310755474',
    enableDeferred: true
  };

  let injectedHtml = '';
  it('HTML Injector correctly inserts GTM, Meta, and runtime script tags', () => {
    injectedHtml = injectHtml(originalHtml, testConfig);

    // GTM checks
    assert.ok(injectedHtml.includes('GTM-TEST1234'), 'Contains GTM ID');
    assert.ok(injectedHtml.includes('googletagmanager.com/ns.html?id=GTM-TEST1234'), 'Contains GTM noscript');

    // Meta Pixel checks
    assert.ok(injectedHtml.includes('9876543210'), 'Contains Meta Pixel ID');
    assert.ok(injectedHtml.includes('facebook.com/tr?id=9876543210'), 'Contains Meta noscript');

    // Form tag check
    assert.ok(injectedHtml.includes('data-buzl-track="true"'), 'Form contains data-buzl-track attribute');

    // Runtime script check
    assert.ok(injectedHtml.includes('buzl-tracking.js'), 'Contains buzl-tracking.js script');
    assert.ok(injectedHtml.includes('window.__BUZL_CONFIG__'), 'Contains inline config');
  });

  // Test 3: Idempotency (Clean re-injection without duplicates)
  it('Second injection updates markers cleanly without duplicating tags', () => {
    const updatedConfig = { ...testConfig, gtmId: 'GTM-UPDATED99' };
    const secondPass = injectHtml(injectedHtml, updatedConfig);

    const gtmCount = (secondPass.match(/GTM-UPDATED99/g) || []).length;
    assert.strictEqual(gtmCount, 2, 'GTM updated ID should appear exactly twice (head + noscript)');
    assert.ok(!secondPass.includes('GTM-TEST1234'), 'Old GTM ID should be removed');
  });

  // Test 4: End-to-end injection & backup in isolated test-sample
  it('applyInjection writes files, creates backup, and verifies all checks', async () => {
    const res = applyInjection(sampleDir, [sampleHtmlPath], testConfig);
    assert.ok(res.success, 'applyInjection should succeed');
    assert.ok(fs.existsSync(res.backupDir), 'Backup directory should exist');

    // Verify tests run on disk
    const verification = await runVerification(sampleDir, [sampleHtmlPath], testConfig);
    assert.strictEqual(verification.failedCount, 0, `All verification checks should pass. Failed: ${verification.failedCount}`);
    assert.ok(verification.allPassed, 'allPassed should be true');
  });

  // Test 5: Rollback restoration
  it('restoreLatestBackup restores original HTML file identically', () => {
    const rollback = restoreLatestBackup(sampleDir);
    assert.ok(rollback.success, 'Rollback should succeed');

    const restoredHtml = fs.readFileSync(sampleHtmlPath, 'utf8');
    assert.strictEqual(restoredHtml, originalHtml, 'Restored HTML must match original HTML byte-for-byte');

    // Clean up created backups in test-sample
    const entries = fs.readdirSync(sampleDir);
    entries.forEach(e => {
      if (e.startsWith('.buzl-backup-') || e === '.buzl' || e === 'assets' || e === 'Buzl_GoogleAppsScript_Template.gs') {
        fs.rmSync(path.join(sampleDir, e), { recursive: true, force: true });
      }
    });
  });

  // Test 7: Clean Tracking Removal without breaking HTML
  it('removeTracking cleans all injected tags and data attributes cleanly', () => {
    // First inject
    applyInjection(sampleDir, [sampleHtmlPath], testConfig);
    const injected = fs.readFileSync(sampleHtmlPath, 'utf8');
    assert.ok(injected.includes('GTM-TEST1234'), 'Must have GTM before removal');
    assert.ok(injected.includes('data-buzl-track="true"'), 'Must have track attr before removal');

    // Remove tracking
    const { removeTracking } = require('../src/core/injector');
    const remRes = removeTracking(sampleDir, [sampleHtmlPath]);
    assert.ok(remRes.success, 'removeTracking should succeed');

    const cleaned = fs.readFileSync(sampleHtmlPath, 'utf8');
    assert.ok(!cleaned.includes('GTM-TEST1234'), 'GTM must be removed');
    assert.ok(!cleaned.includes('googletagmanager.com'), 'GTM script must be removed');
    assert.ok(!cleaned.includes('facebook.com/tr'), 'Meta Pixel must be removed');
    assert.ok(!cleaned.includes('buzl-tracking.js'), 'Runtime script must be removed');
    assert.ok(!cleaned.includes('data-buzl-track="true"'), 'Tracking attr must be removed');
    assert.ok(cleaned.includes('<!DOCTYPE html>'), 'HTML structure must be intact');
    assert.ok(cleaned.includes('</head>') && cleaned.includes('</body>'), 'HTML closing tags must be intact');
  });

  // Test 8: Named Backups Management
  it('Named Backups: create, list, restore by name, and delete', () => {
    const { manualBackup, listBackups, restoreBackup, deleteBackup } = require('../src/core/rollback');
    const customName = 'Milestone_v1_0';
    const mb = manualBackup(sampleDir, customName);
    assert.ok(mb.success, 'manualBackup with custom name should succeed');
    assert.strictEqual(mb.name, customName, 'Backup name should match');
    assert.ok(mb.hash && mb.hash.length === 8, 'Must compute 8-char SHA content hash');
    assert.ok(mb.backupDir.includes('.buzl'), 'Backup must be placed inside .buzl directory');

    const backups = listBackups(sampleDir);
    const found = backups.find(b => b.name === customName);
    assert.ok(found, 'Created named backup must be listed in listBackups');

    // Modify HTML
    fs.writeFileSync(sampleHtmlPath, '<!-- MODIFIED CONTENT -->', 'utf8');
    assert.strictEqual(fs.readFileSync(sampleHtmlPath, 'utf8'), '<!-- MODIFIED CONTENT -->');

    // Restore by custom name
    const restRes = restoreBackup(sampleDir, customName);
    assert.ok(restRes.success, 'restoreBackup by name should succeed');
    assert.ok(!fs.readFileSync(sampleHtmlPath, 'utf8').includes('MODIFIED CONTENT'), 'HTML should be restored from backup');

    // Delete backup
    const delRes = deleteBackup(sampleDir, found.dirName);
    assert.ok(delRes.success, 'deleteBackup should succeed');
    const afterDel = listBackups(sampleDir);
    assert.ok(!afterDel.some(b => b.dirName === found.dirName), 'Deleted backup should no longer exist');
  });

  // Test 9: Live Site State Detection
  it('Scanner detects live site state accurately', () => {
    // Currently pristine/cleaned: all should be inactive
    const scanClean = scanProject(sampleDir);
    assert.ok(scanClean.liveState, 'liveState object must exist');
    assert.strictEqual(scanClean.liveState.gtm.active, false);
    assert.strictEqual(scanClean.liveState.meta.active, false);

    // Now inject
    applyInjection(sampleDir, [sampleHtmlPath], testConfig);
    const scanInjected = scanProject(sampleDir);
    assert.strictEqual(scanInjected.liveState.gtm.active, true);
    assert.strictEqual(scanInjected.liveState.meta.active, true);

    // Restore original clean HTML
    restoreLatestBackup(sampleDir);
  });

  // Test 10: Individual Form Testing
  it('testIndividualForm constructs correct payload and handles unconfigured gracefully', async () => {
    const { testIndividualForm } = require('../src/core/tester');
    const res = await testIndividualForm(sampleDir, 'test-form', {
      name: 'Tester Unit',
      phone: '9876543210',
      location: 'Testville'
    }, {});

    assert.ok(res.channels, 'Result should have channels');
    assert.strictEqual(res.channels.googleSheets.tested, false, 'Sheets should not be tested when unconfigured');
    assert.strictEqual(res.channels.buzlCapi.tested, false, 'CAPI should not be tested when unconfigured');
    assert.strictEqual(res.channels.zoho.tested, false, 'Zoho should not be tested when unconfigured');
  });

  // Test 11: Selective Service Removal (Remove GTM Only without breaking Meta Pixel)
  it('removeService("gtm") cleanly strips GTM while preserving Meta Pixel & other trackers', () => {
    const { removeService } = require('../src/core/injector');
    // Inject both GTM and Meta
    applyInjection(sampleDir, [sampleHtmlPath], testConfig);
    const preScan = scanProject(sampleDir);
    assert.strictEqual(preScan.liveState.gtm.active, true, 'GTM must be active initially');
    assert.strictEqual(preScan.liveState.meta.active, true, 'Meta must be active initially');

    // Remove only GTM
    const remRes = removeService(sampleDir, 'gtm');
    assert.ok(remRes.success, 'removeService should succeed');

    const postScan = scanProject(sampleDir);
    assert.strictEqual(postScan.liveState.gtm.active, false, 'GTM must now be INACTIVE');
    assert.strictEqual(postScan.liveState.meta.active, true, 'Meta Pixel must remain ACTIVE');

    const postContent = fs.readFileSync(sampleHtmlPath, 'utf8');
    assert.ok(!postContent.includes('GTM-TEST1234'), 'GTM tag must not exist in HTML');
    assert.ok(!postContent.includes('googletagmanager.com'), 'GTM script must not exist in HTML');
    assert.ok(postContent.includes('9876543210'), 'Meta Pixel ID must still be present in HTML');
  });

  // Test 12: Zoho auto-enable prevention when xnQsjsdp is empty
  it('Zoho CRM remains inactive and never auto-enables when xnQsjsdp is blank', () => {
    const { removeService } = require('../src/core/injector');
    // Inject config without Zoho xnQsjsdp
    const noZohoConfig = {
      ...testConfig,
      zohoXnqsjsdp: '',
      zohoEndpoint: 'https://crm.zoho.in/crm/WebToLeadForm'
    };
    applyInjection(sampleDir, [sampleHtmlPath], noZohoConfig);

    const scan = scanProject(sampleDir);
    assert.strictEqual(scan.liveState.zoho.active, false, 'Zoho must be INACTIVE when xnQsjsdp is blank');

    // Calling removeService on zoho should also ensure it stays inactive
    removeService(sampleDir, 'zoho');
    const scanAfterRem = scanProject(sampleDir);
    assert.strictEqual(scanAfterRem.liveState.zoho.active, false, 'Zoho must remain INACTIVE after removeService');
  });

  // Test 13: Dynamic Test Lead Dispatch (Zero Hardcoding)
  it('testIndividualForm dynamically derives service, domain, and avoids hardcoded clinic data', async () => {
    const { testIndividualForm } = require('../src/core/tester');
    const res = await testIndividualForm(sampleDir, 'customQuoteForm', {
      name: 'Dr. Jane Smith',
      phone: '9888877777',
      service: 'Dental Implant Surgery'
    }, {
      siteLocation: 'Hyderabad Hub'
    });

    assert.ok(res.leadId.startsWith('test-customQuoteForm-'), 'Lead ID must derive dynamically from formId');
  });

  // Final cleanup of test-sample
  const entries = fs.readdirSync(sampleDir);
  entries.forEach(e => {
    if (e.startsWith('.buzl-backup-') || e === '.buzl' || e === 'assets' || e === 'Buzl_GoogleAppsScript_Template.gs') {
      fs.rmSync(path.join(sampleDir, e), { recursive: true, force: true });
    }
  });
  fs.writeFileSync(sampleHtmlPath, originalHtml, 'utf8');

  console.log(`\n========================================`);
  console.log(`Test Suite Summary: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log(`🎉 ALL TESTS PASSED! Package is rock solid.\n`);
    process.exit(0);
  } else {
    console.error(`❌ Some tests failed.`);
    process.exit(1);
  }
}

runAsyncTests().catch(err => {
  console.error(err);
  process.exit(1);
});
