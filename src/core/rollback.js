/**
 * Backup & Rollback Manager
 * Provides 100% safe file backups and instant restoration
 */
const fs = require('fs');
const path = require('path');

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
  const backupDir = path.join(rootDir, `.buzl-backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    name: (backupName || '').trim() || `Snapshot ${new Date().toLocaleTimeString()}`,
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

  return { success: true, backupDir, timestamp, name: manifest.name, fileCount: manifest.files.length };
}

function listBackups(rootDir) {
  try {
    const entries = fs.readdirSync(rootDir);
    const backups = entries
      .filter(e => e.startsWith('.buzl-backup-'))
      .map(e => {
        const dirPath = path.join(rootDir, e);
        let manifest = null;
        try {
          const mPath = path.join(dirPath, 'backup-manifest.json');
          if (fs.existsSync(mPath)) {
            manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
          }
        } catch (err) {}
        return {
          dirName: e,
          fullPath: dirPath,
          name: (manifest && manifest.name) || e.replace('.buzl-backup-', ''),
          timestamp: (manifest && manifest.timestamp) || '',
          filesCount: (manifest && manifest.files && manifest.files.length) || 0,
          manifest
        };
      })
      .sort((a, b) => b.dirName.localeCompare(a.dirName));
    return backups;
  } catch (e) {
    return [];
  }
}

function restoreBackup(rootDir, backupDirName) {
  const backups = listBackups(rootDir);
  if (backups.length === 0) {
    return { success: false, message: 'No backups found to restore.' };
  }

  let targetBackup = backups[0];
  if (backupDirName && backupDirName !== 'latest') {
    targetBackup = backups.find(b => b.dirName === backupDirName || b.name === backupDirName);
    if (!targetBackup) {
      return { success: false, message: `Backup "${backupDirName}" not found.` };
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
    restoredCount,
    message: `Successfully restored ${restoredCount} file(s) from "${targetBackup.name}" (${targetBackup.dirName}).`
  };
}

function restoreLatestBackup(rootDir) {
  return restoreBackup(rootDir, 'latest');
}

function deleteBackup(rootDir, backupDirName) {
  if (!backupDirName || !backupDirName.startsWith('.buzl-backup-')) {
    return { success: false, message: 'Invalid backup directory name.' };
  }
  const dirPath = path.join(rootDir, backupDirName);
  if (!fs.existsSync(dirPath)) {
    return { success: false, message: 'Backup directory does not exist.' };
  }
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return { success: true, message: `Backup ${backupDirName} deleted successfully.` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

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
    name: result.name,
    fileCount: result.fileCount,
    message: `Backup "${result.name}" created successfully with ${result.fileCount} file(s) in ${path.basename(result.backupDir)}.`
  };
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  restoreLatestBackup,
  deleteBackup,
  manualBackup
};
