/**
 * =========================================================================
 * BUZL CAPI & MULTI-CHANNEL TRACKING DISPATCHER — TERMINAL WIZARD
 * Official Buzl Brand Interface (Electric Blue #0040FF & Energy Amber #F59E0B)
 * =========================================================================
 */
const readline = require('readline');
const path = require('path');
const { scanProject } = require('../core/scanner');
const { applyInjection, removeTracking, removeService } = require('../core/injector');
const { runVerification, testIndividualForm } = require('../core/tester');
const { listBackups, restoreBackup, manualBackup } = require('../core/rollback');
const { startGuiServer } = require('../gui/server');

// Official Buzl Brand Color Tokens (with ANSI Truecolor & fallback)
const colors = {
  blue: (s) => `\x1b[38;2;59;95;245m${s}\x1b[0m`,       // #3B5FF5 Electric Brand Blue
  blueBold: (s) => `\x1b[1m\x1b[38;2;59;95;245m${s}\x1b[0m`,
  amber: (s) => `\x1b[38;2;245;158;11m${s}\x1b[0m`,     // #F59E0B Energy Amber
  amberBold: (s) => `\x1b[1m\x1b[38;2;245;158;11m${s}\x1b[0m`,
  green: (s) => `\x1b[38;2;16;185;129m${s}\x1b[0m`,     // #10B981 Emerald Green
  greenBold: (s) => `\x1b[1m\x1b[38;2;16;185;129m${s}\x1b[0m`,
  red: (s) => `\x1b[38;2;239;68;68m${s}\x1b[0m`,        // #EF4444 Crimson Red
  redBold: (s) => `\x1b[1m\x1b[38;2;239;68;68m${s}\x1b[0m`,
  ice: (s) => `\x1b[38;2;147;173;253m${s}\x1b[0m`,      // #93ADFD Ice Blue
  cyan: (s) => `\x1b[38;2;56;189;248m${s}\x1b[0m`,      // #38BDF8 Sky Cyan
  slate: (s) => `\x1b[38;2;148;163;184m${s}\x1b[0m`,    // #94A3B8 Secondary Text
  dim: (s) => `\x1b[38;2;100;116;139m${s}\x1b[0m`,      // #64748B Muted Slate
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  border: (s) => `\x1b[38;2;59;95;245m${s}\x1b[0m`
};

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Render the full intuitive Buzl CAPI dashboard in the terminal
 */
function printLiveState(scan) {
  const live = scan.liveState || {};
  const b = colors.border;

  // 1. Hero Banner in CODE Typography
  console.log('');
  console.log(colors.blueBold('  ██████╗ ██╗   ██╗███████╗██╗     ') + colors.amberBold('    ██████╗ █████╗ ██████╗ ██╗'));
  console.log(colors.blueBold('  ██╔══██╗██║   ██║╚══███╔╝██║     ') + colors.amberBold('   ██╔════╝██╔══██╗██╔══██╗██║'));
  console.log(colors.blueBold('  ██████╔╝██║   ██║  ███╔╝ ██║  ███') + colors.amberBold('██╗██║     ███████║██████╔╝██║'));
  console.log(colors.blueBold('  ██╔══██╗██║   ██║ ███╔╝  ██║  ╚══') + colors.amberBold('══╝██║     ██╔══██║██╔═══╝ ██║'));
  console.log(colors.blueBold('  ██████╔╝╚██████╔╝███████╗███████╗') + colors.amberBold('   ╚██████╗██║  ██║██║     ██║'));
  console.log(colors.blueBold('  ╚═════╝  ╚═════╝ ╚══════╝╚══════╝') + colors.amberBold('    ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝'));
  console.log(colors.ice('       ⚡ BUZL CONVERSIONS API & MULTI-CHANNEL DISPATCHER • v1.0.0\n'));

  // 2. Target Project Scope Card
  console.log(b('  ╭─────────────────────────── [ 📂 TARGET PROJECT ] ───────────────────────────╮'));
  console.log(b('  │') + '  Path     : ' + colors.bold(scan.rootDir));
  console.log(b('  │') + '  Pages    : ' + colors.ice(`${scan.totalHtmlFiles} HTML file(s) discovered`));
  console.log(b('  │') + '  Location : ' + colors.amber(scan.detectedLocation || 'N/A'));
  console.log(b('  ╰─────────────────────────────────────────────────────────────────────────────╯'));
  console.log('');

  // 3. Live Service & Dispatch Matrix Card
  console.log(b('  ╭──────────────────────── [ ⚡ LIVE SERVICE STATUS ] ─────────────────────────╮'));
  const gtmId = (live.gtm && live.gtm.id) || null;
  const metaId = (live.meta && live.meta.id) || null;
  const capiActive = !!(live.buzlCapi && live.buzlCapi.active);
  const sheetsActive = !!(live.googleSheets && live.googleSheets.active);
  const zohoActive = !!(live.zoho && live.zoho.active);
  const waActive = !!(live.whatsapp && live.whatsapp.active);
  const backupsCount = (live.backups && live.backups.length) || 0;

    const detectedWa = scan.detectedWhatsapp || (live.whatsapp && live.whatsapp.detectedNumber);
    let waDetail = 'Not configured';
    if (waActive) {
      waDetail = `Active (${live.whatsapp.number})`;
    } else if (detectedWa) {
      waDetail = `Auto-detected from buttons: ${detectedWa}`;
    }

    const rows = [
      { name: '🏷️  GTM Container', active: !!(live.gtm && live.gtm.active), detail: gtmId ? `Container: ${gtmId}` : 'Not injected' },
      { name: '🎯 Meta Pixel', active: !!(live.meta && live.meta.active), detail: metaId ? `Pixel ID: ${metaId}` : 'Not injected' },
      { name: '⚡ Buzl CAPI', active: capiActive, detail: capiActive ? 'Connected (https://dev.api.gobuzl.com/api/leads)' : 'Inactive (Ready to activate)' },
      { name: '📊 Google Sheets', active: sheetsActive, detail: sheetsActive ? (live.googleSheets.url.slice(0, 42) + '...') : 'Not connected' },
      { name: '💼 Zoho CRM Web', active: zohoActive, detail: zohoActive ? 'Connected (crm.zoho.in)' : 'Not connected' },
      { name: '💬 WhatsApp Link', active: waActive, detail: waDetail },
      { name: '💾 Safe Snapshots', active: backupsCount > 0, detail: `${backupsCount} snapshot(s) on disk (1-click restore)` }
    ];

    rows.forEach(r => {
      const statusText = r.active ? colors.greenBold('● ACTIVE   ') : colors.dim('○ INACTIVE ');
      const detailColor = r.active ? colors.ice : (r.name.includes('WhatsApp') && detectedWa ? colors.amber : colors.dim);
      console.log(b('  │') + `  ${r.name.padEnd(20)} ${statusText}  ${detailColor(r.detail)}`);
    });
    console.log(b('  ╰─────────────────────────────────────────────────────────────────────────────╯'));
    console.log('');

    // 4. Discovered Forms Inventory Card
    if (scan.forms && scan.forms.length > 0) {
      console.log(b('  ╭────────────────────────── [ 📝 DETECTED FORMS ] ───────────────────────────╮'));
      scan.forms.forEach((f, idx) => {
        const inputsList = f.inputs.map(i => i.name).join(', ') || 'No named inputs';
        const waTag = f.detectedWhatsapp ? colors.green(` [💬 WA: ${f.detectedWhatsapp}]`) : '';
        console.log(b('  │') + `  ${colors.amberBold('[' + (idx + 1) + ']')} ${colors.cyan(f.selector)} in ${colors.dim(f.file)}${waTag} (${f.inputCount} inputs: ${colors.slate(inputsList)})`);
      });
      console.log(b('  ╰─────────────────────────────────────────────────────────────────────────────╯'));
      console.log('');
    }

  // 5. Action Command Center Menu
  console.log(colors.amberBold('  ⚡ ACTION COMMAND CENTER:'));
  console.log(`    ${colors.amberBold('[1]')} ${colors.blue('⚡ Deploy / Update Tracking Configuration')}`);
  console.log(`    ${colors.amberBold('[2]')} ${colors.green('🧪 Test Individual Form Submission (Interactive)')}`);
  console.log(`    ${colors.amberBold('[3]')} ${colors.ice('💾 Create Named Snapshot Backup')}`);
  console.log(`    ${colors.amberBold('[4]')} ${colors.ice('↺ View & 1-Click Restore Backups')}`);
  console.log(`    ${colors.amberBold('[5]')} ${colors.red('🧹 Selective Service Removal / Nuclear Clean Uninstall')}`);
  console.log(`    ${colors.amberBold('[6]')} ${colors.cyan('🌐 Launch Web GUI Dashboard on http://localhost:3333')}`);
  console.log(`    ${colors.dim('[0] ✖ Exit Terminal')}\n`);
}

async function runTerminalWizard(rootDir) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const scan = scanProject(rootDir);
    printLiveState(scan);

    if (scan.totalHtmlFiles === 0) {
      console.log(colors.red('  ❌ No HTML files found in current directory.'));
      rl.close();
      return;
    }

    const choice = (await askQuestion(rl, colors.amberBold('  ⚡ Select an option [1-6, 0]: '))).trim();

    if (choice === '0' || choice === '') {
      console.log(colors.dim('\n  Exiting Buzl Tracker. Have a productive day!\n'));
      rl.close();
      return;
    }

    // 1. Inject / Update Tracking
    if (choice === '1') {
      console.log('\n' + colors.blueBold('  ╭─ [ ⚡ CONFIGURE TRACKING & CREDENTIALS ] ─────────────────────────╮'));
      
      const gtmPrompt = scan.liveState.gtm.id 
        ? `GTM Container ID [${scan.liveState.gtm.id}] (type 'none' to remove): ` 
        : 'GTM Container ID (e.g. GTM-TRF9ZHHH, or Enter to skip): ';
      let gtmId = (await askQuestion(rl, `  │  ${gtmPrompt}`)).trim();
      if (['none', 'remove', '0', 'off', 'disable'].includes(gtmId.toLowerCase())) {
        gtmId = '';
      } else if (!gtmId && scan.liveState.gtm.id) {
        gtmId = scan.liveState.gtm.id;
      }

      const metaPrompt = scan.liveState.meta.id 
        ? `Meta Pixel ID [${scan.liveState.meta.id}] (type 'none' to remove): ` 
        : 'Meta Pixel ID (or Enter to skip): ';
      let metaPixelId = (await askQuestion(rl, `  │  ${metaPrompt}`)).trim();
      if (['none', 'remove', '0', 'off', 'disable'].includes(metaPixelId.toLowerCase())) {
        metaPixelId = '';
      } else if (!metaPixelId && scan.liveState.meta.id) {
        metaPixelId = scan.liveState.meta.id;
      }

      const sheetPrompt = scan.liveState.googleSheets.url 
        ? `Google Sheet Web App URL [Keep existing] (type 'none' to remove): ` 
        : 'Google Sheet Web App URL (or Enter to skip): ';
      let googleSheetUrl = (await askQuestion(rl, `  │  ${sheetPrompt}`)).trim();
      if (['none', 'remove', '0', 'off', 'disable'].includes(googleSheetUrl.toLowerCase())) {
        googleSheetUrl = '';
      } else if (!googleSheetUrl && scan.liveState.googleSheets.url) {
        googleSheetUrl = scan.liveState.googleSheets.url;
      }

      const buzlCapiUser = (await askQuestion(rl, `  │  Buzl CAPI authUser [${scan.liveState.buzlCapi.authUser || '2BuzlmqpHJeVBow0dzR9gP3$uQLxIA'}]: `)).trim() || (scan.liveState.buzlCapi.authUser || '2BuzlmqpHJeVBow0dzR9gP3$uQLxIA');
      const buzlCapiPass = (await askQuestion(rl, `  │  Buzl CAPI authPass: `)).trim() || 'dgAY%nH1MNPgOvGaYRg6ynomM3mbJgGjr%Z3FcPCJNzvm#KjV!I%Y9tf$bDacBgPIABuzl';

      const detectedWa = scan.detectedWhatsapp || (scan.liveState.whatsapp && scan.liveState.whatsapp.detectedNumber) || '';
      const existingWa = scan.liveState.whatsapp && scan.liveState.whatsapp.number;
      const defaultWa = existingWa || detectedWa || '';
      const waPrompt = defaultWa
        ? `WhatsApp Business Number [${defaultWa}] (type 'none' to remove): `
        : 'WhatsApp Business Number (or Enter to skip): ';
      let whatsappNumber = (await askQuestion(rl, `  │  ${waPrompt}`)).trim();
      if (['none', 'remove', '0', 'off', 'disable'].includes(whatsappNumber.toLowerCase())) {
        whatsappNumber = '';
      } else if (!whatsappNumber && defaultWa) {
        whatsappNumber = defaultWa;
      }
      console.log(colors.blueBold('  ╰───────────────────────────────────────────────────────────────────╯'));

      const config = {
        gtmId,
        metaPixelId,
        googleSheetUrl,
        whatsappNumber,
        whatsapp: {
          number: whatsappNumber
        },
        siteLocation: scan.detectedLocation,
        buzlCapi: {
          endpoint: 'https://dev.api.gobuzl.com/api/leads',
          authUser: buzlCapiUser,
          authPass: buzlCapiPass
        }
      };

      console.log('\n' + colors.cyan('  🚀 Applying injection and deploying runtime...'));
      const htmlFilePaths = scan.files.map(f => f.filePath);
      const injectResult = applyInjection(rootDir, htmlFilePaths, config);
      console.log(colors.greenBold(`  ✔ Successfully injected into ${injectResult.modifiedFiles.length} file(s).`));

      console.log(colors.amber('\n  🧪 Running automated verification suite...'));
      const testReport = await runVerification(rootDir, htmlFilePaths, config);
      testReport.tests.forEach(t => {
        const icon = t.passed ? colors.greenBold('✔ PASS') : colors.redBold('✖ FAIL');
        console.log(`    ${icon}: ${t.name} ${t.detail ? colors.dim(`(${t.detail})`) : ''}`);
      });
      console.log(colors.greenBold(`\n  🎉 Completed: ${testReport.passedCount}/${testReport.total} tests passed!\n`));
      rl.close();
      return;
    }

    // 2. Test Individual Form
    if (choice === '2') {
      if (!scan.forms || scan.forms.length === 0) {
        console.log(colors.red('  ❌ No forms discovered on site to test.'));
        rl.close();
        return;
      }
      console.log('\n' + colors.amberBold('  Select Form to Test:'));
      scan.forms.forEach((f, idx) => {
        console.log(`    ${colors.amberBold('[' + (idx + 1) + ']')} ${colors.cyan(f.selector)} in ${colors.dim(f.file)} (${f.inputCount} inputs)`);
      });
      const formChoice = parseInt((await askQuestion(rl, colors.amberBold(`\n  Choose form [1-${scan.forms.length}]: `))).trim(), 10);
      const selectedForm = scan.forms[formChoice - 1];
      if (!selectedForm) {
        console.log(colors.red('  ❌ Invalid form selection.'));
        rl.close();
        return;
      }

      console.log(`\n  Testing Form: ${colors.cyan(selectedForm.selector)}`);
      const testPhone = (await askQuestion(rl, '  Enter test phone [9585950059]: ')).trim() || '9585950059';
      const testName = (await askQuestion(rl, '  Enter test name [Buzl Test Lead]: ')).trim() || 'Buzl Test Lead';

      const formFields = { phone: testPhone, name: testName, formId: selectedForm.formId };
      selectedForm.inputs.forEach(inp => {
        if (!formFields[inp.name]) {
          formFields[inp.name] = inp.name.includes('service') ? 'Sports Injury Rehabilitation' : 'Test Value';
        }
      });

      console.log(colors.amber('\n  ⏳ Dispatching synthetic lead across active destinations...'));
      const testResults = await testIndividualForm(rootDir, selectedForm.formId, formFields, scan.existingConfig || {});
      console.log('\n' + colors.blueBold('  Test Results:'));
      for (const [ch, res] of Object.entries(testResults.channels)) {
        const icon = res.tested ? (res.ok ? colors.greenBold('✔') : colors.redBold('✖')) : colors.dim('○');
        const statusLabel = res.tested ? (res.ok ? colors.greenBold('Delivered') : colors.redBold('Failed')) : colors.dim('Disabled');
        console.log(`    ${icon} ${colors.bold(ch.padEnd(14))}: [${statusLabel}] ${res.message}`);
      }
      console.log('');
      rl.close();
      return;
    }

    // 3. Create Named Backup
    if (choice === '3') {
      const bName = (await askQuestion(rl, colors.amberBold('\n  Enter snapshot name (e.g. "Pre-Sprint Checkpoint"): '))).trim();
      const bRes = manualBackup(rootDir, bName);
      if (bRes.success) {
        console.log(colors.greenBold(`\n  ✔ ${bRes.message}\n`));
      } else {
        console.log(colors.redBold(`\n  ✖ ${bRes.message}\n`));
      }
      rl.close();
      return;
    }

    // 4. View & Restore Named Backups
    if (choice === '4') {
      const backups = listBackups(rootDir);
      if (backups.length === 0) {
        console.log(colors.amber('\n  No backups found on disk.\n'));
        rl.close();
        return;
      }
      console.log('\n' + colors.amberBold('  Available Snapshots on Disk:'));
      backups.forEach((b, idx) => {
        console.log(`    ${colors.amberBold('[' + (idx + 1) + ']')} ${colors.bold(b.name)} ${colors.dim('(' + b.dirName + ')')} — ${colors.ice(b.timestamp)} [${b.filesCount} files]`);
      });
      const rChoice = (await askQuestion(rl, colors.amberBold(`\n  Choose backup to restore [1-${backups.length}, or Enter to cancel]: `))).trim();
      const targetBackup = backups[parseInt(rChoice, 10) - 1];
      if (targetBackup) {
        const confirm = (await askQuestion(rl, colors.red(`  Restore "${targetBackup.name}"? This replaces current HTML files [y/N]: `))).trim().toLowerCase();
        if (confirm === 'y' || confirm === 'yes') {
          const res = restoreBackup(rootDir, targetBackup.dirName);
          console.log(colors.greenBold(`\n  ✔ ${res.message}\n`));
        } else {
          console.log(colors.dim('\n  Restore cancelled.\n'));
        }
      }
      rl.close();
      return;
    }

    // 5. Selective Service Removal & Clean Uninstall
    if (choice === '5') {
      console.log('\n' + colors.amberBold('  ╭─ [ 🧹 SELECTIVE SERVICE REMOVAL & UNINSTALL ] ────────────────────╮'));
      console.log(`  │  ${colors.amberBold('[1]')} 🏷️   Remove Google Tag Manager (GTM) Container Only     │`);
      console.log(`  │  ${colors.amberBold('[2]')} 🎯   Remove Meta Pixel & Client CAPI Only               │`);
      console.log(`  │  ${colors.amberBold('[3]')} ⚡   Remove Buzl CAPI Server-Side Endpoint Only         │`);
      console.log(`  │  ${colors.amberBold('[4]')} 📊   Remove Google Sheets Direct Sync Only              │`);
      console.log(`  │  ${colors.amberBold('[5]')} 💼   Remove Zoho CRM Web-to-Lead Only                   │`);
      console.log(`  │  ${colors.amberBold('[6]')} 🧹   Cleanly Remove All Tracking (Nuclear Uninstall)     │`);
      console.log(`  │  ${colors.dim('[0]')} ↩   Cancel / Back to Menu                              │`);
      console.log(colors.amberBold('  ╰───────────────────────────────────────────────────────────────────╯'));

      const remChoice = (await askQuestion(rl, colors.amberBold('\n  Select service to remove [1-6, 0]: '))).trim();
      if (remChoice === '0' || remChoice === '') {
        console.log(colors.dim('\n  Removal cancelled.\n'));
        rl.close();
        return;
      }

      const serviceMap = {
        '1': 'gtm',
        '2': 'meta',
        '3': 'capi',
        '4': 'sheets',
        '5': 'zoho',
        '6': 'all'
      };

      const targetService = serviceMap[remChoice];
      if (!targetService) {
        console.log(colors.red('  ❌ Invalid selection.'));
        rl.close();
        return;
      }

      const confirm = (await askQuestion(rl, colors.red(`\n  Confirm removal of ${targetService.toUpperCase()}? (Safety backup will be saved) [y/N]: `))).trim().toLowerCase();
      if (confirm === 'y' || confirm === 'yes') {
        const res = removeService(rootDir, targetService);
        if (res.success) {
          console.log(colors.greenBold(`\n  ✔ ${res.message}\n`));
        } else {
          console.log(colors.redBold(`\n  ✖ ${res.message}\n`));
        }
      } else {
        console.log(colors.dim('\n  Removal cancelled.\n'));
      }
      rl.close();
      return;
    }

    // 6. Launch Web GUI
    if (choice === '6') {
      rl.close();
      startGuiServer(rootDir);
      return;
    }

  } catch (err) {
    console.error(colors.redBold('\n  Error: ' + err.message + '\n'));
    rl.close();
  }
}

module.exports = {
  runTerminalWizard,
  printLiveState
};
