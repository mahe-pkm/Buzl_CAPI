/**
 * ============================================================================
 * BUZL BACKUP & SNAPSHOT MANAGER
 * Provides 100% safe file snapshots with SHA content hashing inside `.buzl/snapshots/`
 * 
 * Copyright (c) 2026 Buzl Digital Solutions
 * Licensed under the MIT License
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Compute a deterministic SHA-1 content hash across all candidate files
 */
function computeFilesHash(files, rootDir) {
  const hashSum = crypto.createHash('sha1');
  for (const filePath of files) {
    if (fs.existsSync(filePath)) {
      hashSum.update(path.relative(rootDir, filePath));
      try {
        hashSum.update(fs.readFileSync(filePath));
      } catch (e) {}
    }
  }
  return hashSum.digest('hex').substring(0, 8);
}

/**
 * Create a point-in-time snapshot backup
 * Stored in `<rootDir>/.buzl/snapshots/<timestamp>_<hash>/`
 */
function createBackup(arg1, arg2, arg3 = '') {
  let files;
  let rootDir;
  let backupName = '';

  if (Array.isArray(arg1)) {
    files = arg1;
    rootDir = arg2;
    backupName = arg3 || '';
  } else if (typeof arg1 === 'string') {
    rootDir = arg1;
    backupName = typeof arg2 === 'string' ? arg2 : '';
    const { findHtmlFiles } = require('./scanner');
    files = findHtmlFiles(rootDir);
  } else {
    files = [];
    rootDir = process.cwd();
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const hash = computeFilesHash(files, rootDir) || '00000000';
  const dirName = `${timestamp}_${hash}`;

  // Dedicated unified .buzl/snapshots directory
  const snapshotsDir = path.join(rootDir, '.buzl', 'snapshots');
  const backupDir = path.join(snapshotsDir, dirName);
  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    id: dirName,
    hash: hash,
    name: (backupName || '').trim() || `Snapshot ${new Date().toLocaleTimeString()} [${hash}]`,
    timestamp: new Date().toISOString(),
    files: []
  };

  for (const filePath of files) {
    const relPath = path.relative(rootDir, filePath);
    const destPath = path.join(backupDir, relPath);
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(filePath, destPath);
    manifest.files.push(relPath);
  }

  fs.writeFileSync(
    path.join(backupDir, 'backup-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  return {
    success: true,
    backupDir,
    dirName,
    hash,
    timestamp: manifest.timestamp,
    name: manifest.name,
    fileCount: manifest.files.length
  };
}

/**
 * List all available snapshot backups
 * Checks `.buzl/snapshots/` first, plus legacy `.buzl-backup-*` folders
 */
function listBackups(rootDir) {
  const allBackups = [];

  // 1. Primary: Check .buzl/snapshots/
  const snapshotsDir = path.join(rootDir, '.buzl', 'snapshots');
  if (fs.existsSync(snapshotsDir)) {
    try {
      const entries = fs.readdirSync(snapshotsDir);
      for (const e of entries) {
        const dirPath = path.join(snapshotsDir, e);
        if (fs.statSync(dirPath).isDirectory()) {
          let manifest = null;
          try {
            const mPath = path.join(dirPath, 'backup-manifest.json');
            if (fs.existsSync(mPath)) {
              manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
            }
          } catch (err) {}

          allBackups.push({
            id: (manifest && manifest.id) || e,
            dirName: e,
            hash: (manifest && manifest.hash) || (e.split('_')[1] || ''),
            fullPath: dirPath,
            name: (manifest && manifest.name) || e,
            timestamp: (manifest && manifest.timestamp) || '',
            filesCount: (manifest && manifest.files && manifest.files.length) || 0,
            isLegacy: false,
            manifest
          });
        }
      }
    } catch (e) {}
  }

  // 2. Fallback: Check legacy root-level `.buzl-backup-*` directories
  try {
    const rootEntries = fs.readdirSync(rootDir);
    for (const e of rootEntries) {
      if (e.startsWith('.buzl-backup-')) {
        const dirPath = path.join(rootDir, e);
        if (fs.statSync(dirPath).isDirectory()) {
          let manifest = null;
          try {
            const mPath = path.join(dirPath, 'backup-manifest.json');
            if (fs.existsSync(mPath)) {
              manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
            }
          } catch (err) {}

          allBackups.push({
            id: e,
            dirName: e,
            hash: (manifest && manifest.hash) || '',
            fullPath: dirPath,
            name: (manifest && manifest.name) || e.replace('.buzl-backup-', ''),
            timestamp: (manifest && manifest.timestamp) || '',
            filesCount: (manifest && manifest.files && manifest.files.length) || 0,
            isLegacy: true,
            manifest
          });
        }
      }
    }
  } catch (e) {}

  // Sort newest first
  allBackups.sort((a, b) => b.dirName.localeCompare(a.dirName));
  return allBackups;
}

/**
 * Restore a specific snapshot or 'latest'
 */
function restoreBackup(rootDir, identifier) {
  const backups = listBackups(rootDir);
  if (backups.length === 0) {
    return { success: false, message: 'No backups found to restore.' };
  }

  let targetBackup = backups[0];
  if (identifier && identifier !== 'latest') {
    targetBackup = backups.find(b =>
      b.dirName === identifier ||
      b.name === identifier ||
      b.hash === identifier ||
      b.id === identifier
    );
    if (!targetBackup) {
      return { success: false, message: `Backup "${identifier}" not found.` };
    }
  }

  const manifest = targetBackup.manifest;
  if (!manifest || !manifest.files) {
    return { success: false, message: 'Backup manifest corrupted or missing.' };
  }

  let restoredCount = 0;
  for (const relFile of manifest.files) {
    const src = path.join(targetBackup.fullPath, relFile);
    const dest = path.join(rootDir, relFile);
    if (fs.existsSync(src)) {
      const destDir = path.dirname(dest);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      restoredCount++;
    }
  }

  return {
    success: true,
    backupUsed: targetBackup.dirName,
    backupName: targetBackup.name,
    hash: targetBackup.hash,
    restoredCount,
    message: `Successfully restored ${restoredCount} file(s) from "${targetBackup.name}" [${targetBackup.hash || targetBackup.dirName}].`
  };
}

/**
 * Restore the latest snapshot
 */
function restoreLatestBackup(rootDir) {
  return restoreBackup(rootDir, 'latest');
}

/**
 * Delete a specific backup
 */
function deleteBackup(rootDir, identifier) {
  const backups = listBackups(rootDir);
  const target = backups.find(b =>
    b.dirName === identifier ||
    b.name === identifier ||
    b.id === identifier ||
    b.hash === identifier
  );

  if (!target) {
    return { success: false, message: `Backup "${identifier}" not found.` };
  }

  try {
    fs.rmSync(target.fullPath, { recursive: true, force: true });
    return { success: true, message: `Backup "${target.name}" deleted successfully.` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Create a manual named backup
 */
function manualBackup(rootDir, backupName = '') {
  const { findHtmlFiles } = require('./scanner');
  const files = findHtmlFiles(rootDir);
  if (files.length === 0) {
    return { success: false, message: 'No HTML files found to backup.' };
  }
  const result = createBackup(files, rootDir, backupName);
  return {
    success: true,
    backupDir: result.backupDir,
    dirName: result.dirName,
    hash: result.hash,
    name: result.name,
    fileCount: result.fileCount,
    message: `Snapshot "${result.name}" created with ${result.fileCount} file(s) [SHA: ${result.hash}].`
  };
}

module.exports = {
  createBackup,
  computeFilesHash,
  listBackups,
  restoreBackup,
  restoreLatestBackup,
  deleteBackup,
  manualBackup
};
