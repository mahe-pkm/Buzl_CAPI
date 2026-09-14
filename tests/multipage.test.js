/**
 * Multi-Page HTML Project Automated Integration Tests for Dev_CAPi
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');
const { scanProject } = require('../src/core/scanner');
const { applyInjection, removeService, removeTracking } = require('../src/core/injector');
const { runVerification } = require('../src/core/tester');
const { restoreLatestBackup, createBackup } = require('../src/core/rollback');

const fixtureDir = path.join(__dirname, 'multipage-fixture');

console.log('🧪 Running Buzl Tracker Multi-Page Integration Tests...\n');

let passed = 0;
let total = 0;

async function it(desc, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✔ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ✖ FAIL: ${desc}`);
    console.error(err);
  }
}

async function runTests() {
  const mockServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', row: 2 }));
  });
  await new Promise(resolve => mockServer.listen(0, resolve));
  const mockPort = mockServer.address().port;

  // 1. Setup multi-page fixture directory tree
  if (fs.existsSync(fixtureDir)) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }

  const subdirs = [
    fixtureDir,
    path.join(fixtureDir, 'contact'),
    path.join(fixtureDir, 'services'),
    path.join(fixtureDir, 'services', 'spine'),
    path.join(fixtureDir, 'assets', 'js')
  ];
  subdirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Sample HTML Templates
  const createHtml = (title, formHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>
  <header><h1>${title}</h1></header>
  <main>
    ${formHtml || ''}
  </main>
</body>
</html>`;

  const sharedModalForm = `<form id="globalContactModal" action="/lead">
    <input type="text" name="name" placeholder="Your Name" required>
    <input type="tel" name="phone" placeholder="Your Phone" required>
    <button type="submit">Submit</button>
  </form>`;

  const pageSpecificForm = (id, field) => `<form id="${id}" action="/inquiry">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <input type="text" name="${field}">
    <button type="submit">Send</button>
  </form>`;

  const filesToCreate = {
    'index.html': createHtml('Home Page', sharedModalForm),
    'about.html': createHtml('About Page', sharedModalForm),
    [path.join('contact', 'index.html')]: createHtml('Contact Us', sharedModalForm + pageSpecificForm('contactInquiry', 'message')),
    [path.join('services', 'sports.html')]: createHtml('Sports Rehab', sharedModalForm + pageSpecificForm('sportsBooking', 'injuryType')),
    [path.join('services', 'spine', 'rehab.html')]: createHtml('Spine Rehab Clinic', sharedModalForm + pageSpecificForm('spineBooking', 'doctorPref'))
  };

  for (const [relPath, content] of Object.entries(filesToCreate)) {
    fs.writeFileSync(path.join(fixtureDir, relPath), content, 'utf8');
  }

  // Test 1: Scanner multi-page tree discovery
  let scan;
  await it('Scanner accurately detects all 5 nested HTML files with true relative paths', () => {
    scan = scanProject(fixtureDir);
    assert.strictEqual(scan.totalHtmlFiles, 5, 'Should discover all 5 HTML files');
    
    const detectedPaths = scan.files.map(f => f.relativePath).sort();
    const expectedPaths = [
      'about.html',
      'contact/index.html',
      'index.html',
      'services/spine/rehab.html',
      'services/sports.html'
    ].sort();

    assert.deepStrictEqual(detectedPaths, expectedPaths, 'All paths must be normalized relative paths');
  });

  // Test 2: Directory enumeration & Archetype grouping
  await it('Scanner lists correct unique directory paths and groups shared form archetypes', () => {
    const expectedDirs = ['/', '/contact', '/services', '/services/spine'].sort();
    assert.deepStrictEqual(scan.directories.sort(), expectedDirs, 'Directories should match nested folder tree');

    // Total forms = 1 on home + 1 on about + 2 on contact + 2 on sports + 2 on spine = 8 forms
    assert.strictEqual(scan.totalForms, 8, 'Should find 8 total form instances across 5 pages');

    // Shared modal form should be grouped as an archetype appearing on all 5 pages
    const sharedArchetype = scan.formArchetypes.find(a => a.formId === 'globalContactModal');
    assert.ok(sharedArchetype, 'globalContactModal archetype must exist');
    assert.strictEqual(sharedArchetype.isShared, true, 'globalContactModal should be flagged as isShared');
    assert.strictEqual(sharedArchetype.pages.length, 5, 'globalContactModal should appear on all 5 pages');
  });

  // Test 3: Multi-depth relative script injection
  const testConfig = {
    gtmId: 'GTM-MULTI123',
    metaPixelId: '1122334455',
    googleSheetUrl: `http://localhost:${mockPort}`,
    siteLocation: 'Bengaluru Clinic',
    buzlCapi: {
      endpoint: 'https://capi.gobuzl.com/v1/event',
      authUser: 'testUser123',
      authPass: 'testPass456'
    }
  };

  await it('applyInjection writes appropriate relative script paths for each directory depth', () => {
    const htmlFiles = scan.files.map(f => path.join(fixtureDir, f.relativePath));
    const result = applyInjection(fixtureDir, htmlFiles, testConfig);
    assert.ok(result.success, 'Multi-page injection should succeed');

    // Check root index.html -> assets/js/buzl-tracking.js
    const indexContent = fs.readFileSync(path.join(fixtureDir, 'index.html'), 'utf8');
    assert.ok(indexContent.includes('src="assets/js/buzl-tracking.js"'), 'Root file should use assets/js/...');
    assert.ok(indexContent.includes('GTM-MULTI123'), 'Root contains GTM');
    assert.ok(indexContent.includes('1122334455'), 'Root contains Meta');

    // Check depth 1 contact/index.html -> ../assets/js/buzl-tracking.js
    const contactContent = fs.readFileSync(path.join(fixtureDir, 'contact', 'index.html'), 'utf8');
    assert.ok(contactContent.includes('src="../assets/js/buzl-tracking.js"'), 'Depth 1 file should use ../assets/js/...');

    // Check depth 1 services/sports.html -> ../assets/js/buzl-tracking.js
    const sportsContent = fs.readFileSync(path.join(fixtureDir, 'services', 'sports.html'), 'utf8');
    assert.ok(sportsContent.includes('src="../assets/js/buzl-tracking.js"'), 'Depth 1 file should use ../assets/js/...');

    // Check depth 2 services/spine/rehab.html -> ../../assets/js/buzl-tracking.js
    const spineContent = fs.readFileSync(path.join(fixtureDir, 'services', 'spine', 'rehab.html'), 'utf8');
    assert.ok(spineContent.includes('src="../../assets/js/buzl-tracking.js"'), 'Depth 2 file should use ../../assets/js/...');
  });

  // Test 4: Root-absolute path mode option
  await it('applyInjection respects pathMode: "root-absolute" across nested folders', () => {
    const htmlFiles = scan.files.map(f => path.join(fixtureDir, f.relativePath));
    const absConfig = Object.assign({}, testConfig, { pathMode: 'root-absolute' });
    const result = applyInjection(fixtureDir, htmlFiles, absConfig);
    assert.ok(result.success, 'Root-absolute injection should succeed');

    const spineContent = fs.readFileSync(path.join(fixtureDir, 'services', 'spine', 'rehab.html'), 'utf8');
    assert.ok(spineContent.includes('src="/assets/js/buzl-tracking.js"'), 'Depth 2 file should use root-absolute /assets/js/...');
  });

  // Test 5: Multi-page automated verification report
  await it('runVerification passes all checks on multi-page project', async () => {
    const htmlFiles = scan.files.map(f => path.join(fixtureDir, f.relativePath));
    const report = await runVerification(fixtureDir, htmlFiles, testConfig);
    assert.strictEqual(report.failedCount, 0, `All checks must pass. Failed: ${report.failedCount}`);
    assert.strictEqual(report.allPassed, true, 'allPassed must be true');
  });

  // Test 6: Selective GTM removal across all multi-page files
  await it('removeService removes GTM from all 5 nested files while keeping Meta and Sheets', () => {
    const res = removeService(fixtureDir, 'gtm');
    assert.ok(res.success, 'removeService should succeed');

    const allFiles = [
      path.join(fixtureDir, 'index.html'),
      path.join(fixtureDir, 'about.html'),
      path.join(fixtureDir, 'contact', 'index.html'),
      path.join(fixtureDir, 'services', 'sports.html'),
      path.join(fixtureDir, 'services', 'spine', 'rehab.html')
    ];

    allFiles.forEach(fp => {
      const content = fs.readFileSync(fp, 'utf8');
      assert.ok(!content.includes('GTM-MULTI123'), `File ${fp} must not contain GTM`);
      assert.ok(!content.includes('googletagmanager.com'), `File ${fp} must not contain GTM script`);
      assert.ok(content.includes('1122334455'), `File ${fp} must still contain Meta Pixel`);
      assert.ok(content.includes('buzl-tracking.js'), `File ${fp} must still contain tracking script`);
    });
  });

  // Test 7: Point-in-time restore across nested directories
  await it('restoreLatestBackup restores all nested subdirectories to previous snapshot', () => {
    // Create a pristine snapshot before modifying
    const snapResult = createBackup(fixtureDir, 'Pristine Multipage Baseline');
    assert.ok(snapResult.success, 'Baseline snapshot creation must succeed');
    assert.ok(snapResult.hash && snapResult.hash.length === 8, 'Must return 8-char SHA content hash');
    assert.ok(fs.existsSync(path.join(fixtureDir, '.buzl', 'snapshots')), '.buzl/snapshots directory must be created');

    // Remove all tracking
    const uninst = removeTracking(fixtureDir);
    assert.ok(uninst.success, 'Uninstall tracking must succeed');

    // Restore from pristine snapshot
    const rollback = restoreLatestBackup(fixtureDir);
    assert.ok(rollback.success, 'Rollback must succeed');

    // Check depth 2 file is restored
    const spineContent = fs.readFileSync(path.join(fixtureDir, 'services', 'spine', 'rehab.html'), 'utf8');
    assert.ok(spineContent.includes('1122334455'), 'Restored spine file should have Meta Pixel restored');
  });

  // Cleanup fixture directory and mock server
  try {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    mockServer.close();
  } catch (e) {}

  console.log(`\n================================`);
  console.log(`Results: ${passed}/${total} passed`);
  console.log(`================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
