/**
 * Automated Tests for Package Version & Release Timestamp Visibility
 */
const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');
const pkg = require('../package.json');
const { scanProject } = require('../src/core/scanner');

console.log('🧪 Running Package Version & Release Metadata Tests...\n');

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

// Test 1: package.json has valid version and updatedAt
it('package.json defines valid semver version and non-empty updatedAt', () => {
  assert.ok(pkg.version, 'package.json must specify version');
  assert.match(pkg.version, /^\d+\.\d+\.\d+/, 'Version must be semantic versioning string');
  assert.ok(pkg.updatedAt, 'package.json must specify updatedAt release timestamp');
  assert.ok(pkg.updatedAt.length > 5, 'updatedAt must be a descriptive timestamp');
});

// Test 2: bin/cli.js --version outputs version and updatedAt
it('bin/cli.js -v and --version display package name, version, and updatedAt', () => {
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
  const vOutput = execSync(`node "${cliPath}" -v`, { encoding: 'utf8' }).trim();
  const versionOutput = execSync(`node "${cliPath}" --version`, { encoding: 'utf8' }).trim();

  assert.ok(vOutput.includes(pkg.name), '-v output must include package name');
  assert.ok(vOutput.includes(pkg.version), '-v output must include package version');
  assert.ok(vOutput.includes(pkg.updatedAt), '-v output must include updatedAt');
  assert.strictEqual(vOutput, versionOutput, '-v and --version outputs must be identical');
});

// Test 3: bin/cli.js --help includes version and release timestamp in header
it('bin/cli.js --help includes version and release timestamp in header', () => {
  const cliPath = path.join(__dirname, '..', 'bin', 'cli.js');
  const helpOutput = execSync(`node "${cliPath}" --help`, { encoding: 'utf8' });

  assert.ok(helpOutput.includes(`v${pkg.version}`), 'Help header must include version');
  assert.ok(helpOutput.includes(pkg.updatedAt), 'Help header must include updatedAt');
  assert.ok(helpOutput.includes('--version'), 'Help options must list --version flag');
});

// Test 4: scanner.js scanProject exposes version and updatedAt
it('scanner scanProject() exposes version and updatedAt in scan result', () => {
  const sampleDir = path.join(__dirname, 'test-sample');
  const scan = scanProject(sampleDir);

  assert.strictEqual(scan.version, pkg.version, 'scanProject result must contain package version');
  assert.strictEqual(scan.updatedAt, pkg.updatedAt, 'scanProject result must contain package updatedAt');
});

console.log(`\n========================================\nResults: ${passed}/${total} passed\n========================================\n`);
if (passed !== total) process.exit(1);
