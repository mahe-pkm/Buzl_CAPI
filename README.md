# ⚡ Buzl Tracker & Conversions API (`@mahe_pkm/buzl-capi`)

[![npm version](https://img.shields.io/badge/version-0.1.4-blue.svg)](https://github.com/mahe-pkm/Buzl_CAPI)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests: Passing](https://img.shields.io/badge/tests-38%2F38%20passing-success.svg)](tests/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20external-purple.svg)](package.json)
[![User Handbook](https://img.shields.io/badge/docs-User%20Handbook%20(PDF)-orange.svg)](USER_HANDBOOK.md)

> **All-in-one Node.js CLI & Local Web GUI for automated Google Tag Manager (GTM), Meta Pixel & Conversions API (CAPI), Google Sheets CRM Multi-Tab Sync, and Zoho CRM injection with self-testing and automated PDF audit reporting.**

---

## 📖 Official User Handbook & Multi-OS Commands

Looking for copy-ready command blocks for **Windows (PowerShell & CMD)**, **macOS**, and **Linux**?
- 📘 Read the full markdown guide: [**USER_HANDBOOK.md**](USER_HANDBOOK.md)
- 🖨️ Open and print or save the handbook as a PDF: [**USER_HANDBOOK.html**](USER_HANDBOOK.html)
- 🚀 Or run directly from terminal:
  ```bash
  npx @mahe_pkm/buzl-capi --handbook
  ```

---

## 🎯 The Problem This Solves

When deploying or optimizing lead-generation landing pages, configuring analytics tags, conversion pixels, CRM webhooks, and spreadsheet logging requires tedious manual labor:
- Editing `<head>` and `<body>` tags across dozens of HTML files.
- Writing custom JavaScript form interceptors.
- Manually capturing UTM parameters, Google Click IDs (`gclid`), and Meta Click IDs (`fbclid`, `_fbc`, `_fbp`).
- Paying expensive monthly subscription fees for third-party webhook connectors (e.g. Zapier, Make).
- Fixing broken formulas in spreadsheets when rows insert at the top.

**`buzl-tracker` completely automates this entire pipeline in under 60 seconds.**

---

## 🏗️ Multi-Channel Lead Flow Architecture

```
                       ┌──────────────────────────────┐
                       │   Website Visitor Submits    │
                       │    HTML Form or WhatsApp     │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │     buzl-tracking.js         │
                       │   Runtime Client Interceptor │
                       │  - Captures UTMs & Cookies   │
                       │  - Generates Unique leadId   │
                       └──────┬───────┬───────┬───────┘
                              │       │       │
             ┌────────────────┘       │       └────────────────┐
             ▼                        ▼                        ▼
┌─────────────────────────┐ ┌───────────────────┐ ┌─────────────────────────┐
│ Google Tag Manager(GTM) │ │ Meta Pixel & CAPI │ │  Google Sheets Lead CRM │
│ - dataLayer event       │ │ - fbq 'Lead'      │ │ - Direct Apps Script    │
│ - Deferred / Instant    │ │ - event_id dedup  │ │ - Top row lead insert   │
└─────────────────────────┘ └───────────────────┘ │ - Forward Layout CRM    │
                                                  │ - Auto-Filtered Subtabs │
                                                  │ - Pruned Rep Tabs       │
                                                  └─────────────────────────┘
```

---

## 🚀 Quick Start by Operating System

Run inside your landing page project folder (or pass directory path as an argument):

### 🪟 Windows (PowerShell)
```powershell
# Interactive Terminal Setup
npx @mahe_pkm/buzl-capi

# Local Web GUI Dashboard (port 3333)
npx @mahe_pkm/buzl-capi --gui

# Create Snapshot Backup
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

# Rollback to Previous Snapshot
npx @mahe_pkm/buzl-capi --restore

# Clean Uninstallation of All Tracking
npx @mahe_pkm/buzl-capi --uninstall
```

### 🍎 macOS (Terminal / zsh)
```bash
# Interactive Terminal Setup
npx @mahe_pkm/buzl-capi

# Local Web GUI Dashboard (port 3333)
npx @mahe_pkm/buzl-capi --gui

# Create Snapshot Backup
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

# Rollback to Previous Snapshot
npx @mahe_pkm/buzl-capi --restore

# Clean Uninstallation of All Tracking
npx @mahe_pkm/buzl-capi --uninstall
```

### 🐧 Linux (bash / sh)
```bash
# Interactive Terminal Setup
npx @mahe_pkm/buzl-capi

# Local Web GUI Dashboard (port 3333)
npx @mahe_pkm/buzl-capi --gui

# Create Snapshot Backup
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

# Rollback to Previous Snapshot
npx @mahe_pkm/buzl-capi --restore

# Clean Uninstallation of All Tracking
npx @mahe_pkm/buzl-capi --uninstall
```

---

## 📦 NPM Package Installation, Updating & Version Management

### 1. Always Run Latest via NPX (Bypasses Local Cache)
Because `npx` caches previously downloaded packages locally, always specify `@latest` to ensure you execute the newest release:

```bash
# Always fetch and run the newest release
npx @mahe_pkm/buzl-capi@latest

# Launch Web GUI with latest release
npx @mahe_pkm/buzl-capi@latest --gui
```

### 2. Global CLI Installation & Updating
Install globally to execute `buzl-tracker` or `buzl-capi` anywhere without `npx`:

```bash
# Install globally (or upgrade existing global installation to latest)
npm install -g @mahe_pkm/buzl-capi@latest

# Alternative: update existing global package
npm update -g @mahe_pkm/buzl-capi

# Verify installed version
buzl-tracker --help
```

### 3. Updating as a Local Project Dependency
If installed inside a local project directory:

```bash
# Check if a newer version is available
npm outdated @mahe_pkm/buzl-capi

# Update to latest version in package.json
npm install @mahe_pkm/buzl-capi@latest
```

### 4. Author Publishing & Release Workflow (with 2FA / OTP)
For maintainers publishing updates to npm with Two-Factor Authentication (2FA) active:

```bash
# 1. Bump version
npm version patch

# 2. Push tags and commits to GitHub
git push origin main --tags

# 3. Publish to npm registry with 2FA authenticator OTP code & explicit latest tag
npm publish --tag latest --otp=YOUR_6_DIGIT_OTP
```

> **Note on `--tag latest`:**
> When publishing a patch/minor release where earlier versions (e.g. `1.0.1`) were previously registered on npm, npm blocks lower semver numbers from automatically updating the `latest` pointer. Specifying `--tag latest` is required so `npx @mahe_pkm/buzl-capi` and `npm install` immediately resolve to the new release.

---

## ⚡ CLI Command Reference

| Command / Flag | Alias | Description |
|---|---|---|
| `npx @mahe_pkm/buzl-capi [dir]` | `npx buzl-tracker` | Launches the step-by-step interactive terminal wizard. |
| `npx @mahe_pkm/buzl-capi --gui` | `-g` | Launches local Web GUI dashboard on port 3333. |
| `npx @mahe_pkm/buzl-capi --backup [name]` | `-b` | Creates a point-in-time snapshot backup of all HTML files. |
| `npx @mahe_pkm/buzl-capi --list-backups` | — | Lists all saved snapshot backups on disk. |
| `npx @mahe_pkm/buzl-capi --restore [name]` | `-r`, `--rollback` | Reverts all HTML files to the named snapshot (or latest). |
| `npx @mahe_pkm/buzl-capi --uninstall` | `-u` | Cleanly strips GTM, Meta Pixel, runtime scripts, and form hooks. |
| `npx @mahe_pkm/buzl-capi --handbook` | — | Opens the printable User Handbook in your default browser. |
| `npx @mahe_pkm/buzl-capi --help` | `-h` | Displays the help manual and CLI options. |

---

## 📊 Google Sheets Multi-Tab CRM Engine (`GoogleAppsScript.gs`)

`buzl-tracker` comes with an enterprise-grade Google Apps Script CRM engine that turns any Google Sheet into an automated lead dashboard with **zero monthly subscription fees**:

### 🌟 Key CRM Features:
1. **Forward Operational Layout**:
   `Handled By` (Col F) and `Comments` (Col G) sit directly adjacent to `Lead Stage` (Col E) for rapid qualification:
   ```
   | Name | Location | Phone | Email | Lead Stage | Handled By | Comments | Is Qualified | ...
   ```
2. **Top Row Insertion (Row 2)**:
   Incoming web leads insert directly at **Row 2** (top of sheet) immediately below the header.
3. **Shift-Proof Sub-Tabs**:
   Status tabs (`New`, `Contacted`, `Qualified`, `Converted`, `Spam`, `Test`) use `=FILTER(INDIRECT(...))` formulas that **never break (#REF!)** when new leads push rows down.
4. **Full-Row Highlighting Across Columns A:Z**:
   Rows automatically light up with clean, professional status colors when `Lead Stage` is updated.
5. **Dynamic Team Member Tabs & Auto-Pruning**:
   - Each team member assigned a lead gets an individual tab named after them.
   - Team member tabs are strictly positioned at the very end of the sheet bar.
   - If a team member has 0 leads assigned, their tab is **automatically deleted**.
6. **Full-Column Dropdown Validations (Rows 2 to 1000)**:
   - `Lead Stage`: `['New', 'Contacted', 'Qualified', 'Converted', 'Spam', 'Test']`
   - `Handled By`: Dynamic dropdown populated from `DEFAULT_TEAM_MEMBERS` + active assigned reps.
   - `Is Qualified` & `Is Spam`: `['No', 'Yes']`
7. **Official Buzl Navy Blue Header**:
   Header styled in `#1E4E9E` with bold white text (`#FFFFFF`) at 32px height (> 8.5:1 WCAG contrast).
8. **Global 12-Hour Timestamps**:
   Timestamps formatted as `dd-MMM-yyyy hh:mm a` (dynamic spreadsheet timezone).
9. **`⚡ Buzl Lead CRM` Top Menu**:
   1-click sheet management directly inside Google Sheets:
   - `⚡ Initialize & Upgrade All CRM Tabs`
   - `🔄 Sort All Leads (Newest First)`
   - `🎨 Apply Status Color Coding`
   - `👥 Sync Team Member Tabs`
   - `📋 Apply Dropdowns & Layout to All Sheets`

### Setup in 30 Seconds:
1. Open your Google Sheet.
2. Navigate to **Extensions** > **Apps Script**.
3. Replace all contents with the code from `Buzl_GoogleAppsScript_Template.gs` (or copy from GUI modal).
4. Click **Deploy** > **New deployment** > Type: **Web app** > Execute as: **Me** > Access: **Anyone**.
5. Copy the generated Web App URL and paste it into `buzl-tracker`!

---

## 💾 Unified `.buzl/snapshots/` Storage & Content Hashing

All snapshot backups are stored inside a single hidden `.buzl` directory in your website root:

```
Your_Website/
├── index.html
├── assets/
└── .buzl/                                  <-- Shared with @mahe_pkm/buzl-html-editor
    └── snapshots/
        └── 2026-09-14T10-45-12_a8f3b9c2/   <-- Timestamp + SHA-1 Content Hash
            ├── backup-manifest.json        <-- Full metadata & integrity hash
            └── index.html                  <-- Exact pre-injection copy
```

- **Zero Root Clutter**: Unifies storage under `.buzl` alongside other Buzl ecosystem tools (such as `@mahe_pkm/buzl-html-editor`).
- **Cryptographic Content Hashing**: Computes an 8-character SHA-1 content hash across all HTML files for tamper-proof verification.
- **Safe Across Folder Moves**: Backups travel with the website using relative paths.
- **Backward Compatible**: Automatically detects and restores from legacy `.buzl-backup-*` folders if present.

---

## 🌐 Multi-Page Directory Support

For multi-page websites with nested directories (e.g. `/services/sports-physio.html`, `/about/team/doctor.html`):
- The scanner detects all HTML files regardless of directory nesting depth.
- Injects proper relative script paths (`assets/js/...`, `../assets/js/...`, `../../assets/js/...`) to guarantee that tracking scripts load accurately without 404 errors.

---

## 📱 Universal WhatsApp Auto-Fetch

- Automatically detects WhatsApp numbers from button `href` attributes, click actions, and phone links.
- Populates the site configuration automatically.
- Pre-fills WhatsApp message templates with submitted form data (Name, Service, Location) so inquiries hand off directly to your team's WhatsApp chat.

---

## 💻 Programmatic Node.js SDK

`buzl-tracker` can also be used programmatically in custom Node.js build scripts:

```javascript
const {
  scanProject,
  applyInjection,
  runVerification,
  createBackup,
  restoreBackup,
  removeTracking
} = require('buzl-tracker');

const projectDir = './my-site';

// 1. Scan site and discover forms
const scan = scanProject(projectDir);
console.log(`Found ${scan.files.length} HTML files and ${scan.formArchetypes.length} forms`);

// 2. Inject tracking
const config = {
  gtmId: 'GTM-XXXXXXX',
  pixelId: '123456789012345',
  sheetsUrl: 'https://script.google.com/macros/s/XXXXX/exec',
  zohoFormId: '',
  whatsappNumber: '+919876543210'
};

const result = applyInjection(projectDir, scan.files.map(f => f.filePath), config);
console.log(result.message);

// 3. Verify injection integrity
const testReport = await runVerification(projectDir, scan.files.map(f => f.filePath), config);
console.log('Self-Test Results:', testReport);
```

---

## 🧪 Running Tests

The test suite runs with zero external test runners using Node.js core `node:assert`:
```bash
npm test
```
Runs 37 comprehensive unit & integration tests covering:
- Safe AST HTML injection & tag de-duplication
- Multi-page relative asset resolution
- WhatsApp auto-discovery and button mapping
- Google Apps Script CRM template synchronization and validation formulas

---

## 📄 License

MIT License © 2026 Buzl Digital Solutions. See [LICENSE](LICENSE) for details.
