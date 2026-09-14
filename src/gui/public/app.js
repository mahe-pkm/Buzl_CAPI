document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trackingForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnScan = document.getElementById('btnScan');
  const fileList = document.getElementById('fileList');
  const fileBadge = document.getElementById('fileBadge');
  const testConsole = document.getElementById('testConsole');
  const testSummaryBadge = document.getElementById('testSummaryBadge');

  // Live State Bar elements
  const liveStateRootDir = document.getElementById('liveStateRootDir');
  const liveStateChips = document.getElementById('liveStateChips');
  const backupsCountBadge = document.getElementById('backupsCountBadge');

  // Quick Test Lead elements
  const btnTestSubmit = document.getElementById('btnTestSubmit');
  const liveTestBadge = document.getElementById('liveTestBadge');
  const testDispatchResults = document.getElementById('testDispatchResults');
  const testLeadPhone = document.getElementById('testLeadPhone');
  const testLeadName = document.getElementById('testLeadName');
  const testLeadService = document.getElementById('testLeadService');

  [testLeadPhone, testLeadName, testLeadService].forEach(el => {
    if (el) el.addEventListener('input', () => { el.dataset.userEdited = 'true'; });
  });

  // Individual Form elements
  const formsCountBadge = document.getElementById('formsCountBadge');
  const individualFormsList = document.getElementById('individualFormsList');

  // Backups Modal elements
  const btnOpenBackups = document.getElementById('btnOpenBackups');
  const backupsModal = document.getElementById('backupsModal');
  const closeBackupsModal = document.getElementById('closeBackupsModal');
  const btnCreateNamedBackup = document.getElementById('btnCreateNamedBackup');
  const customBackupName = document.getElementById('customBackupName');
  const backupsTableBody = document.getElementById('backupsTableBody');

  // Uninstall Modal elements
  const btnUninstallTracking = document.getElementById('btnUninstallTracking');
  const uninstallModal = document.getElementById('uninstallModal');
  const closeUninstallModal = document.getElementById('closeUninstallModal');
  const btnCancelUninstall = document.getElementById('btnCancelUninstall');
  const btnConfirmUninstall = document.getElementById('btnConfirmUninstall');

  // Script Modal elements
  const scriptModal = document.getElementById('scriptModal');
  const openScriptModal = document.getElementById('openScriptModal');
  const closeScriptModal = document.getElementById('closeScriptModal');
  const copyScriptCode = document.getElementById('copyScriptCode');
  const scriptCodeDisplay = document.getElementById('scriptCodeDisplay');

  // Custom Confirm Modal elements
  const customConfirmModal = document.getElementById('customConfirmModal');
  const confirmModalTitle = document.getElementById('confirmModalTitle');
  const confirmModalMessage = document.getElementById('confirmModalMessage');
  const confirmModalConfirmBtn = document.getElementById('confirmModalConfirmBtn');
  const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
  const closeConfirmModal = document.getElementById('closeConfirmModal');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // Verification Report & Export Elements
  const btnExportJson = document.getElementById('btnExportJson');
  const btnExportPdf = document.getElementById('btnExportPdf');
  const kpiTotalChecks = document.getElementById('kpiTotalChecks');
  const kpiPassedChecks = document.getElementById('kpiPassedChecks');
  const kpiFailedChecks = document.getElementById('kpiFailedChecks');
  const kpiCapiStatus = document.getElementById('kpiCapiStatus');

  // CAPI Inspector Elements
  const capiInspectStatusBadge = document.getElementById('capiInspectStatusBadge');
  const capiInspectLatencyBadge = document.getElementById('capiInspectLatencyBadge');
  const capiPayloadDisplay = document.getElementById('capiPayloadDisplay');
  const capiResponseDisplay = document.getElementById('capiResponseDisplay');
  const capiLogsDisplay = document.getElementById('capiLogsDisplay');
  const btnCopyCapiPayload = document.getElementById('btnCopyCapiPayload');
  const btnCopyCapiResponse = document.getElementById('btnCopyCapiResponse');
  const btnCopyCapiLogs = document.getElementById('btnCopyCapiLogs');

  let currentVerificationReport = null;
  let currentCapiData = null;

  let scriptTemplateText = '';
  let pendingConfirmCallback = null;

  const siteLocationInput = document.getElementById('siteLocation');
  const columnHierarchyPreview = document.getElementById('columnHierarchyPreview');
  const dynamicFieldsChecklist = document.getElementById('dynamicFieldsChecklist');

  let activeDynamicFields = [];
  let currentScanData = null;

  // ==========================================================================
  // In-App Toast Notification Utility (Token-driven)
  // ==========================================================================
  function showToast(title, message, type = 'info', duration = 3800) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSymbol = '#icon-brand-buzl';
    if (type === 'success') iconSymbol = '#icon-check';
    else if (type === 'error') iconSymbol = '#icon-x';

    toast.innerHTML = `
      <svg class="icon-sm toast-icon"><use href="${iconSymbol}"/></svg>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, duration);
  }

  // ==========================================================================
  // Custom Confirmation Modal (WCAG 2.2 AA compliant)
  // ==========================================================================
  function showConfirmDialog({ title, message, confirmText = 'Confirm', onConfirm }) {
    if (!customConfirmModal) {
      if (confirm(`${title}\n\n${message}`)) {
        if (onConfirm) onConfirm();
      }
      return;
    }

    if (confirmModalTitle) confirmModalTitle.textContent = title;
    if (confirmModalMessage) confirmModalMessage.textContent = message;
    if (confirmModalConfirmBtn) confirmModalConfirmBtn.textContent = confirmText;

    pendingConfirmCallback = onConfirm;
    customConfirmModal.classList.remove('hidden');
    if (confirmModalConfirmBtn) confirmModalConfirmBtn.focus();
  }

  function hideConfirmDialog() {
    if (customConfirmModal) customConfirmModal.classList.add('hidden');
    pendingConfirmCallback = null;
  }

  if (confirmModalConfirmBtn) {
    confirmModalConfirmBtn.addEventListener('click', () => {
      const cb = pendingConfirmCallback;
      hideConfirmDialog();
      if (cb) cb();
    });
  }

  if (confirmModalCancelBtn) confirmModalCancelBtn.addEventListener('click', hideConfirmDialog);
  if (closeConfirmModal) closeConfirmModal.addEventListener('click', hideConfirmDialog);

  // Keyboard accessibility: Escape to dismiss dialogs
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (customConfirmModal && !customConfirmModal.classList.contains('hidden')) hideConfirmDialog();
      if (backupsModal && !backupsModal.classList.contains('hidden')) backupsModal.classList.add('hidden');
      if (uninstallModal && !uninstallModal.classList.contains('hidden')) uninstallModal.classList.add('hidden');
      if (scriptModal && !scriptModal.classList.contains('hidden')) scriptModal.classList.add('hidden');
    }
  });

  // ==========================================================================
  // Console Tabbed Navigation (WAI-ARIA Compliant with Arrow Key Navigation)
  // ==========================================================================
  const tabButtons = Array.from(document.querySelectorAll('.console-tab-btn'));
  const tabContents = document.querySelectorAll('.console-tab-content');

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });
  }

  // Initialize roving tabindex on tabs
  tabButtons.forEach(btn => {
    const isActive = btn.classList.contains('active');
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (target) switchTab(target);
    });

    btn.addEventListener('keydown', (e) => {
      let targetIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        targetIndex = (index + 1) % tabButtons.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        targetIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        targetIndex = tabButtons.length - 1;
      }

      if (targetIndex !== -1) {
        const targetBtn = tabButtons[targetIndex];
        targetBtn.focus();
        switchTab(targetBtn.dataset.tab);
      }
    });
  });

  // ==========================================================================
  // Verification Report KPIs & CAPI Inspector Rendering
  // ==========================================================================
  function renderVerificationKpis(report) {
    if (!report) return;
    currentVerificationReport = report;

    if (kpiTotalChecks) kpiTotalChecks.textContent = report.total || 0;
    if (kpiPassedChecks) kpiPassedChecks.textContent = report.passedCount || 0;
    if (kpiFailedChecks) kpiFailedChecks.textContent = report.failedCount || 0;

    if (btnExportJson) btnExportJson.disabled = false;
    if (btnExportPdf) btnExportPdf.disabled = false;
  }

  function renderCapiInspector(capi) {
    if (!capi) return;
    currentCapiData = capi;

    // 1. Update Badges
    if (capiInspectStatusBadge) {
      if (capi.ok) {
        capiInspectStatusBadge.className = 'badge badge-success';
        capiInspectStatusBadge.textContent = capi.status ? `HTTP ${capi.status} OK` : 'Verified Active';
      } else if (capi.tested && capi.status === 0) {
        capiInspectStatusBadge.className = 'badge badge-neutral';
        capiInspectStatusBadge.textContent = 'Offline / Standby';
      } else if (capi.tested && !capi.ok) {
        capiInspectStatusBadge.className = 'badge badge-danger';
        capiInspectStatusBadge.textContent = capi.status ? `HTTP ${capi.status}` : 'Error';
      } else if (capi.configured) {
        capiInspectStatusBadge.className = 'badge badge-info';
        capiInspectStatusBadge.textContent = 'Configured';
      } else {
        capiInspectStatusBadge.className = 'badge badge-neutral';
        capiInspectStatusBadge.textContent = 'Disabled';
      }
    }

    if (kpiCapiStatus) {
      if (capi.ok) {
        kpiCapiStatus.className = 'badge badge-success';
        kpiCapiStatus.textContent = 'Connected';
      } else if (capi.configured) {
        kpiCapiStatus.className = 'badge badge-info';
        kpiCapiStatus.textContent = 'Configured';
      } else {
        kpiCapiStatus.className = 'badge badge-neutral';
        kpiCapiStatus.textContent = 'Inactive';
      }
    }

    if (capiInspectLatencyBadge) {
      if (capi.latencyMs > 0) {
        capiInspectLatencyBadge.classList.remove('hidden');
        capiInspectLatencyBadge.className = 'badge badge-neutral';
        capiInspectLatencyBadge.textContent = `⚡ ${capi.latencyMs}ms`;
      } else {
        capiInspectLatencyBadge.classList.add('hidden');
      }
    }

    // 2. Render CAPI Payload
    if (capiPayloadDisplay) {
      if (capi.payload) {
        capiPayloadDisplay.textContent = JSON.stringify(capi.payload, null, 2);
      } else {
        capiPayloadDisplay.textContent = '// No CAPI payload generated yet. Enable Buzl CAPI and run verification.';
      }
    }

    // 3. Render CAPI Response
    if (capiResponseDisplay) {
      if (capi.response) {
        capiResponseDisplay.textContent = typeof capi.response === 'object'
          ? JSON.stringify(capi.response, null, 2)
          : String(capi.response);
      } else if (capi.message) {
        capiResponseDisplay.textContent = JSON.stringify({ message: capi.message, status: capi.status || 0 }, null, 2);
      } else {
        capiResponseDisplay.textContent = '// No CAPI server response recorded yet.';
      }
    }

    // 4. Render Registered Console Logs
    if (capiLogsDisplay) {
      if (capi.formattedAuditLog) {
        capiLogsDisplay.innerHTML = '';
        const lines = capi.formattedAuditLog.split('\n');
        lines.forEach(line => {
          const row = document.createElement('div');
          row.className = 'log-row';
          if (line.startsWith('===') || line.startsWith('---')) {
            row.classList.add('log-audit-border');
            row.textContent = line;
          } else if (line.includes('BUZL CAPI LIVE DISPATCH')) {
            row.classList.add('log-audit-title');
            row.textContent = line;
          } else if (line.includes('[Executing')) {
            row.classList.add('log-audit-status');
            row.textContent = line;
          } else if (line.includes('CAPI VERIFICATION RESULT')) {
            row.classList.add('log-audit-banner');
            row.textContent = line;
          } else if (line.startsWith('- ')) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > -1) {
              const keyPart = line.slice(0, colonIdx + 1);
              const valPart = line.slice(colonIdx + 1).trim();

              const keySpan = document.createElement('span');
              keySpan.className = 'log-audit-key';
              keySpan.textContent = keyPart + ' ';

              const valSpan = document.createElement('span');
              if (valPart.includes('201 Created') || valPart.includes('200 OK')) {
                valSpan.className = 'log-audit-201';
              } else if (valPart.startsWith('http')) {
                valSpan.className = 'log-audit-url';
              } else if (valPart.startsWith('{') || valPart.startsWith('[')) {
                valSpan.className = 'log-audit-json';
              } else {
                valSpan.className = 'log-audit-val';
              }
              valSpan.textContent = valPart;

              row.appendChild(keySpan);
              row.appendChild(valSpan);
            } else {
              row.textContent = line;
            }
          } else if (line.trim() === '') {
            row.innerHTML = '&nbsp;';
          } else {
            row.classList.add('log-info');
            row.textContent = line;
          }
          capiLogsDisplay.appendChild(row);
        });
      } else {
        const logs = capi.logs || [];
        if (logs.length > 0) {
          capiLogsDisplay.innerHTML = '';
          logs.forEach(logLine => {
            const row = document.createElement('div');
            row.className = 'log-row';
            if (logLine.includes('[CAPI-INIT]')) row.classList.add('log-info');
            else if (logLine.includes('[CAPI-RESPONSE]') || logLine.includes('[CAPI-ACK]')) row.classList.add('log-success');
            else if (logLine.includes('[CAPI-WARN]')) row.classList.add('log-warn');
            else if (logLine.includes('[CAPI-ERROR]')) row.classList.add('log-error');
            else row.classList.add('log-info');

            row.textContent = logLine;
            capiLogsDisplay.appendChild(row);
          });
        } else {
          capiLogsDisplay.innerHTML = '<div class="log-row log-info">[STANDBY] Waiting for verification or test dispatch events...</div>';
        }
      }
    }
  }

  // ==========================================================================
  // Inspector Sub-tab Navigation
  // ==========================================================================
  const inspectorTabButtons = document.querySelectorAll('.inspector-tab-btn');
  const inspectorViews = {
    payload: document.getElementById('inspectViewPayload'),
    response: document.getElementById('inspectViewResponse'),
    logs: document.getElementById('inspectViewLogs')
  };

  inspectorTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.inspect;
      inspectorTabButtons.forEach(b => {
        const isActive = b.dataset.inspect === target;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      Object.keys(inspectorViews).forEach(key => {
        if (inspectorViews[key]) {
          inspectorViews[key].classList.toggle('hidden', key !== target);
        }
      });
    });
  });

  // Copy Buttons for Inspector
  if (btnCopyCapiPayload && capiPayloadDisplay) {
    btnCopyCapiPayload.addEventListener('click', () => {
      navigator.clipboard.writeText(capiPayloadDisplay.textContent).then(() => {
        btnCopyCapiPayload.innerHTML = '<svg class="icon-xs" style="color:var(--color-success-accessible);"><use href="#icon-check"/></svg> <span>Copied!</span>';
        showToast('Copied', 'CAPI JSON Payload copied to clipboard', 'success');
        setTimeout(() => {
          btnCopyCapiPayload.innerHTML = '<svg class="icon-xs"><use href="#icon-clipboard"/></svg> <span>Copy Payload</span>';
        }, 2000);
      });
    });
  }

  if (btnCopyCapiResponse && capiResponseDisplay) {
    btnCopyCapiResponse.addEventListener('click', () => {
      navigator.clipboard.writeText(capiResponseDisplay.textContent).then(() => {
        btnCopyCapiResponse.innerHTML = '<svg class="icon-xs" style="color:var(--color-success-accessible);"><use href="#icon-check"/></svg> <span>Copied!</span>';
        showToast('Copied', 'CAPI Response copied to clipboard', 'success');
        setTimeout(() => {
          btnCopyCapiResponse.innerHTML = '<svg class="icon-xs"><use href="#icon-clipboard"/></svg> <span>Copy Response</span>';
        }, 2000);
      });
    });
  }

  if (btnCopyCapiLogs && capiLogsDisplay) {
    btnCopyCapiLogs.addEventListener('click', () => {
      navigator.clipboard.writeText(capiLogsDisplay.textContent).then(() => {
        btnCopyCapiLogs.innerHTML = '<svg class="icon-xs" style="color:var(--color-success-accessible);"><use href="#icon-check"/></svg> <span>Copied!</span>';
        showToast('Copied', 'Console Logs copied to clipboard', 'success');
        setTimeout(() => {
          btnCopyCapiLogs.innerHTML = '<svg class="icon-xs"><use href="#icon-clipboard"/></svg> <span>Copy Logs</span>';
        }, 2000);
      });
    });
  }

  // ==========================================================================
  // Automated Verification Report Export: JSON & Printable PDF
  // ==========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function exportReportJson() {
    if (!currentVerificationReport) {
      showToast('Export Error', 'Please run automated verification first to generate a report.', 'error');
      return;
    }

    const exportData = {
      reportTitle: 'BUZL CAPI Suite — Automated Verification & Compliance Audit Report',
      version: '0.1.2',
      generatedAt: new Date().toISOString(),
      projectRoot: (liveStateRootDir ? liveStateRootDir.textContent : '') || 'Workspace Root',
      summary: {
        totalChecks: currentVerificationReport.total || 0,
        passedChecks: currentVerificationReport.passedCount || 0,
        failedChecks: currentVerificationReport.failedCount || 0,
        allPassed: !!currentVerificationReport.allPassed,
        passRate: currentVerificationReport.total ? Math.round((currentVerificationReport.passedCount / currentVerificationReport.total) * 100) + '%' : '0%'
      },
      activeConfiguration: getCurrentConfig(),
      tests: currentVerificationReport.tests || [],
      capiTelemetry: currentVerificationReport.capi || currentCapiData || { configured: false }
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `buzl-verification-report-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Report Exported', 'Saved as structured JSON document', 'success');
  }

  function exportReportPdf() {
    if (!currentVerificationReport) {
      showToast('Export Error', 'Please run automated verification first to generate a report.', 'error');
      return;
    }

    const report = currentVerificationReport;
    const capi = report.capi || currentCapiData || {};
    const timestamp = new Date().toLocaleString();
    const projectPath = (liveStateRootDir ? liveStateRootDir.textContent : '') || 'Workspace Root';
    const passRate = report.total ? Math.round((report.passedCount / report.total) * 100) : 0;
    const statusColor = report.allPassed ? '#087f5b' : '#b02316';

    let testRowsHtml = '';
    (report.tests || []).forEach((t, i) => {
      const iconText = t.passed ? '✔ PASS' : '✖ FAIL';
      const badgeStyle = t.passed
        ? 'background:#e6fcf5; color:#087f5b; border:1px solid #b2f2bb;'
        : 'background:#fff5f5; color:#b02316; border:1px solid #ffc9c9;';
      testRowsHtml += `
        <tr style="border-bottom:1px solid #e5eaef;">
          <td style="padding:6px 10px; font-family:monospace; color:#5a6a85;">#${i + 1}</td>
          <td style="padding:6px 10px; font-weight:600; color:#2a3547;">${escapeHtml(t.name)}</td>
          <td style="padding:6px 10px; text-align:center;"><span style="padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; ${badgeStyle}">${iconText}</span></td>
          <td style="padding:6px 10px; font-size:11px; color:#5a6a85;">${escapeHtml(t.detail || '—')}</td>
        </tr>
      `;
    });

    const capiPayloadStr = capi.payload ? JSON.stringify(capi.payload, null, 2) : 'No CAPI payload generated';
    const capiResponseStr = capi.response ? JSON.stringify(capi.response, null, 2) : (capi.message || 'No response recorded');
    const capiLogsStr = capi.formattedAuditLog || (capi.logs || []).join('\n') || 'No console logs registered';

    const printableHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Buzl Verification Audit Report - ${timestamp}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #2a3547; line-height: 1.4; padding: 15px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004aad; padding-bottom: 12px; margin-bottom: 16px; }
    .logo-badge { font-family: monospace; font-size: 16px; font-weight: 700; color: #004aad; }
    .title { font-size: 18px; font-weight: 700; color: #2a3547; margin: 3px 0 2px; }
    .meta { font-size: 11px; color: #5a6a85; }
    .scorecard { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi-box { border: 1px solid #b8c4d5; border-radius: 6px; padding: 8px 12px; text-align: center; background: #f8fafc; }
    .kpi-title { font-size: 10px; text-transform: uppercase; color: #5a6a85; font-weight: 700; margin-bottom: 2px; }
    .kpi-num { font-size: 18px; font-weight: 700; font-family: monospace; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px; color: #004aad; border-bottom: 1px solid #e5eaef; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    th { background: #f2f6fa; color: #2a3547; text-align: left; padding: 6px 10px; font-weight: 700; border-bottom: 1px solid #b8c4d5; font-size: 10px; text-transform: uppercase; }
    pre { background: #f8fafc; border: 1px solid #b8c4d5; border-radius: 4px; padding: 8px 10px; font-size: 10px; font-family: monospace; max-height: 220px; overflow: hidden; white-space: pre-wrap; word-break: break-all; }
    .logs-box { background: #1a2332; color: #e2e8f0; font-family: monospace; font-size: 10px; padding: 8px 10px; border-radius: 4px; line-height: 1.5; white-space: pre-wrap; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5eaef; display: flex; justify-content: space-between; font-size: 10px; color: #5a6a85; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-badge">BUZL / CAPI SUITE</div>
      <div class="title">Automated Verification &amp; Compliance Audit Report</div>
      <div class="meta">Target Project: <code>${projectPath}</code></div>
    </div>
    <div style="text-align:right;">
      <div class="meta"><strong>Date:</strong> ${timestamp}</div>
      <div class="meta"><strong>Status:</strong> <span style="color:${statusColor}; font-weight:700;">${report.allPassed ? 'VERIFIED PASS' : 'ISSUES DETECTED'}</span></div>
      <div class="meta"><strong>Engine:</strong> v0.1.2 (WCAG 2.2 AA)</div>
    </div>
  </div>

  <div class="scorecard">
    <div class="kpi-box">
      <div class="kpi-title">Total Checks</div>
      <div class="kpi-num">${report.total}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Passed</div>
      <div class="kpi-num" style="color:#087f5b;">${report.passedCount}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Failed</div>
      <div class="kpi-num" style="color:${report.failedCount > 0 ? '#b02316' : '#5a6a85'};">${report.failedCount}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Compliance Score</div>
      <div class="kpi-num" style="color:${statusColor};">${passRate}%</div>
    </div>
  </div>

  <div class="section-title">1. Automated Verification Checks (${report.passedCount}/${report.total} Passed)</div>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Verification Item</th>
        <th style="width:90px; text-align:center;">Result</th>
        <th>Diagnostic Details</th>
      </tr>
    </thead>
    <tbody>
      ${testRowsHtml}
    </tbody>
  </table>

  <div class="section-title">2. Buzl CAPI Live Telemetry &amp; Payload Inspector</div>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
    <div>
      <div style="font-weight:700; margin-bottom:4px; font-size:10px; text-transform:uppercase; color:#5a6a85;">Dispatched CAPI Payload (JSON):</div>
      <pre>${escapeHtml(capiPayloadStr)}</pre>
    </div>
    <div>
      <div style="font-weight:700; margin-bottom:4px; font-size:10px; text-transform:uppercase; color:#5a6a85;">Server Acknowledgment / Response:</div>
      <pre>${escapeHtml(capiResponseStr)}</pre>
    </div>
  </div>

  <div class="section-title" style="margin-top:12px;">3. Registered Console Logs &amp; Audit Trail</div>
  <div class="logs-box">${escapeHtml(capiLogsStr)}</div>

  <div class="footer">
    <div>Generated by Buzl CAPI Suite • Official Locations Compliance Engine</div>
    <div>Certified Automated Verification Audit • Confidential</div>
  </div>
</body>
</html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(printableHtml);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        if (printFrame.parentNode) printFrame.parentNode.removeChild(printFrame);
      }, 1500);
    }, 400);

    showToast('Exporting PDF', 'Print dialog opened. Select "Save as PDF"', 'info');
  }

  if (btnExportJson) btnExportJson.addEventListener('click', exportReportJson);
  if (btnExportPdf) btnExportPdf.addEventListener('click', exportReportPdf);

  // ==========================================================================
  // Column Hierarchy Preview
  // ==========================================================================
  function renderColumnHierarchy() {
    if (!columnHierarchyPreview) return;
    columnHierarchyPreview.innerHTML = '';

    const cols = [
      { name: 'Name', type: 'contact' },
      { name: 'Location', type: 'contact' },
      { name: 'Phone', type: 'contact' }
    ];

    activeDynamicFields.forEach(f => {
      cols.push({ name: f, type: 'dynamic' });
    });

    const crmCols = ['Lead Stage', 'Event Time', 'Is Qualified', 'Qualified Date', 'Is Spam', 'Handled By', 'Comments'];
    crmCols.forEach(c => cols.push({ name: c, type: 'crm' }));

    const attrCols = ['Action Source', 'Source', 'UTM Source', 'UTM Campaign', 'Lead ID'];
    attrCols.forEach(a => cols.push({ name: a, type: 'attrib' }));

    cols.forEach((col, idx) => {
      const pill = document.createElement('span');
      pill.className = `col-pill col-pill-${col.type}`;
      pill.textContent = `${idx + 1}. ${col.name}`;
      columnHierarchyPreview.appendChild(pill);
    });
  }

  // ==========================================================================
  // 1. Fetch Project Scan & Live State
  // ==========================================================================
  async function loadScan() {
    fileBadge.textContent = 'Scanning...';
    fileBadge.className = 'badge badge-neutral';

    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      currentScanData = data;

      const dirCount = (data.directories && data.directories.length > 1) ? ` · ${data.directories.length} dirs` : '';
      fileBadge.textContent = `${data.totalHtmlFiles} HTML File(s)${dirCount}`;
      fileBadge.className = 'badge badge-info';
      fileList.innerHTML = '';

      // Update Live State Bar
      updateLiveStateBar(data.liveState, data.rootDir);

      // Auto-detect site location
      if (data.detectedLocation && siteLocationInput && !siteLocationInput.dataset.userEdited) {
        siteLocationInput.value = data.detectedLocation;
      }

      // Auto-detect phone and service for quick test dispatch
      if (testLeadPhone && !testLeadPhone.dataset.userEdited) {
        testLeadPhone.value = data.detectedWhatsapp || (data.liveState && data.liveState.whatsapp && data.liveState.whatsapp.detectedNumber) || '';
      }
      if (testLeadService && !testLeadService.dataset.userEdited) {
        testLeadService.value = data.detectedService || 'General Inquiry';
      }

      // Populate dynamic fields checklist
      if (dynamicFieldsChecklist && data.uniqueFields) {
        dynamicFieldsChecklist.innerHTML = '';
        const customFields = data.uniqueFields.filter(f => !f.isCore);

        activeDynamicFields = customFields.map(f => f.name.charAt(0).toUpperCase() + f.name.slice(1));

        if (customFields.length === 0) {
          dynamicFieldsChecklist.innerHTML = '<span class="helper-text">No custom fields detected (core: Name, Phone).</span>';
        } else {
          customFields.forEach(f => {
            const formatted = f.name.charAt(0).toUpperCase() + f.name.slice(1);
            const label = document.createElement('label');
            label.className = 'field-checkbox-item';
            label.innerHTML = `
              <input type="checkbox" checked data-field="${formatted}">
              <span><strong>${formatted}</strong> (${f.tag}) — <small class="helper-text">Col D</small></span>
            `;

            label.querySelector('input').addEventListener('change', (e) => {
              if (e.target.checked) {
                if (!activeDynamicFields.includes(formatted)) activeDynamicFields.push(formatted);
              } else {
                activeDynamicFields = activeDynamicFields.filter(x => x !== formatted);
              }
              renderColumnHierarchy();
            });

            dynamicFieldsChecklist.appendChild(label);
          });
        }
      }

      renderColumnHierarchy();

      // Render Discovered Project Files
      if (data.files.length === 0) {
        fileList.innerHTML = '<li class="file-item"><span class="name">No HTML files discovered in root</span></li>';
      } else {
        data.files.forEach(f => {
          const li = document.createElement('li');
          li.className = 'file-item';

          const tags = [];
          if (f.hasHead) tags.push('<span class="badge badge-neutral">&lt;head&gt;</span>');
          if (f.hasBody) tags.push('<span class="badge badge-neutral">&lt;body&gt;</span>');
          if (f.forms.length > 0) tags.push(`<span class="badge badge-success">${f.forms.length} form(s)</span>`);
          if (f.existingGtmId) tags.push(`<span class="badge badge-info">${f.existingGtmId}</span>`);

          li.innerHTML = `
            <span class="name">${f.relativePath}</span>
            <div class="file-tags">${tags.join('')}</div>
          `;
          fileList.appendChild(li);
        });
      }

      // Render Individual Forms for independent testing
      renderIndividualForms(data.forms || [], data.formArchetypes || []);

      // Pre-fill inputs strictly from live project state
      applyLiveConfigToForm(data);

      // Refresh Backups Count
      if (data.backups && backupsCountBadge) {
        backupsCountBadge.textContent = data.backups.length;
      }

    } catch (err) {
      fileBadge.textContent = 'Scan Error';
      fileBadge.className = 'badge badge-danger';
      showToast('Scan Error', 'Could not scan local project files', 'error');
    }
  }

  function updateLiveStateBar(liveState, rootDir) {
    if (!liveState) return;
    if (liveStateRootDir) liveStateRootDir.textContent = rootDir || 'Project Root';

    const locBadge = document.getElementById('siteLocationBadge');
    if (locBadge) {
      locBadge.innerHTML = currentScanData && currentScanData.detectedLocation
        ? `<svg class="icon-xs"><use href="#icon-pin"/></svg> <span>${currentScanData.detectedLocation}</span>`
        : '<svg class="icon-xs"><use href="#icon-pin"/></svg> <span>Location: Not detected</span>';
    }

    // Toggle per-card remove buttons
    const btnGtm = document.getElementById('btnRemoveGtm');
    if (btnGtm) btnGtm.classList.toggle('hidden', !(liveState.gtm && liveState.gtm.active));

    const btnMeta = document.getElementById('btnRemoveMeta');
    if (btnMeta) btnMeta.classList.toggle('hidden', !(liveState.meta && liveState.meta.active));

    const btnCapi = document.getElementById('btnRemoveCapi');
    if (btnCapi) btnCapi.classList.toggle('hidden', !(liveState.buzlCapi && liveState.buzlCapi.active));

    const btnSheets = document.getElementById('btnRemoveSheets');
    if (btnSheets) btnSheets.classList.toggle('hidden', !(liveState.googleSheets && liveState.googleSheets.active));

    const btnZoho = document.getElementById('btnRemoveZoho');
    if (btnZoho) btnZoho.classList.toggle('hidden', !(liveState.zoho && liveState.zoho.active));

    const btnWa = document.getElementById('btnRemoveWhatsapp');
    if (btnWa) btnWa.classList.toggle('hidden', !(liveState.whatsapp && liveState.whatsapp.active));

    if (liveStateChips) {
      liveStateChips.innerHTML = '';

      const items = [
        { serviceKey: 'gtm', label: 'GTM', active: liveState.gtm.active, text: liveState.gtm.id ? `GTM: ${liveState.gtm.id}` : 'GTM: Inactive' },
        { serviceKey: 'meta', label: 'Meta', active: liveState.meta.active, text: liveState.meta.id ? `Meta: ${liveState.meta.id}` : 'Meta: Inactive' },
        { serviceKey: 'capi', label: 'Buzl CAPI', active: liveState.buzlCapi.active, text: liveState.buzlCapi.active ? 'Buzl CAPI: Connected' : 'Buzl CAPI: Inactive' },
        { serviceKey: 'sheets', label: 'Google Sheets', active: liveState.googleSheets.active, text: liveState.googleSheets.active ? 'Sheets CRM: Connected' : 'Sheets CRM: Inactive' },
        { serviceKey: 'zoho', label: 'Zoho CRM', active: liveState.zoho.active, text: liveState.zoho.active ? 'Zoho CRM: Connected' : 'Zoho CRM: Inactive' },
        { serviceKey: 'whatsapp', label: 'WhatsApp', active: liveState.whatsapp.active, text: liveState.whatsapp.active ? `WA: ${liveState.whatsapp.number}` : 'WA: Inactive' }
      ];

      items.forEach(item => {
        const chip = document.createElement('span');
        chip.className = `chip ${item.active ? 'chip-active' : 'chip-inactive'}`;
        chip.innerHTML = `
          <span class="status-dot ${item.active ? 'dot-active' : 'dot-inactive'}"></span>
          <span>${item.text}</span>
          ${item.active ? `<button type="button" class="chip-remove-btn" data-service="${item.serviceKey}" title="Remove ${item.label}"><svg class="icon-xs"><use href="#icon-x"/></svg></button>` : ''}
        `;

        const removeBtn = chip.querySelector('.chip-remove-btn');
        if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSingleService(item.serviceKey);
          });
        }

        liveStateChips.appendChild(chip);
      });
    }
  }

  // ==========================================================================
  // Surgical Removal of Single Service
  // ==========================================================================
  function removeSingleService(serviceKey) {
    const serviceNames = {
      gtm: 'Google Tag Manager (GTM)',
      meta: 'Meta Pixel & Client CAPI',
      capi: 'Buzl CAPI Server-Side Endpoint',
      sheets: 'Google Sheets Direct CRM',
      zoho: 'Zoho CRM Web-to-Lead',
      whatsapp: 'WhatsApp Handoff'
    };
    const name = serviceNames[serviceKey] || serviceKey;

    showConfirmDialog({
      title: `Remove ${name}`,
      message: `Are you sure you want to surgically remove ${name} from this site?\n\nAll other active tracking and configurations will be safely preserved. An automatic safety snapshot will be created before removal.`,
      confirmText: 'Remove Service',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/remove-service', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service: serviceKey })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Service Removed', data.message, 'success');
            loadScan();
          } else {
            showToast('Removal Failed', data.message, 'error');
          }
        } catch (err) {
          showToast('Network Error', err.message, 'error');
        }
      }
    });
  }

  function applyLiveConfigToForm(data) {
    const live = data.liveState;
    const cfg = data.existingConfig || {};

    // GTM
    const gtmSwitch = document.getElementById('enableGTM');
    const gtmInput = document.getElementById('gtmId');
    if (gtmInput) {
      gtmInput.value = (live && live.gtm && live.gtm.id) || cfg.gtmId || '';
    }
    if (gtmSwitch) {
      gtmSwitch.checked = !!(live && live.gtm && live.gtm.active);
      gtmSwitch.dispatchEvent(new Event('change'));
    }

    // Meta Pixel
    const metaSwitch = document.getElementById('enableMeta');
    const metaInput = document.getElementById('metaPixelId');
    if (metaInput) {
      metaInput.value = (live && live.meta && live.meta.id) || cfg.metaPixelId || '';
    }
    if (metaSwitch) {
      metaSwitch.checked = !!(live && live.meta && live.meta.active);
      metaSwitch.dispatchEvent(new Event('change'));
    }

    // Buzl CAPI
    const capiSwitch = document.getElementById('enableBuzlCapi');
    const capiEndpoint = document.getElementById('buzlCapiEndpoint');
    const capiUser = document.getElementById('buzlCapiUser');
    const capiPass = document.getElementById('buzlCapiPass');

    const capiData = (live && live.buzlCapi) || cfg.buzlCapi || {};
    if (capiEndpoint && capiData.endpoint) capiEndpoint.value = capiData.endpoint;
    if (capiUser) capiUser.value = capiData.authUser || '2BuzlmqpHJeVBow0dzR9gP3$uQLxIA';
    if (capiPass) capiPass.value = (cfg.buzlCapi && cfg.buzlCapi.authPass) || 'dgAY%nH1MNPgOvGaYRg6ynomM3mbJgGjr%Z3FcPCJNzvm#KjV!I%Y9tf$bDacBgPIABuzl';

    if (capiSwitch) {
      capiSwitch.checked = !!(live && live.buzlCapi && live.buzlCapi.active);
      capiSwitch.dispatchEvent(new Event('change'));
    }

    if (capiData && capiData.endpoint && !currentCapiData) {
      renderCapiInspector({
        configured: true,
        tested: false,
        endpoint: capiData.endpoint,
        authUser: capiData.authUser,
        logs: [
          `[${new Date().toISOString().slice(11, 19)}] [CAPI-INFO] Loaded active CAPI configuration for endpoint: ${capiData.endpoint}`,
          `[${new Date().toISOString().slice(11, 19)}] [CAPI-INFO] Ready for automated verification or synthetic test lead.`
        ]
      });
    }

    // Google Sheets
    const sheetsSwitch = document.getElementById('enableSheets');
    const sheetsInput = document.getElementById('googleSheetUrl');
    if (sheetsInput && (live && live.googleSheets && live.googleSheets.url)) {
      sheetsInput.value = live.googleSheets.url;
    } else if (sheetsInput && cfg.googleSheetUrl) {
      sheetsInput.value = cfg.googleSheetUrl;
    }
    if (sheetsSwitch) {
      sheetsSwitch.checked = !!(live && live.googleSheets && live.googleSheets.active);
      sheetsSwitch.dispatchEvent(new Event('change'));
    }

    // Zoho CRM
    const zohoSwitch = document.getElementById('enableZoho');
    const zohoXn = document.getElementById('zohoXnqsjsdp');
    const zohoXm = document.getElementById('zohoXmiwtld');
    const zohoEp = document.getElementById('zohoEndpoint');
    if (cfg.zoho) {
      if (zohoXn && cfg.zoho.xnQsjsdp) zohoXn.value = cfg.zoho.xnQsjsdp;
      if (zohoXm && cfg.zoho.xmIwtLD) zohoXm.value = cfg.zoho.xmIwtLD;
      if (zohoEp && cfg.zoho.endpoint) zohoEp.value = cfg.zoho.endpoint;
    }
    if (zohoSwitch) {
      zohoSwitch.checked = !!(live && live.zoho && live.zoho.active);
      zohoSwitch.dispatchEvent(new Event('change'));
    }

    // WhatsApp
    const waSwitch = document.getElementById('enableWhatsapp');
    const waNumber = document.getElementById('whatsappNumber');
    const waBadge = document.getElementById('waDetectedBadge');
    const waHelper = document.getElementById('waHelperText');

    const detectedWa = data.detectedWhatsapp || (live && live.whatsapp && live.whatsapp.detectedNumber);
    if (detectedWa && waBadge) {
      waBadge.innerHTML = `<svg class="icon-xs"><use href="#icon-check"/></svg> <span>Auto-detected: ${detectedWa}</span>`;
      waBadge.classList.remove('hidden');
      waBadge.onclick = () => {
        if (waNumber) waNumber.value = detectedWa;
        if (waSwitch && !waSwitch.checked) {
          waSwitch.checked = true;
          waSwitch.dispatchEvent(new Event('change'));
        }
        showToast('WhatsApp Applied', `Applied auto-detected number: ${detectedWa}`, 'success');
      };
      if (waHelper) {
        waHelper.textContent = `Auto-fetches ${detectedWa} from form buttons, or specify fallback number.`;
      }
    }

    if (waNumber) {
      if (live && live.whatsapp && live.whatsapp.number) {
        waNumber.value = live.whatsapp.number;
      } else if (cfg.whatsapp && cfg.whatsapp.number) {
        waNumber.value = cfg.whatsapp.number;
      } else if (detectedWa && !waNumber.value) {
        waNumber.value = detectedWa;
      }
    }

    if (waSwitch) {
      const isWaActive = !!(live && live.whatsapp && live.whatsapp.active);
      waSwitch.checked = isWaActive || (!!detectedWa && (live && live.whatsapp && live.whatsapp.active !== false));
      waSwitch.dispatchEvent(new Event('change'));
    }
  }

  // ==========================================================================
  // 2. Render Individual Discovered Forms with Per-Form Testing
  // ==========================================================================
  function renderIndividualForms(forms, archetypes) {
    if (!individualFormsList) return;
    individualFormsList.innerHTML = '';

    const listToRender = (archetypes && archetypes.length > 0) ? archetypes : forms;

    if (formsCountBadge) {
      if (archetypes && archetypes.length > 0 && forms.length !== archetypes.length) {
        formsCountBadge.textContent = `${forms.length} (${archetypes.length} unique)`;
      } else {
        formsCountBadge.textContent = `${forms.length}`;
      }
    }

    if (!listToRender || listToRender.length === 0) {
      individualFormsList.innerHTML = '<p class="empty-state">No forms found on HTML pages.</p>';
      return;
    }

    listToRender.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'form-item-card';

      const tagPills = f.inputs.map(i => `<span class="col-pill col-pill-dynamic" style="font-size: 11px;">${i.name}</span>`).join('');

      // Build sample test input controls
      const inputElements = f.inputs.map(i => {
        let sampleVal = 'Test Value';
        const lower = i.name.toLowerCase();
        if (lower.includes('phone') || lower.includes('mobile')) {
          sampleVal = f.detectedWhatsapp || (currentScanData && currentScanData.detectedWhatsapp) || '';
        } else if (lower.includes('name')) {
          sampleVal = `Test Lead ${idx + 1}`;
        } else if (lower.includes('mail')) {
          sampleVal = 'test-lead@example.com';
        } else if (lower.includes('service') || lower.includes('inquiry') || lower.includes('treatment') || lower.includes('subject')) {
          sampleVal = f.formTitle || f.id || (currentScanData && currentScanData.detectedService) || 'General Inquiry';
        } else if (lower.includes('city') || lower.includes('loc')) {
          sampleVal = (currentScanData && currentScanData.detectedLocation) || '';
        }

        return `
          <div class="form-field-input-group">
            <label>${i.name}</label>
            <input type="text" data-field-name="${i.name}" value="${sampleVal}">
          </div>
        `;
      }).join('');

      const isShared = f.isShared || (f.pages && f.pages.length > 1);
      const pageInfo = isShared
        ? `<span class="badge badge-info" style="font-size: 10.5px;"><svg class="icon-xs"><use href="#icon-refresh"/></svg> <span>Appears on ${f.pages.length} pages</span></span>`
        : `<small style="color: var(--color-text-inverse); font-size: 11px;">in <code>${f.file || (f.pages && f.pages[0]) || 'page'}</code></small>`;

      const pagesList = (isShared && f.pages)
        ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
            ${f.pages.map(p => `<span class="badge badge-neutral" style="font-family: monospace; font-size: 10px;">${p}</span>`).join('')}
           </div>`
        : '';

      const waBadge = f.detectedWhatsapp
        ? `<span class="badge badge-success" style="font-size: 10px; font-family: monospace;" title="Target WhatsApp Number for this form"><svg class="icon-xs"><use href="#icon-brand-whatsapp"/></svg> <span>WA: ${f.detectedWhatsapp}</span></span>`
        : '';

      card.innerHTML = `
        <div class="form-item-header">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="form-selector-tag">${f.selector}</span>
            ${pageInfo}
            ${waBadge}
          </div>
          <span class="badge badge-neutral">${f.inputCount || f.inputs.length} input(s)</span>
        </div>
        ${pagesList}
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">${tagPills}</div>
        <div class="form-fields-grid">${inputElements}</div>
        <div class="form-actions-row">
          <button type="button" class="btn btn-primary btn-sm btn-test-this-form" data-form-id="${f.formId}">
            <svg class="icon-xs"><use href="#icon-send"/></svg>
            <span>Test Form (${f.selector})</span>
          </button>
          <span class="form-test-result hidden"></span>
        </div>
      `;

      // Wire test click
      const testBtn = card.querySelector('.btn-test-this-form');
      const resultSpan = card.querySelector('.form-test-result');

      testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.innerHTML = '<svg class="icon-xs icon-spin"><use href="#icon-refresh"/></svg> <span>Testing...</span>';
        resultSpan.classList.remove('hidden');
        resultSpan.className = 'form-test-result badge badge-info';
        resultSpan.innerHTML = '<svg class="icon-xs icon-spin"><use href="#icon-refresh"/></svg> <span>Dispatching...</span>';

        // Collect fields
        const fieldValues = {};
        card.querySelectorAll('input[data-field-name]').forEach(inp => {
          fieldValues[inp.dataset.fieldName] = inp.value.trim();
        });

        const targetPage = f.file || (f.pages && f.pages[0]) || 'index.html';

        try {
          const res = await fetch('/api/test-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formId: f.formId,
              formFields: fieldValues,
              pagePath: targetPage,
              config: getCurrentConfig()
            })
          });
          const data = await res.json();
          testBtn.disabled = false;
          testBtn.innerHTML = `<svg class="icon-xs"><use href="#icon-send"/></svg> <span>Test Form (${f.selector})</span>`;

          if (data.success && data.results) {
            const ch = data.results.channels;
            if (ch && ch.buzlCapi) {
              renderCapiInspector(ch.buzlCapi);
              if (currentVerificationReport) {
                currentVerificationReport.capi = ch.buzlCapi;
              }
            }
            const sheetOk = ch.googleSheets && ch.googleSheets.ok;
            const capiOk = ch.buzlCapi && ch.buzlCapi.ok;

            if (sheetOk || capiOk) {
              resultSpan.className = 'form-test-result badge badge-success';
              const rowLabel = (ch.googleSheets.message.match(/Row \d+/) || [])[0] || 'OK';
              resultSpan.innerHTML = `<svg class="icon-xs"><use href="#icon-check"/></svg> <span>Delivered! (Sheets: ${sheetOk ? rowLabel : 'Off'} | CAPI: ${capiOk ? 'Accepted' : 'Off'})</span>`;
              showToast('Form Test Success', `Payload successfully delivered for ${f.selector}`, 'success');
            } else {
              resultSpan.className = 'form-test-result badge badge-danger';
              resultSpan.innerHTML = `<svg class="icon-xs"><use href="#icon-x"/></svg> <span>Failed: ${ch.googleSheets.message || ch.buzlCapi.message || 'Error'}</span>`;
              showToast('Form Test Warning', 'No active channels received payload', 'error');
            }
          } else {
            resultSpan.className = 'form-test-result badge badge-danger';
            resultSpan.innerHTML = `<svg class="icon-xs"><use href="#icon-x"/></svg> <span>Error: ${data.message || 'Failed'}</span>`;
            showToast('Form Test Error', data.message || 'Execution failed', 'error');
          }
        } catch (e) {
          testBtn.disabled = false;
          testBtn.innerHTML = `<svg class="icon-xs"><use href="#icon-send"/></svg> <span>Test Form (${f.selector})</span>`;
          resultSpan.className = 'form-test-result badge badge-danger';
          resultSpan.innerHTML = `<svg class="icon-xs"><use href="#icon-x"/></svg> <span>Network Error: ${e.message}</span>`;
          showToast('Network Error', e.message, 'error');
        }
      });

      individualFormsList.appendChild(card);
    });
  }

  // ==========================================================================
  // 3. Named Backups Management
  // ==========================================================================
  async function loadBackupsList() {
    if (!backupsTableBody) return;
    backupsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading backups...</td></tr>';

    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      const backups = data.backups || [];

      if (backupsCountBadge) backupsCountBadge.textContent = backups.length;

      if (backups.length === 0) {
        backupsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-inverse); padding: 18px 0;">No snapshots found on disk.</td></tr>';
        return;
      }

      backupsTableBody.innerHTML = '';
      backups.forEach(b => {
        const tr = document.createElement('tr');
        const formattedDate = b.timestamp ? new Date(b.timestamp).toLocaleString() : 'N/A';

        tr.innerHTML = `
          <td><strong>${b.name || 'Snapshot'}</strong></td>
          <td><code style="font-size: 11px; color: var(--color-brand-primary);">${b.dirName}</code></td>
          <td>${formattedDate}</td>
          <td><span class="badge badge-neutral">${b.filesCount} file(s)</span></td>
          <td style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-secondary btn-xs btn-restore-backup" data-dir="${b.dirName}" data-name="${b.name}">
              <svg class="icon-xs"><use href="#icon-refresh"/></svg>
              <span>Restore</span>
            </button>
            <button type="button" class="btn btn-danger-outline btn-xs btn-delete-backup" data-dir="${b.dirName}">
              <svg class="icon-xs"><use href="#icon-trash"/></svg>
              <span>Delete</span>
            </button>
          </td>
        `;

        // Restore action with in-app confirm
        tr.querySelector('.btn-restore-backup').addEventListener('click', (e) => {
          const dir = e.currentTarget.dataset.dir;
          const name = e.currentTarget.dataset.name;

          showConfirmDialog({
            title: `Restore Snapshot`,
            message: `Are you sure you want to restore "${name}" (${dir})?\n\nAll current HTML files will be replaced with this snapshot.`,
            confirmText: 'Restore Files',
            onConfirm: async () => {
              try {
                const rRes = await fetch('/api/restore', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ backupDirName: dir })
                });
                const rData = await rRes.json();
                showToast('Snapshot Restored', rData.message, 'success');
                backupsModal.classList.add('hidden');
                loadScan();
              } catch (err) {
                showToast('Restore Error', err.message, 'error');
              }
            }
          });
        });

        // Delete action with in-app confirm
        tr.querySelector('.btn-delete-backup').addEventListener('click', (e) => {
          const dir = e.currentTarget.dataset.dir;

          showConfirmDialog({
            title: `Delete Snapshot`,
            message: `Are you sure you want to permanently delete backup "${dir}"? This action cannot be undone.`,
            confirmText: 'Delete Snapshot',
            onConfirm: async () => {
              try {
                const dRes = await fetch('/api/delete-backup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ backupDirName: dir })
                });
                const dData = await dRes.json();
                showToast('Snapshot Deleted', dData.message || 'Backup deleted', 'info');
                loadBackupsList();
              } catch (err) {
                showToast('Delete Failed', err.message, 'error');
              }
            }
          });
        });

        backupsTableBody.appendChild(tr);
      });
    } catch (e) {
      backupsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-danger-dark);">Failed to load backups: ${e.message}</td></tr>`;
      showToast('Backups Error', e.message, 'error');
    }
  }

  if (btnOpenBackups) {
    btnOpenBackups.addEventListener('click', () => {
      backupsModal.classList.remove('hidden');
      loadBackupsList();
    });
  }

  if (closeBackupsModal) {
    closeBackupsModal.addEventListener('click', () => {
      backupsModal.classList.add('hidden');
    });
  }

  if (btnCreateNamedBackup) {
    btnCreateNamedBackup.addEventListener('click', async () => {
      const name = customBackupName ? customBackupName.value.trim() : '';
      btnCreateNamedBackup.disabled = true;
      btnCreateNamedBackup.innerHTML = '<svg class="icon-sm icon-spin"><use href="#icon-refresh"/></svg> <span>Saving...</span>';

      try {
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        btnCreateNamedBackup.disabled = false;
        btnCreateNamedBackup.innerHTML = '<svg class="icon-sm"><use href="#icon-database"/></svg> <span>Save Snapshot</span>';
        if (customBackupName) customBackupName.value = '';
        showToast('Snapshot Created', `Saved point-in-time snapshot on disk`, 'success');
        loadBackupsList();
      } catch (err) {
        btnCreateNamedBackup.disabled = false;
        btnCreateNamedBackup.innerHTML = '<svg class="icon-sm"><use href="#icon-database"/></svg> <span>Save Snapshot</span>';
        showToast('Backup Failed', err.message, 'error');
      }
    });
  }

  // ==========================================================================
  // 4. Clean Tracking Removal / Uninstaller
  // ==========================================================================
  if (btnUninstallTracking) {
    btnUninstallTracking.addEventListener('click', () => {
      uninstallModal.classList.remove('hidden');
    });
  }

  if (closeUninstallModal) closeUninstallModal.addEventListener('click', () => uninstallModal.classList.add('hidden'));
  if (btnCancelUninstall) btnCancelUninstall.addEventListener('click', () => uninstallModal.classList.add('hidden'));

  if (btnConfirmUninstall) {
    btnConfirmUninstall.addEventListener('click', async () => {
      btnConfirmUninstall.disabled = true;
      btnConfirmUninstall.innerHTML = '<svg class="icon-xs icon-spin"><use href="#icon-refresh"/></svg> <span>Removing all tracking...</span>';

      try {
        const res = await fetch('/api/remove-tracking', { method: 'POST' });
        const data = await res.json();
        btnConfirmUninstall.disabled = false;
        btnConfirmUninstall.innerHTML = '<svg class="icon-xs"><use href="#icon-trash"/></svg> <span>Confirm &amp; Remove All Tracking</span>';
        uninstallModal.classList.add('hidden');

        showToast('Tracking Removed', data.message, 'success');
        loadScan();
      } catch (e) {
        btnConfirmUninstall.disabled = false;
        btnConfirmUninstall.innerHTML = '<svg class="icon-xs"><use href="#icon-trash"/></svg> <span>Confirm &amp; Remove All Tracking</span>';
        showToast('Removal Failed', e.message, 'error');
      }
    });
  }

  // 4.5. Selective Single Service Removal Buttons
  document.querySelectorAll('.btn-remove-service').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const service = btn.dataset.service;
      if (service) {
        removeSingleService(service);
      }
    });
  });

  // ==========================================================================
  // 5. Fetch Apps Script Template Code
  // ==========================================================================
  async function loadScriptTemplate() {
    try {
      const res = await fetch('/api/apps-script');
      const data = await res.json();
      scriptTemplateText = data.code;
      scriptCodeDisplay.textContent = scriptTemplateText;
    } catch (e) {}
  }

  if (openScriptModal) {
    openScriptModal.addEventListener('click', (e) => {
      e.preventDefault();
      scriptModal.classList.remove('hidden');
    });
  }

  if (closeScriptModal) {
    closeScriptModal.addEventListener('click', () => {
      scriptModal.classList.add('hidden');
    });
  }

  if (copyScriptCode) {
    copyScriptCode.addEventListener('click', () => {
      navigator.clipboard.writeText(scriptTemplateText).then(() => {
        copyScriptCode.innerHTML = '<svg class="icon-xs" style="color:var(--color-success-dark)"><use href="#icon-check"/></svg> <span>Copied!</span>';
        showToast('Copied to Clipboard', 'Google Apps Script code copied to clipboard', 'success');
        setTimeout(() => {
          copyScriptCode.innerHTML = '<svg class="icon-xs"><use href="#icon-clipboard"/></svg> <span>Copy Code</span>';
        }, 2200);
      });
    });
  }

  // Toggle helpers
  function setupToggle(switchId, sectionId) {
    const sw = document.getElementById(switchId);
    const sec = document.getElementById(sectionId);
    if (!sw || !sec) return;
    sw.addEventListener('change', () => {
      sec.style.opacity = sw.checked ? '1' : '0.45';
      sec.style.pointerEvents = sw.checked ? 'all' : 'none';
    });
  }

  setupToggle('enableGTM', 'gtmSection');
  setupToggle('enableMeta', 'metaSection');
  setupToggle('enableBuzlCapi', 'buzlCapiSection');
  setupToggle('enableSheets', 'sheetsSection');
  setupToggle('enableZoho', 'zohoSection');
  setupToggle('enableWhatsapp', 'whatsappSection');

  // Collect Current Configuration
  function getCurrentConfig() {
    const isCapiEnabled = document.getElementById('enableBuzlCapi').checked;
    const isZohoEnabled = document.getElementById('enableZoho').checked;
    const zohoFormId = isZohoEnabled ? document.getElementById('zohoXnqsjsdp').value.trim() : '';

    return {
      gtmId: document.getElementById('enableGTM').checked ? document.getElementById('gtmId').value.trim() : '',
      enableDeferred: document.getElementById('enableDeferred').checked,
      metaPixelId: document.getElementById('enableMeta').checked ? document.getElementById('metaPixelId').value.trim() : '',
      trackMetaLeadEvent: document.getElementById('trackMetaLead').checked,
      googleSheetUrl: document.getElementById('enableSheets').checked ? document.getElementById('googleSheetUrl').value.trim() : '',
      siteLocation: siteLocationInput ? siteLocationInput.value.trim() : '',
      dynamicFields: activeDynamicFields,
      buzlCapi: {
        endpoint: isCapiEnabled ? document.getElementById('buzlCapiEndpoint').value.trim() : '',
        authUser: isCapiEnabled ? document.getElementById('buzlCapiUser').value.trim() : '',
        authPass: isCapiEnabled ? document.getElementById('buzlCapiPass').value.trim() : ''
      },
      zoho: {
        endpoint: (isZohoEnabled && zohoFormId) ? document.getElementById('zohoEndpoint').value : '',
        xnQsjsdp: zohoFormId,
        xmIwtLD: isZohoEnabled ? document.getElementById('zohoXmiwtld').value.trim() : ''
      },
      whatsappNumber: document.getElementById('enableWhatsapp').checked ? document.getElementById('whatsappNumber').value.trim() : ''
    };
  }

  // ==========================================================================
  // 6. Inject & Run Automated Verification Form Submit
  // ==========================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<svg class="icon-sm icon-spin"><use href="#icon-refresh"/></svg> <span>Injecting &amp; Running Tests...</span>';
    testSummaryBadge.textContent = 'Testing...';
    testSummaryBadge.className = 'tab-badge badge-info';
    testConsole.innerHTML = '<p class="empty-state">Executing injection and running automated verification tests...</p>';

    // Automatically switch to verification tab so developer sees real-time test output
    switchTab('tabVerification');

    const payload = getCurrentConfig();

    try {
      const res = await fetch('/api/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<svg class="icon-sm"><use href="#icon-brand-buzl"/></svg> <span>Apply Configuration &amp; Run Automated Tests</span>';

      if (result.success && result.testReport) {
        const report = result.testReport;
        testSummaryBadge.textContent = `${report.passedCount}/${report.total} Passed`;
        testSummaryBadge.className = report.allPassed ? 'tab-badge badge-success' : 'tab-badge badge-danger';

        renderVerificationKpis(report);
        if (report.capi) {
          renderCapiInspector(report.capi);
        }

        testConsole.innerHTML = '';
        report.tests.forEach(t => {
          const item = document.createElement('div');
          item.className = 'test-item';
          const icon = t.passed
            ? '<svg class="test-status-svg pass"><use href="#icon-check"/></svg>'
            : '<svg class="test-status-svg fail"><use href="#icon-x"/></svg>';
          item.innerHTML = `
            ${icon}
            <div class="test-text">
              <div>${t.name}</div>
              ${t.detail ? `<div class="test-detail">${t.detail}</div>` : ''}
            </div>
          `;
          testConsole.appendChild(item);
        });

        showToast(
          report.allPassed ? 'Configuration Applied' : 'Applied with Warnings',
          `${report.passedCount}/${report.total} automated tests passed.`,
          report.allPassed ? 'success' : 'error'
        );

        loadScan();
      } else {
        testSummaryBadge.textContent = 'Failed';
        testSummaryBadge.className = 'tab-badge badge-danger';
        testConsole.innerHTML = `<p class="test-icon fail">Error: ${result.message || 'Injection failed'}</p>`;
        showToast('Injection Failed', result.message || 'Check server logs', 'error');
      }
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<svg class="icon-sm"><use href="#icon-brand-buzl"/></svg> <span>Apply Configuration &amp; Run Automated Tests</span>';
      testSummaryBadge.textContent = 'Network Error';
      testSummaryBadge.className = 'tab-badge badge-danger';
      testConsole.innerHTML = `<p class="test-icon fail">Error communicating with local server: ${err.message}</p>`;
      showToast('Network Error', err.message, 'error');
    }
  });

  // ==========================================================================
  // 7. Quick Multi-Channel Test Lead Button
  // ==========================================================================
  if (btnTestSubmit) {
    btnTestSubmit.addEventListener('click', async () => {
      const config = getCurrentConfig();
      const phone = testLeadPhone.value.trim() || (currentScanData && currentScanData.detectedWhatsapp) || '';
      const name = testLeadName.value.trim() || 'Test Lead';
      const service = testLeadService.value.trim() || (currentScanData && currentScanData.detectedService) || 'General Inquiry';
      const loc = (siteLocationInput ? siteLocationInput.value.trim() : '') || (currentScanData && currentScanData.detectedLocation) || '';

      btnTestSubmit.disabled = true;
      btnTestSubmit.innerHTML = '<svg class="icon-sm icon-spin"><use href="#icon-refresh"/></svg> <span>Sending Live Test Lead...</span>';
      liveTestBadge.textContent = 'Testing...';
      liveTestBadge.className = 'badge badge-info';
      testDispatchResults.classList.remove('hidden');
      testDispatchResults.innerHTML = '<p class="dispatch-detail">Dispatching synthetic test lead across active channels...</p>';

      try {
        const res = await fetch('/api/test-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config,
            lead: {
              phone,
              name,
              service,
              location: loc
            }
          })
        });

        const data = await res.json();
        btnTestSubmit.disabled = false;
        btnTestSubmit.innerHTML = '<svg class="icon-sm"><use href="#icon-send"/></svg> <span>Dispatch Quick Live Test Lead</span>';

        if (data.success && data.results) {
          const channels = data.results.channels;
          if (channels && channels.buzlCapi) {
            renderCapiInspector(channels.buzlCapi);
            if (currentVerificationReport) {
              currentVerificationReport.capi = channels.buzlCapi;
            }
          }
          testDispatchResults.innerHTML = '';

          let anyFailed = false;

          for (const [key, ch] of Object.entries(channels)) {
            const row = document.createElement('div');
            row.className = 'dispatch-row';

            const labelMap = {
              googleSheets: 'Google Sheets CRM',
              buzlCapi: 'Buzl CAPI Server',
              zoho: 'Zoho Web-to-Lead'
            };
            const serviceName = labelMap[key] || key;

            let badgeHtml = '';
            if (!ch.tested) {
              badgeHtml = `<span class="badge badge-neutral">Disabled</span>`;
            } else if (ch.ok) {
              badgeHtml = `<span class="badge badge-success"><svg class="icon-xs"><use href="#icon-check"/></svg> <span>Success</span></span>`;
            } else {
              anyFailed = true;
              badgeHtml = `<span class="badge badge-danger"><svg class="icon-xs"><use href="#icon-x"/></svg> <span>Failed</span></span>`;
            }

            row.innerHTML = `
              <div>
                <div class="dispatch-service">${serviceName}</div>
                <div class="dispatch-detail">${ch.message}</div>
              </div>
              <div>${badgeHtml}</div>
            `;
            testDispatchResults.appendChild(row);
          }

          liveTestBadge.textContent = anyFailed ? 'Issues Found' : 'All Channels OK';
          liveTestBadge.className = anyFailed ? 'badge badge-danger' : 'badge badge-success';

          showToast(
            anyFailed ? 'Test Lead Dispatched with Warnings' : 'Test Lead Dispatched',
            anyFailed ? 'One or more active channels reported issues.' : 'All active channels responded successfully.',
            anyFailed ? 'error' : 'success'
          );

        } else {
          testDispatchResults.innerHTML = `<p class="dispatch-detail text-danger">${data.message || 'Failed to dispatch test lead'}</p>`;
          showToast('Dispatch Failed', data.message || 'Check server connection', 'error');
        }
      } catch (err) {
        btnTestSubmit.disabled = false;
        btnTestSubmit.innerHTML = '<svg class="icon-sm"><use href="#icon-send"/></svg> <span>Dispatch Quick Live Test Lead</span>';
        testDispatchResults.innerHTML = `<p class="dispatch-detail text-danger">Error: ${err.message}</p>`;
        showToast('Network Error', err.message, 'error');
      }
    });
  }

  if (btnScan) {
    btnScan.addEventListener('click', () => {
      loadScan();
      showToast('Scan Refreshed', 'Inspected workspace HTML files and active state', 'info', 2000);
    });
  }

  // Initialize
  loadScan();
  loadScriptTemplate();
});
