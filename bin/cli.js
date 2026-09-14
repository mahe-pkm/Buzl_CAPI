#!/usr/bin/env node

/**
 * ============================================================================
 * BUZL TRACKER & CAPI CLI
 * Primary binary entry point for `npx buzl-tracker` and `npx buzl-capi`
 * 
 * Copyright (c) 2026 Buzl Digital Solutions
 * Licensed under the MIT License
 * ============================================================================
 * 
 * CLI Architecture:
 * - Positional path argument: target project folder (defaults to process.cwd())
 * - Flags:
 *     --gui, -g             Start zero-dependency Web GUI daemon on port 3333
 *     --backup, -b [name]   Create a point-in-time snapshot backup
 *     --list-backups        List all saved backups for target project
 *     --restore, -r [name]  Restore specified backup or latest snapshot
 *     --uninstall, -u       Cleanly remove all injected tracking tags from HTML
 *     --help, -h            Display detailed command reference & usage manual
 * 
 * Flow:
 * - If `--gui` is specified: Starts HTTP server and opens browser dashboard.
 * - Otherwise: Launches interactive ANSI terminal wizard with step-by-step prompts.
 * ============================================================================
 */

const path = require('path');
const pkg = require('../package.json');
const { runTerminalWizard } = require('../src/cli/terminal');
const { startGuiServer } = require('../src/gui/server');
const { restoreBackup, restoreLatestBackup, listBackups, manualBackup } = require('../src/core/rollback');
const { removeTracking } = require('../src/core/injector');
const { scanProject } = require('../src/core/scanner');

// Extract CLI arguments
const args = process.argv.slice(2);

// Check for explicit directory argument, or fallback to current working directory
const positionalArgs = args.filter(a => !a.startsWith('-'));
const rootDir = positionalArgs.length > 0 ? path.resolve(positionalArgs[0]) : process.cwd();

// ============================================================================
// COMMAND: --help / -h (Display Help Manual)
// ============================================================================
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
⚡ BUZL TRACKING & FORM DISPATCHER CLI (v${pkg.version})

USAGE:
  $ npx buzl-tracker [dir]                     Launch interactive terminal wizard
  $ npx buzl-tracker [dir] --gui               Launch local web GUI on http://localhost:3333
  $ npx buzl-tracker [dir] --backup [name]     Create a named snapshot backup
  $ npx buzl-tracker [dir] --list-backups      List all saved backups on disk
  $ npx buzl-tracker [dir] --restore [name]    Restore a specific backup or latest snapshot
  $ npx buzl-tracker [dir] --uninstall         Cleanly remove all tracking tags from site
  $ npx buzl-tracker --help                    Show this help reference manual

ARGUMENTS:
  [dir]                  Target website directory (defaults to current working directory)

OPTIONS:
  -g, --gui              Launch interactive browser GUI dashboard (port 3333)
  -b, --backup [name]    Create an immutable timestamped backup before modifications
  -r, --restore [name]   Revert HTML files to a previous snapshot or 'latest'
  -u, --uninstall        Strip GTM, Meta Pixel, runtime scripts, and form hooks
  -h, --help             Display usage guide and command summary

KEY CAPABILITIES:
  ✔ Multi-Platform Tracking: Google Tag Manager (GTM), Meta Pixel & CAPI, Google Sheets CRM, Zoho CRM
  ✔ Multi-Page Site Scanner: Resolves relative script paths across any nested subdirectory depth
  ✔ Universal WhatsApp Auto-Fetch: Discovers numbers from buttons & forms and builds pre-filled routing
  ✔ Google Sheets Multi-Tab CRM Engine: Forward layout (Handled By & Comments next to Lead Stage), 12-hour dates,
    Buzl Navy Blue (#1E4E9E) headers, full-row conditional colors, and auto-pruning empty team tabs
  ✔ 100% Zero-Risk Rollback: Automated snapshot backups prior to every file injection
`);
  process.exit(0);
}

// ============================================================================
// COMMAND: --list-backups (Inspect Saved Snapshots)
// ============================================================================
if (args.includes('--list-backups')) {
  const backups = listBackups(rootDir);
  console.log(`\n💾 Saved Backups on disk for: ${rootDir}`);
  if (backups.length === 0) {
    console.log('   No backups found.');
  } else {
    backups.forEach((b, i) => {
      console.log(`   [${i + 1}] "${b.name}" (${b.dirName}) - ${b.timestamp} [${b.filesCount} file(s)]`);
    });
  }
  console.log('');
  process.exit(0);
}

// ============================================================================
// COMMAND: --backup / -b (Create Snapshot)
// ============================================================================
const backupIdx = args.findIndex(a => a === '--backup' || a === '-b');
if (backupIdx !== -1) {
  const customName = args[backupIdx + 1] && !args[backupIdx + 1].startsWith('-') ? args[backupIdx + 1] : '';
  console.log(`💾 Creating snapshot backup ${customName ? `"${customName}"` : ''}...`);
  const result = manualBackup(rootDir, customName);
  if (result.success) {
    console.log(`✔ ${result.message}`);
  } else {
    console.error(`✖ ${result.message}`);
  }
  process.exit(result.success ? 0 : 1);
}

// ============================================================================
// COMMAND: --restore / --rollback / -r (Revert Site to Snapshot)
// ============================================================================
const restoreIdx = args.findIndex(a => a === '--restore' || a === '--rollback' || a === '-r');
if (restoreIdx !== -1) {
  const targetName = args[restoreIdx + 1] && !args[restoreIdx + 1].startsWith('-') ? args[restoreIdx + 1] : 'latest';
  console.log(`↺ Attempting to restore backup "${targetName}"...`);
  const result = restoreBackup(rootDir, targetName);
  if (result.success) {
    console.log(`✔ ${result.message}`);
  } else {
    console.error(`✖ ${result.message}`);
  }
  process.exit(result.success ? 0 : 1);
}

// ============================================================================
// COMMAND: --uninstall / -u (Cleanly Strip All Injected Tracking)
// ============================================================================
if (args.includes('--uninstall') || args.includes('-u')) {
  console.log('🧹 Cleanly removing all injected tracking from HTML files...');
  const scan = scanProject(rootDir);
  const htmlFilePaths = scan.files.map(f => f.filePath);
  const result = removeTracking(rootDir, htmlFilePaths);
  if (result.success) {
    console.log(`✔ ${result.message}`);
  } else {
    console.error(`✖ ${result.message}`);
  }
  process.exit(result.success ? 0 : 1);
}

// ============================================================================
// MODE: GUI Server vs Interactive Terminal Wizard
// ============================================================================
if (args.includes('--gui') || args.includes('-g')) {
  // Start local web GUI server on port 3333
  console.log(`⚡ Launching Buzl Tracker Web GUI for: ${rootDir}`);
  startGuiServer(rootDir);
} else {
  // Start interactive terminal wizard with step-by-step CLI prompts
  runTerminalWizard(rootDir);
}
