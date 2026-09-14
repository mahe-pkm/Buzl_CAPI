/**
 * Automated Test Suite: Automatic WhatsApp Number Fetching from Form Buttons
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { scanProject, analyzeHtmlFile } = require('../src/core/scanner');
const { applyInjection } = require('../src/core/injector');

const fixtureDir = path.join(__dirname, 'whatsapp-fixture');

console.log('🧪 Running WhatsApp Auto-Fetch & Multi-Button Routing Tests...\n');

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
  if (fs.existsSync(fixtureDir)) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Test HTML with multiple forms targeting different WhatsApp numbers
  const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WhatsApp Auto-Fetch Test Page</title>
</head>
<body>
  <header>
    <a class="btn btn--wa js-whatsapp" href="https://wa.me/919591318811?text=Hi%20Clinic">Header WhatsApp</a>
  </header>

  <!-- Form 1: Explicit data-whatsapp on button -->
  <form id="formSpine" action="/lead">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <button class="btn btn--wa" type="submit" data-whatsapp="919591318811">Book Spine with Dr. Allwin</button>
  </form>

  <!-- Form 2: Explicit data-phone on button (Doctor 2) -->
  <form id="formSports" action="/lead">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <button type="submit" data-phone="918310755474">Book Sports Physio with Dr. Kumar</button>
  </form>

  <!-- Form 3: Hidden input with WhatsApp number -->
  <form id="formEmergency" action="/lead">
    <input type="hidden" name="whatsapp" value="919988776655">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <button type="submit">Urgent Callback</button>
  </form>

  <!-- Form 4: Button with href wa.me link -->
  <form id="formDirectLink" action="/lead">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <a href="https://wa.me/919123456789?text=Inquiry" role="button" class="btn--wa">Send via WA</a>
  </form>

  <!-- Form 5: Form container attribute -->
  <form id="formContainerWa" data-whatsapp="919876543210" action="/lead">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <button type="submit">Submit Container</button>
  </form>

  <!-- Form 6: Inherits from page-level WhatsApp CTA button -->
  <form id="formPageFallback" action="/lead">
    <input type="text" name="name" required>
    <input type="tel" name="phone" required>
    <button type="submit">General Inquiries</button>
  </form>

  <script>
    var WA_NUMBER = '919591318811';
  </script>
</body>
</html>`;

  const sampleHtmlPath = path.join(fixtureDir, 'index.html');
  fs.writeFileSync(sampleHtmlPath, testHtml, 'utf8');

  // Test 1: Scanner extracts WhatsApp numbers from specific form buttons
  let scan;
  await it('Scanner detects specific WhatsApp numbers from each individual form button', () => {
    scan = scanProject(fixtureDir);
    assert.strictEqual(scan.forms.length, 6, 'Should detect 6 forms');

    const f1 = scan.forms.find(f => f.formId === 'formSpine');
    assert.strictEqual(f1.detectedWhatsapp, '919591318811', 'Form 1 button data-whatsapp must be 919591318811');

    const f2 = scan.forms.find(f => f.formId === 'formSports');
    assert.strictEqual(f2.detectedWhatsapp, '918310755474', 'Form 2 button data-phone must be 918310755474');

    const f3 = scan.forms.find(f => f.formId === 'formEmergency');
    assert.strictEqual(f3.detectedWhatsapp, '919988776655', 'Form 3 hidden input must be 919988776655');

    const f4 = scan.forms.find(f => f.formId === 'formDirectLink');
    assert.strictEqual(f4.detectedWhatsapp, '919123456789', 'Form 4 href wa.me link must be 919123456789');

    const f5 = scan.forms.find(f => f.formId === 'formContainerWa');
    assert.strictEqual(f5.detectedWhatsapp, '919876543210', 'Form 5 data-whatsapp on form must be 919876543210');

    const f6 = scan.forms.find(f => f.formId === 'formPageFallback');
    assert.strictEqual(f6.detectedWhatsapp, '919591318811', 'Form 6 should inherit page-level CTA number');
  });

  // Test 2: Project-level primary detected WhatsApp aggregation
  await it('Scanner identifies primary site WhatsApp number and populates liveState', () => {
    assert.strictEqual(scan.detectedWhatsapp, '919591318811', 'Primary detected number should be 919591318811');
    assert.strictEqual(scan.liveState.whatsapp.detectedNumber, '919591318811', 'liveState.whatsapp.detectedNumber must match');
  });

  // Test 3: Form Archetypes contain detected WhatsApp numbers
  await it('Form archetypes carry detected WhatsApp numbers for GUI and CLI presentation', () => {
    const arch1 = scan.formArchetypes.find(a => a.formId === 'formSpine');
    assert.ok(arch1, 'formSpine archetype must exist');
    assert.strictEqual(arch1.detectedWhatsapp, '919591318811');

    const arch2 = scan.formArchetypes.find(a => a.formId === 'formSports');
    assert.ok(arch2, 'formSports archetype must exist');
    assert.strictEqual(arch2.detectedWhatsapp, '918310755474');
  });

  // Test 4: Injection without manual WhatsApp number automatically uses auto-detected number
  await it('applyInjection automatically falls back to auto-detected number when unconfigured', () => {
    const res = applyInjection(fixtureDir, [sampleHtmlPath], {
      gtmId: 'GTM-TEST1234'
      // note: whatsappNumber deliberately omitted to verify auto-detection fallback!
    });
    assert.ok(res.success, 'applyInjection should succeed');

    const injected = fs.readFileSync(sampleHtmlPath, 'utf8');
    assert.ok(injected.includes('919591318811'), 'Injected config should include auto-detected 919591318811');
  });

  // Cleanup
  try {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
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
