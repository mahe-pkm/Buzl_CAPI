/**
 * Lightweight Local Web GUI Server
 * Zero dependencies — built purely with Node.js built-ins
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { scanProject } = require('../core/scanner');
const { applyInjection, removeTracking, removeService } = require('../core/injector');
const { runVerification, testDispatch, testIndividualForm } = require('../core/tester');
const { restoreBackup, restoreLatestBackup, deleteBackup, listBackups, manualBackup } = require('../core/rollback');

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${start} "${url}"`, (err) => {
    if (err) {
      console.log(`Could not automatically open browser. Please open: ${url}`);
    }
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function startGuiServer(rootDir, port = 3333) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // 1. API: Scan project
      if (pathname === '/api/scan' && req.method === 'GET') {
        const scan = scanProject(rootDir);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(scan));
        return;
      }

      // 1.5. API: Live State of Site
      if (pathname === '/api/live-state' && req.method === 'GET') {
        const scan = scanProject(rootDir);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(scan.liveState));
        return;
      }

      // 2. API: Get Apps Script Code
      if (pathname === '/api/apps-script' && req.method === 'GET') {
        const gsPath = path.join(__dirname, '..', 'templates', 'GoogleAppsScript.gs');
        const code = fs.readFileSync(gsPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code }));
        return;
      }

      // 3. API: Inject & Run Self-Tests
      if (pathname === '/api/inject' && req.method === 'POST') {
        const config = await parseJsonBody(req);
        const scan = scanProject(rootDir);
        const htmlFilePaths = scan.files.map(f => f.filePath);

        if (htmlFilePaths.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'No HTML files found to inject.' }));
          return;
        }

        const injectResult = applyInjection(rootDir, htmlFilePaths, config);
        const testReport = await runVerification(rootDir, htmlFilePaths, config);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          injectResult,
          testReport
        }));
        return;
      }

      // 4. API: Clean Uninstall / Remove All Tracking
      if (pathname === '/api/remove-tracking' && req.method === 'POST') {
        const scan = scanProject(rootDir);
        const htmlFilePaths = scan.files.map(f => f.filePath);
        const result = removeTracking(rootDir, htmlFilePaths);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 4.5. API: Selectively Remove Single Tracking Service
      if (pathname === '/api/remove-service' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = removeService(rootDir, body.service || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 5. API: List Named Backups
      if (pathname === '/api/backups' && req.method === 'GET') {
        const backups = listBackups(rootDir);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ backups }));
        return;
      }

      // 6. API: Create Named Backup
      if (pathname === '/api/backup' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const backupResult = manualBackup(rootDir, body.name || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(backupResult));
        return;
      }

      // 7. API: Restore Backup (Specific or Latest)
      if (pathname === '/api/restore' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = restoreBackup(rootDir, body.backupDirName || 'latest');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 8. API: Delete Specific Backup
      if (pathname === '/api/delete-backup' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const result = deleteBackup(rootDir, body.backupDirName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // 9. API: Test Individual Form Submission
      if (pathname === '/api/test-form' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const scan = scanProject(rootDir);
        const existingConfig = (scan.files.find(f => f.existingConfig) || {}).existingConfig || {};
        const mergedConfig = Object.assign({}, existingConfig, body.config || {});
        const results = await testIndividualForm(rootDir, body.formId, body.formFields || {}, mergedConfig, { pagePath: body.pagePath });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, results }));
        return;
      }

      // 10. API: Live Test Lead Submit (Global)
      if (pathname === '/api/test-submit' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const scan = scanProject(rootDir);
        const existingConfig = (scan.files.find(f => f.existingConfig) || {}).existingConfig || {};
        const mergedConfig = Object.assign({}, existingConfig, body.config || {});
        const results = await testDispatch(rootDir, mergedConfig, body.lead || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, results }));
        return;
      }

      // 5. Static Files
      let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = MIME_TYPES[ext] || 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // Not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');

    } catch (err) {
      console.error('[GUI Server Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  server.listen(port, () => {
    const localUrl = `http://localhost:${port}`;
    console.log(`\n⚡ Buzl Tracker GUI is running at: ${localUrl}`);
    console.log('Press Ctrl+C to stop the server.\n');
    openBrowser(localUrl);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      startGuiServer(rootDir, port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  return server;
}

module.exports = { startGuiServer };
