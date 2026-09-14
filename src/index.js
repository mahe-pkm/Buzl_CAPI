/**
 * ============================================================================
 * BUZL TRACKER & CAPI SDK
 * Programmatic Node.js API for automated analytics & CRM injection
 * 
 * Copyright (c) 2026 Buzl Digital Solutions
 * Licensed under the MIT License
 * ============================================================================
 */

const { scanProject, findHtmlFiles, analyzeHtmlFile } = require('./core/scanner');
const { injectHtml, applyInjection, removeTracking, removeService } = require('./core/injector');
const { runVerification, pingUrl, testDispatch, testIndividualForm } = require('./core/tester');
const { createBackup, restoreBackup, restoreLatestBackup, deleteBackup, listBackups, manualBackup } = require('./core/rollback');
const { startGuiServer } = require('./gui/server');
const { runTerminalWizard } = require('./cli/terminal');

module.exports = {
  // Scanner module: multi-page HTML parsing, live state detection, and form discovery
  scanProject,
  findHtmlFiles,
  analyzeHtmlFile,

  // Injector module: AST-safe HTML injection and selective service removal
  injectHtml,
  applyInjection,
  removeTracking,
  removeService,

  // Tester module: tag verification, dispatch testing, and webhook reachability pings
  runVerification,
  pingUrl,
  testDispatch,
  testIndividualForm,

  // Rollback module: snapshot creation, named backups, and zero-risk point-in-time restores
  createBackup,
  restoreBackup,
  restoreLatestBackup,
  deleteBackup,
  listBackups,
  manualBackup,

  // User interfaces: web GUI server and terminal wizard
  startGuiServer,
  runTerminalWizard
};
