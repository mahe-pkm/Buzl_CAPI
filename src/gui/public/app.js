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

  let scriptTemplateText = '';

  const siteLocationInput = document.getElementById('siteLocation');
  const columnHierarchyPreview = document.getElementById('columnHierarchyPreview');
  const dynamicFieldsChecklist = document.getElementById('dynamicFieldsChecklist');

  let activeDynamicFields = [];
  let currentScanData = null;

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

  // 1. Fetch project scan & live state
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
              <span><strong>${formatted}</strong> (${f.tag}) — <small class="helper-text">Placed next to Phone (Col D)</small></span>
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
        chip.innerHTML = `<span class="status-dot ${item.active ? 'dot-active' : 'dot-inactive'}"></span> <span>${item.text}</span> ${item.active ? `<button type="button" class="chip-remove-btn" data-service="${item.serviceKey}" title="Remove ${item.label}"><svg class="icon-xs"><use href="#icon-x"/></svg></button>` : ''}`;

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

  async function removeSingleService(serviceKey) {
    const serviceNames = {
      gtm: 'Google Tag Manager (GTM)',
      meta: 'Meta Pixel & Client CAPI',
      capi: 'Buzl CAPI Server-Side Endpoint',
      sheets: 'Google Sheets Direct CRM',
      zoho: 'Zoho CRM Web-to-Lead',
      whatsapp: 'WhatsApp Handoff'
    };
    const name = serviceNames[serviceKey] || serviceKey;
    if (!confirm(`Are you sure you want to remove ${name} from this site?\n\nAll other active tracking and configurations will be safely preserved. An automatic safety snapshot will be created before removal.`)) {
      return;
    }

    try {
      const res = await fetch('/api/remove-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceKey })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadScan();
      } else {
        alert(`Failed to remove ${name}: ${data.message}`);
      }
    } catch (err) {
      alert(`Network error removing ${name}: ${err.message}`);
    }
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

  // 2. Render Individual Discovered Forms with Per-Form Testing
  function renderIndividualForms(forms, archetypes) {
    if (!individualFormsList) return;
    individualFormsList.innerHTML = '';

    const listToRender = (archetypes && archetypes.length > 0) ? archetypes : forms;

    if (formsCountBadge) {
      if (archetypes && archetypes.length > 0 && forms.length !== archetypes.length) {
        formsCountBadge.textContent = `${forms.length} Instances (${archetypes.length} Unique)`;
      } else {
        formsCountBadge.textContent = `${forms.length} Form(s)`;
      }
    }

    if (!listToRender || listToRender.length === 0) {
      individualFormsList.innerHTML = '<p class="empty-state">No forms found on HTML pages.</p>';
      return;
    }

    listToRender.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'form-item-card';

      const tagPills = f.inputs.map(i => `<span class="col-pill col-pill-dynamic" style="font-size: 10px;">${i.name}</span>`).join('');

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
        : `<small style="color: var(--text-dim); font-size: 11px;">in <code>${f.file || (f.pages && f.pages[0]) || 'page'}</code></small>`;

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
            <span>Test This Form (${f.selector})</span>
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
        resultSpan.innerHTML = '<svg class="icon-xs icon-spin"><use href="#icon-refresh"/></svg> <span>Dispatching to Sheet &amp; CAPI...</span>';

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
          testBtn.innerHTML = `<svg class="icon-xs"><use href="#icon-send"/></svg> <span>Test This Form (${f.selector})</span>`;

          if (data.success && data.results) {
            const ch = data.results.channels;
            const sheetOk = ch.googleSheets && ch.googleSheets.ok;
            const capiOk = ch.buzlCapi && ch.buzlCapi.ok;

            if (sheetOk || capiOk) {
              resultSpan.className = 'form-test-result badge badge-success';
              const rowLabel = (ch.googleSheets.message.match(/Row \d+/) || [])[0] || 'OK';
              resultSpan.innerHTML = `<svg class="icon-xs" style="vertical-align:text-bottom; margin-right:3px;"><use href="#icon-check"/></svg> <span>Delivered! (Sheets: ${sheetOk ? rowLabel : 'Off'} | CAPI: ${capiOk ? 'Accepted' : 'Off'})</span>`;
            } else {
              resultSpan.className = 'form-test-result badge badge-danger';
              resultSpan.innerHTML = `<svg class="icon-xs" style="vertical-align:text-bottom; margin-right:3px;"><use href="#icon-x"/></svg> <span>Failed: ${ch.googleSheets.message || ch.buzlCapi.message || 'Error'}</span>`;
            }
          } else {
            resultSpan.className = 'form-test-result badge badge-danger';
            resultSpan.innerHTML = `<svg class="icon-xs" style="vertical-align:text-bottom; margin-right:3px;"><use href="#icon-x"/></svg> <span>Error: ${data.message || 'Failed'}</span>`;
          }
        } catch (e) {
          testBtn.disabled = false;
          testBtn.innerHTML = `<svg class="icon-xs"><use href="#icon-send"/></svg> <span>Test This Form (${f.selector})</span>`;
          resultSpan.className = 'form-test-result badge badge-danger';
          resultSpan.innerHTML = `<svg class="icon-xs" style="vertical-align:text-bottom; margin-right:3px;"><use href="#icon-x"/></svg> <span>Network Error: ${e.message}</span>`;
        }
      });

      individualFormsList.appendChild(card);
    });
  }

  // 3. Named Backups Management
  async function loadBackupsList() {
    if (!backupsTableBody) return;
    backupsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading backups...</td></tr>';

    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      const backups = data.backups || [];

      if (backupsCountBadge) backupsCountBadge.textContent = backups.length;

      if (backups.length === 0) {
        backupsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No backups found on disk.</td></tr>';
        return;
      }

      backupsTableBody.innerHTML = '';
      backups.forEach(b => {
        const tr = document.createElement('tr');
        const formattedDate = b.timestamp ? new Date(b.timestamp).toLocaleString() : 'N/A';

        tr.innerHTML = `
          <td><strong>${b.name || 'Snapshot'}</strong></td>
          <td><code style="font-size: 11px; color: var(--text-muted);">${b.dirName}</code></td>
          <td>${formattedDate}</td>
          <td><span class="badge badge-neutral">${b.filesCount} file(s)</span></td>
          <td style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-secondary btn-sm btn-restore-backup" data-dir="${b.dirName}" data-name="${b.name}">
              <svg class="icon-xs"><use href="#icon-refresh"/></svg>
              <span>Restore</span>
            </button>
            <button type="button" class="btn btn-danger-outline btn-sm btn-delete-backup" data-dir="${b.dirName}">
              <svg class="icon-xs"><use href="#icon-trash"/></svg>
              <span>Delete</span>
            </button>
          </td>
        `;

        // Restore action
        tr.querySelector('.btn-restore-backup').addEventListener('click', async (e) => {
          const dir = e.currentTarget.dataset.dir;
          const name = e.currentTarget.dataset.name;
          if (!confirm(`Are you sure you want to restore "${name}" (${dir})? All current HTML files will be replaced with this snapshot.`)) return;

          try {
            const rRes = await fetch('/api/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ backupDirName: dir })
            });
            const rData = await rRes.json();
            alert(rData.message);
            backupsModal.classList.add('hidden');
            loadScan();
          } catch (err) {
            alert('Restore failed: ' + err.message);
          }
        });

        // Delete action
        tr.querySelector('.btn-delete-backup').addEventListener('click', async (e) => {
          const dir = e.currentTarget.dataset.dir;
          if (!confirm(`Are you sure you want to delete backup "${dir}"? This cannot be undone.`)) return;

          try {
            const dRes = await fetch('/api/delete-backup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ backupDirName: dir })
            });
            const dData = await dRes.json();
            loadBackupsList();
          } catch (err) {
            alert('Delete failed: ' + err.message);
          }
        });

        backupsTableBody.appendChild(tr);
      });
    } catch (e) {
      backupsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Failed to load backups: ${e.message}</td></tr>`;
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
        loadBackupsList();
      } catch (err) {
        btnCreateNamedBackup.disabled = false;
        btnCreateNamedBackup.innerHTML = '<svg class="icon-sm"><use href="#icon-database"/></svg> <span>Save Snapshot</span>';
        alert('Backup failed: ' + err.message);
      }
    });
  }

  // 4. Clean Tracking Removal / Uninstaller
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
      btnConfirmUninstall.textContent = '⏳ Removing all tracking...';

      try {
        const res = await fetch('/api/remove-tracking', { method: 'POST' });
        const data = await res.json();
        btnConfirmUninstall.disabled = false;
        btnConfirmUninstall.textContent = 'Confirm & Remove All Tracking';
        uninstallModal.classList.add('hidden');

        alert(data.message);
        loadScan();
      } catch (e) {
        btnConfirmUninstall.disabled = false;
        btnConfirmUninstall.textContent = 'Confirm & Remove All Tracking';
        alert('Removal failed: ' + e.message);
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

  // 5. Fetch Apps Script Template Code
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
        copyScriptCode.innerHTML = '<svg class="icon-xs" style="color:var(--success)"><use href="#icon-check"/></svg> <span>Copied!</span>';
        setTimeout(() => {
          copyScriptCode.innerHTML = '<svg class="icon-xs"><use href="#icon-clipboard"/></svg> <span>Copy Code</span>';
        }, 2000);
      });
    });
  }

  // Toggle helpers
  function setupToggle(switchId, sectionId) {
    const sw = document.getElementById(switchId);
    const sec = document.getElementById(sectionId);
    if (!sw || !sec) return;
    sw.addEventListener('change', () => {
      sec.style.opacity = sw.checked ? '1' : '0.4';
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

  // 6. Inject & Run Tests Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<svg class="icon-sm icon-spin"><use href="#icon-refresh"/></svg> <span>Injecting &amp; Running Tests...</span>';
    testSummaryBadge.textContent = 'Testing...';
    testSummaryBadge.className = 'badge badge-info';
    testConsole.innerHTML = '<p class="empty-state">Executing injection and running automated verification tests...</p>';

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
        testSummaryBadge.className = report.allPassed ? 'badge badge-success' : 'badge badge-danger';

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

        loadScan();
      } else {
        testSummaryBadge.textContent = 'Failed';
        testSummaryBadge.className = 'badge badge-danger';
        testConsole.innerHTML = `<p class="test-icon fail">Error: ${result.message || 'Injection failed'}</p>`;
      }
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<svg class="icon-sm"><use href="#icon-brand-buzl"/></svg> <span>Apply Configuration &amp; Run Automated Tests</span>';
      testSummaryBadge.textContent = 'Network Error';
      testSummaryBadge.className = 'badge badge-danger';
      testConsole.innerHTML = `<p class="test-icon fail">Error communicating with local server: ${err.message}</p>`;
    }
  });

  // 7. Quick Multi-Channel Test Lead Button
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
          testDispatchResults.innerHTML = '';

          let anyFailed = false;

          for (const [key, ch] of Object.entries(channels)) {
            const row = document.createElement('div');
            row.className = 'dispatch-row';

            const labelMap = {
              googleSheets: 'Google Sheets',
              buzlCapi: 'Buzl CAPI',
              zoho: 'Zoho CRM'
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

        } else {
          testDispatchResults.innerHTML = `<p class="dispatch-detail text-danger">${data.message || 'Failed to dispatch test lead'}</p>`;
        }
      } catch (err) {
        btnTestSubmit.disabled = false;
        btnTestSubmit.innerHTML = '<svg class="icon-sm"><use href="#icon-send"/></svg> <span>Dispatch Quick Live Test Lead</span>';
        testDispatchResults.innerHTML = `<p class="dispatch-detail text-danger">Error: ${err.message}</p>`;
      }
    });
  }

  if (btnScan) btnScan.addEventListener('click', loadScan);

  // Initialize
  loadScan();
  loadScriptTemplate();
});
