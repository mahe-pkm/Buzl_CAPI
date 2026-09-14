# Changelog

All notable changes to the **Buzl Tracker & Conversions API (CAPI)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.2] - 2026-09-14

### Changed & Improved
- **100% Dynamic Test Lead Generation**:
  - Removed all hardcoded mock client data (`9585950059`, `Sports Injury Rehabilitation`, `samya-sports-clinic`, `Bengaluru`, `Test Patient`).
  - `tester.js`: `domain` dynamically resolves from `config.domain`, URL hostname, or folder name (`path.basename(rootDir)`).
  - `tester.js`: `phone`, `service`, `location`, and `email` dynamically pull from detected website metadata and actual form fields with clean neutral fallbacks.
  - `scanner.js`: Removed hardcoded `Bengaluru` fallback, dynamically extracts `detectedDomain` and `detectedService`.
  - `app.js` & `index.html`: Web GUI test cards dynamically pre-fill phone, service, and location from live site scan results instead of static mock strings.
  - `bin/cli.js`: CLI version output dynamically loads from `package.json`.
- **Enhanced Test Suite Resilience**:
  - `multipage.test.js`: Added transient in-process HTTP mock server to guarantee 100% offline self-contained test execution.
  - Added Test 13 in `injector.test.js` verifying dynamic test lead dispatch parameters.

---

## [1.0.0] - 2026-09-14

### Initial Release

#### 🚀 Core Features & CLI Architecture
- **Interactive Terminal Wizard**: Guided CLI setup via `npx buzl-tracker` with input validation, intelligent defaults, and instant test verification.
- **Zero-Dependency Web GUI**: Embedded local dashboard on `http://localhost:3333` (`npx buzl-tracker --gui`) for visual configuration, live site state inspection, and per-form test dispatches.
- **Universal Multi-Page Scanner**:
  - Automatically crawls directories at any depth.
  - Automatically resolves relative asset paths (e.g. `assets/js/buzl-tracking.js`, `../assets/js/...`, `../../assets/js/...`) to ensure tracking scripts execute on every page.
  - Groups forms into shared archetypes across multi-page sites.
- **Universal WhatsApp Auto-Fetch**:
  - Discovers site WhatsApp numbers from call-to-action buttons, `wa.me`, and `api.whatsapp.com` links.
  - Generates pre-filled dynamic chat routing so submissions hand off to WhatsApp with lead details intact.
- **AST-Safe Injection Engine**:
  - Injects Google Tag Manager (GTM) `<head>` container and `<body> <noscript>` fallback with deferred loading options.
  - Initializes Meta Pixel & Meta Conversions API (CAPI) client runtime with cross-event `leadId` deduplication.
  - Hooks form submissions via non-destructive JavaScript event interceptors with zero HTML layout breakage.
  - Supports selective service uninstallation (`removeService`) and complete uninstallation (`--uninstall`).
- **Unified `.buzl/snapshots/` Rollback & Backup System**:
  - Unifies backup storage under `.buzl/snapshots/<timestamp>_<hash>` to prevent root-level clutter and align with `@mahe_pkm/buzl-html-editor`.
  - Computes 8-character cryptographic SHA-1 content hashes for tamper-proof verification.
  - Automatically creates snapshots before modifying any file, with instant rollback (`--restore [name]`).
  - Supports named snapshots (`--backup [name]`), inspection (`--list-backups`), and backward compatibility with legacy backups.

#### 📊 Resilient Google Sheets CRM Engine (`GoogleAppsScript.gs`)
- **Forward Operational Layout**:
  - Repositions `Handled By` (Column F) and `Comments` (Column G) directly next to `Lead Stage` (Column E) for rapid operational lead qualification.
- **Official Buzl Navy Blue Header Row**:
  - Styled with official Buzl Navy (`#1E4E9E`), bold white text (`#FFFFFF`), and 32px height (> 8.5:1 WCAG AAA contrast ratio).
- **Universal Fuzzy Column Matcher**:
  - Case-insensitive, symbol-tolerant header detection (`replace(/[^a-z0-9]/g, '')`) ensures zero data loss during schema upgrades across legacy sheets.
- **Full-Row Conditional Formatting**:
  - Anchors stage status rules across columns `A2:Z` (`=$E2="Stage"`) so entire rows illuminate according to stage color.
- **Global 12-Hour Timestamps & Dates**:
  - Dynamically detects spreadsheet timezone and formats event timestamps as `dd-MMM-yyyy hh:mm a` and qualification dates as `dd-MMM-yyyy`.
- **Top Row Insertion (Row 2)**:
  - New leads automatically insert at Row 2 (top of sheet) immediately below the header.
- **Shift-Proof Sub-Tab Formulas**:
  - Sub-tabs use `INDIRECT()` filter formulas to query master data without formula displacement when rows insert at top.
- **Dynamic Team Member Tabs**:
  - Team member tabs named cleanly (strips legacy `"Rep -"` prefix).
  - Strictly moves all team member tabs to the very end of the sheet bar (`moveActiveSheet(ss.getNumSheets())`).
  - Auto-prunes and deletes empty team tabs when a rep has 0 leads.
- **Full-Column Dropdown Validations**:
  - Applies dropdown validations across entire column ranges (Rows 2 to 1000) for `Lead Stage`, `Is Qualified`, and `Is Spam` across Master and all Sub-Tabs.
  - Dynamic `Handled By` dropdown list in Master Sheet combining `DEFAULT_TEAM_MEMBERS` with existing assigned team members.
- **Professional Column Widths**:
  - Auto-configures optimal readable column widths for Name, Phone, Email, Service, Comments, and Event Time.
- **⚡ Buzl Lead CRM Menu**:
  - 1-click sheet management: Initialize/Upgrade CRM tabs, Sort newest-first, Color-code, Sync team tabs, and Apply dropdowns.

#### 🧪 Testing & Reliability
- 100% test coverage with 37 automated unit and integration tests across:
  - Core injection & rollback (`tests/injector.test.js`)
  - Multi-page relative asset handling (`tests/multipage.test.js`)
  - WhatsApp dynamic discovery (`tests/whatsapp-autofetch.test.js`)
  - Google Apps Script template integrity (`tests/gas-template.test.js`)
