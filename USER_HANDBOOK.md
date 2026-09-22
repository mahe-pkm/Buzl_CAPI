# 📖 Buzl Tracker & Conversions API (CAPI) — User Handbook & Cross-Platform Command Reference

Welcome to the official **Buzl Tracker & Conversions API (`@mahe_pkm/buzl-capi`) User Handbook**. This document provides an exhaustive, copy-ready guide for deploying, managing, testing, and rolling back conversion tracking across landing pages and websites.

Every command in this handbook is provided in **isolated, blocked command snippets** tailored specifically for:
- 🪟 **Windows (PowerShell)**
- 🪟 **Windows (Command Prompt / CMD)**
- 🍎 **macOS (Terminal / zsh / bash)**
- 🐧 **Linux (bash / sh)**

---

## 📑 Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
   - [Windows Setup](#windows-setup)
   - [macOS Setup](#macos-setup)
   - [Linux Setup](#linux-setup)
3. [NPM Package Installation, Updating & Version Management](#3-npm-package-installation-updating--version-management)
   - [Zero-Install Execution via npx](#31-zero-install-execution-via-npx-recommended)
   - [Global CLI Installation & Updating](#32-global-cli-installation--updating)
   - [Updating as Local Project Dependency](#33-updating-as-a-local-project-dependency)
   - [Author Publishing & Release Workflow (with 2FA / OTP)](#34-author-publishing--release-workflow-with-2fa--otp)
4. [CLI Reference Matrix & Syntax Standards](#4-cli-reference-matrix--syntax-standards)
5. [OS-Specific Command Execution Handbook](#5-os-specific-command-execution-handbook)
   - [Command 1: Interactive Terminal Setup Wizard](#command-1-interactive-terminal-setup-wizard)
   - [Command 2: Local Web GUI Server (Port 3333)](#command-2-local-web-gui-server-port-3333)
   - [Command 3: Create Point-in-Time Snapshot Backup](#command-3-create-point-in-time-snapshot-backup)
   - [Command 4: List Saved Snapshots on Disk](#command-4-list-saved-snapshots-on-disk)
   - [Command 5: Restore / Rollback to Snapshot](#command-5-restore--rollback-to-snapshot)
   - [Command 6: Clean Tracking Uninstallation](#command-6-clean-tracking-uninstallation)
   - [Command 7: Open User Handbook in Browser](#command-7-open-user-handbook-in-browser)
   - [Command 8: Display CLI Help Manual](#command-8-display-cli-help-manual)
6. [Daemon & Background Service Execution](#6-daemon--background-service-execution)
   - [Running as Background Daemon on Windows](#running-as-background-daemon-on-windows)
   - [Running as Background Daemon on macOS](#running-as-background-daemon-on-macos)
   - [Running as Background Daemon on Linux](#running-as-background-daemon-on-linux)
7. [Web GUI Dashboard & Automated Verification Reports](#7-web-gui-dashboard--automated-verification-reports)
   - [Live State Inspection & Matrix](#live-state-inspection--matrix)
   - [Single-Form Independent Testing](#single-form-independent-testing)
   - [CAPI Telemetry Inspector & Structured Console Log](#capi-telemetry-inspector--structured-console-log)
   - [Exporting Automated Verification Reports (PDF & JSON)](#exporting-automated-verification-reports-pdf--json)
8. [Google Sheets CRM Engine Deployment Guide](#8-google-sheets-crm-engine-deployment-guide)
9. [Cross-Platform Troubleshooting & Diagnostics](#9-cross-platform-troubleshooting--diagnostics)

---

## 1. Architectural Overview

`@mahe_pkm/buzl-capi` is a zero-external-dependency Node.js suite designed to eliminate manual tracking tag insertion and brittle third-party connectors.

```
┌─────────────────────────────────────────────────────────────┐
│                    WEBSITE VISITOR ACTION                   │
│         HTML Form Submit  •  WhatsApp Click  •  Call CTA    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             buzl-tracking.js (Client Runtime)               │
│  - Intercepts form submissions without page reload          │
│  - Captures UTM parameters (source, medium, campaign)       │
│  - Captures Ad Click IDs (gclid, fbclid, _fbc, _fbp)        │
│  - Generates cross-channel deduplicated UUID leadId         │
└──────┬───────────────────────┬───────────────────────┬──────┘
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  Google Tag  │       │  Meta Pixel  │       │ Google Sheet │
│   Manager    │       │    & CAPI    │       │    CRM Sync  │
│  dataLayer   │       │  fbq 'Lead'  │       │  Apps Script │
│  Push Event  │       │ Server Event │       │  Top Row (2) │
└──────────────┘       └──────────────┘       └──────────────┘
```

### Key Principles
- **AST-Safe Injection**: Injects GTM, Meta Pixel, and runtime scripts into HTML `<head>` and `<body>` without re-formatting or breaking existing code.
- **Unified `.buzl/snapshots/` Storage**: Automatically takes SHA-1 content-hashed backups before modifying any files, enabling instant, guaranteed rollbacks.
- **Zero Third-Party Dependencies**: The entire CLI and GUI run on native Node.js core libraries (`http`, `fs`, `path`, `crypto`, `node:assert`).

---

## 2. Prerequisites & Environment Setup

`@mahe_pkm/buzl-capi` requires **Node.js v16.0.0 or higher** (v18, v20, v22, and v24 LTS recommended).

### Windows Setup

#### 1. Verify or Install Node.js via Windows Terminal / PowerShell:
```powershell
node -v
npm -v
```

If Node.js is not installed:
```powershell
winget install OpenJS.NodeJS.LTS
```

#### 2. Set PowerShell Execution Policy (if script execution is restricted):
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

### macOS Setup

#### 1. Verify or Install Node.js via Terminal (zsh):
```bash
node -v
npm -v
```

If Node.js is not installed:
```bash
brew install node
```
*(Or install via `nvm install --lts`)*

---

### Linux Setup (Ubuntu / Debian / CentOS / Arch)

#### 1. Verify or Install Node.js:
```bash
node -v
npm -v
```

If Node.js is not installed (Ubuntu / Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Arch Linux:
```bash
sudo pacman -S nodejs npm
```

---

## 3. NPM Package Installation, Updating & Version Management

This section covers how to install, update, and manage `@mahe_pkm/buzl-capi` across all operating systems, as well as the release publishing workflow for package maintainers.

### 3.1. Zero-Install Execution via `npx` (Recommended)

`npx` downloads and executes the package without adding global files. However, `npx` aggressively caches packages. If a new version was recently published, `npx` might run an older cached version unless you append `@latest`.

#### 🪟 Windows (PowerShell & CMD)
```powershell
# Always run latest version (bypassing npx cache)
npx @mahe_pkm/buzl-capi@latest

# Launch GUI directly with latest version
npx @mahe_pkm/buzl-capi@latest --gui

# Target specific folder
npx @mahe_pkm/buzl-capi@latest "C:\Projects\MyLandingPage" --gui
```

#### 🍎 macOS (Terminal / zsh) & 🐧 Linux (bash)
```bash
# Always run latest version (bypassing npx cache)
npx @mahe_pkm/buzl-capi@latest

# Launch GUI directly with latest version
npx @mahe_pkm/buzl-capi@latest --gui

# Target specific folder
npx @mahe_pkm/buzl-capi@latest ~/Projects/MyLandingPage --gui
```

---

### 3.2. Global CLI Installation & Updating

Installing globally gives you direct access to the `buzl-tracker` and `buzl-capi` commands in any terminal.

#### 🪟 Windows (PowerShell / CMD Run as Administrator if required)
```powershell
# Install globally
npm install -g @mahe_pkm/buzl-capi@latest

# Update existing global installation
npm update -g @mahe_pkm/buzl-capi

# Verify installed version
buzl-tracker --help
buzl-capi --help
```

#### 🍎 macOS (Terminal / zsh) & 🐧 Linux (bash)
```bash
# Install globally
npm install -g @mahe_pkm/buzl-capi@latest

# Update existing global installation
npm update -g @mahe_pkm/buzl-capi

# If permission error occurs (EACCES), configure npm prefix without sudo:
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
export PATH=$PATH:~/.npm-global/bin

# Verify installed version
buzl-tracker --help
```

---

### 3.3. Updating as a Local Project Dependency

If you installed the package inside your web project's `package.json`:

```bash
# Check if a newer version is available
npm outdated @mahe_pkm/buzl-capi

# Update to latest version and record in package.json
npm install @mahe_pkm/buzl-capi@latest

# Or update all dependencies within semantic range
npm update @mahe_pkm/buzl-capi
```

---

### 3.4. Author Publishing & Release Workflow (with 2FA / OTP)

For maintainers publishing updates to the npm registry:

#### Step 1: Bump Version
```bash
# Patch update (e.g. 0.1.3 -> 0.1.4)
npm version patch

# Minor update (e.g. 0.1.4 -> 0.2.0)
npm version minor

# Major update (e.g. 0.2.0 -> 1.0.0)
npm version major
```

#### Step 2: Push Commits & Git Tags
```bash
git push origin main --tags
```

#### Step 3: Publish to NPM Registry
If your npm account has Two-Factor Authentication (2FA) enabled, npm will return `npm error code EOTP`. Supply your 6-digit authenticator code via `--otp`:

#### 🪟 Windows (PowerShell)
```powershell
# Publish with 2FA code and explicit latest tag
npm publish --tag latest --otp=123456
```

#### 🍎 macOS / 🐧 Linux
```bash
# Publish with 2FA code and explicit latest tag
npm publish --tag latest --otp=123456
```

> [!IMPORTANT]
> **Why `--tag latest` is required:**
> When publishing a package where earlier versions (e.g. `1.0.1`) were previously registered, npm will block `0.1.x` from implicitly claiming the `latest` pointer. Specifying `--tag latest` ensures that `npx @mahe_pkm/buzl-capi` and `npm install` immediately resolve to your new release.

---

## 4. CLI Reference Matrix & Syntax Standards

| Command / Flag | Short Flag | Positional Argument | Description |
| :--- | :--- | :--- | :--- |
| `npx @mahe_pkm/buzl-capi` | — | `[dir]` | Launches the interactive terminal wizard. |
| `--gui` | `-g` | `[dir]` | Launches the local Web GUI dashboard on port 3333. |
| `--backup [name]` | `-b` | `[dir]` | Creates a timestamped SHA-1 snapshot backup. |
| `--list-backups` | — | `[dir]` | Displays all saved point-in-time snapshots for the site. |
| `--restore [name]` | `-r`, `--rollback` | `[dir]` | Restores files to a named snapshot (or latest). |
| `--uninstall` | `-u` | `[dir]` | Cleanly removes all injected tracking code from site. |
| `--handbook` | — | — | Opens the printable User Handbook in default browser. |
| `--version` | `-v` | — | Displays the current version and last update release timestamp. |
| `--help` | `-h` | — | Displays the command-line usage manual. |

> [!TIP]
> Both package names are binary-aliased: you can run `npx @mahe_pkm/buzl-capi` or `npx buzl-tracker` interchangeably.

---

## 5. OS-Specific Command Execution Handbook

---

### Command 1: Interactive Terminal Setup Wizard

Walks step-by-step through GTM, Meta Pixel/CAPI, Google Sheets Webhook, and WhatsApp configuration directly in the terminal with input validation and instant automated verification.

#### 🪟 Windows (PowerShell)
```powershell
# Run in current folder
npx @mahe_pkm/buzl-capi

# Run against a specific directory
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage"
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
rem Run in current folder
npx @mahe_pkm/buzl-capi

rem Run against a specific directory
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage"
```

#### 🍎 macOS (Terminal / zsh)
```bash
# Run in current folder
npx @mahe_pkm/buzl-capi

# Run against a specific directory
npx @mahe_pkm/buzl-capi ~/Projects/MyLandingPage
```

#### 🐧 Linux (bash / sh)
```bash
# Run in current folder
npx @mahe_pkm/buzl-capi

# Run against a specific directory
npx @mahe_pkm/buzl-capi /var/www/html/my-landing-page
```

---

### Command 2: Local Web GUI Server (Port 3333)

Launches the zero-dependency browser dashboard on `http://localhost:3333` with live site scanning, visual service toggles, form testing, and report exports.

#### 🪟 Windows (PowerShell)
```powershell
# Launch GUI for current folder
npx @mahe_pkm/buzl-capi --gui

# Launch GUI for a specific folder
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --gui
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
rem Launch GUI for current folder
npx @mahe_pkm/buzl-capi --gui

rem Launch GUI for a specific folder
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --gui
```

#### 🍎 macOS (Terminal / zsh)
```bash
# Launch GUI for current folder
npx @mahe_pkm/buzl-capi --gui

# Launch GUI for a specific folder
npx @mahe_pkm/buzl-capi ~/Projects/MyLandingPage --gui
```

#### 🐧 Linux (bash / sh)
```bash
# Launch GUI for current folder
npx @mahe_pkm/buzl-capi --gui

# Launch GUI for a specific folder
npx @mahe_pkm/buzl-capi /var/www/html/my-landing-page --gui
```

---

### Command 3: Create Point-in-Time Snapshot Backup

Creates an immutable snapshot backup inside `.buzl/snapshots/<timestamp>_<hash>/` before any file modifications.

#### 🪟 Windows (PowerShell)
```powershell
# Create an automated snapshot
npx @mahe_pkm/buzl-capi --backup

# Create a named snapshot
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

# Create a named snapshot for a specific path
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --backup "Client Approval v1"
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
rem Create an automated snapshot
npx @mahe_pkm/buzl-capi --backup

rem Create a named snapshot
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

rem Create a named snapshot for a specific path
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --backup "Client Approval v1"
```

#### 🍎 macOS (Terminal / zsh)
```bash
# Create an automated snapshot
npx @mahe_pkm/buzl-capi --backup

# Create a named snapshot
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

# Create a named snapshot for a specific path
npx @mahe_pkm/buzl-capi ~/Projects/MyLandingPage --backup "Client Approval v1"
```

#### 🐧 Linux (bash / sh)
```bash
# Create an automated snapshot
npx @mahe_pkm/buzl-capi --backup

# Create a named snapshot
npx @mahe_pkm/buzl-capi --backup "Pre-Launch Baseline"

# Create a named snapshot for a specific path
npx @mahe_pkm/buzl-capi /var/www/html/my-landing-page --backup "Client Approval v1"
```

---

### Command 4: List Saved Snapshots on Disk

Lists all point-in-time snapshots stored in `.buzl/snapshots/` with timestamps, cryptographic SHA-1 hashes, and file counts.

#### 🪟 Windows (PowerShell)
```powershell
# List snapshots in current folder
npx @mahe_pkm/buzl-capi --list-backups

# List snapshots for a target folder
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --list-backups
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
rem List snapshots in current folder
npx @mahe_pkm/buzl-capi --list-backups

rem List snapshots for a target folder
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --list-backups
```

#### 🍎 macOS (Terminal / zsh)
```bash
# List snapshots in current folder
npx @mahe_pkm/buzl-capi --list-backups

# List snapshots for a target folder
npx @mahe_pkm/buzl-capi ~/Projects/MyLandingPage --list-backups
```

#### 🐧 Linux (bash / sh)
```bash
# List snapshots in current folder
npx @mahe_pkm/buzl-capi --list-backups

# List snapshots for a target folder
npx @mahe_pkm/buzl-capi /var/www/html/my-landing-page --list-backups
```

---

### Command 5: Restore / Rollback to Snapshot

Reverts all HTML files in the project to an earlier snapshot state. If no name is provided, rolls back to the most recent snapshot (`latest`).

#### 🪟 Windows (PowerShell)
```powershell
# Restore latest snapshot
npx @mahe_pkm/buzl-capi --restore

# Restore a specific named snapshot
npx @mahe_pkm/buzl-capi --restore "Pre-Launch Baseline"

# Restore target directory to named snapshot
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --restore "Pre-Launch Baseline"
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
rem Restore latest snapshot
npx @mahe_pkm/buzl-capi --restore

rem Restore a specific named snapshot
npx @mahe_pkm/buzl-capi --restore "Pre-Launch Baseline"

rem Restore target directory to named snapshot
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --restore "Pre-Launch Baseline"
```

#### 🍎 macOS (Terminal / zsh)
```bash
# Restore latest snapshot
npx @mahe_pkm/buzl-capi --restore

# Restore a specific named snapshot
npx @mahe_pkm/buzl-capi --restore "Pre-Launch Baseline"

# Restore target directory to named snapshot
npx @mahe_pkm/buzl-capi ~/Projects/MyLandingPage --restore "Pre-Launch Baseline"
```

#### 🐧 Linux (bash / sh)
```bash
# Restore latest snapshot
npx @mahe_pkm/buzl-capi --restore

# Restore a specific named snapshot
npx @mahe_pkm/buzl-capi --restore "Pre-Launch Baseline"

# Restore target directory to named snapshot
npx @mahe_pkm/buzl-capi /var/www/html/my-landing-page --restore "Pre-Launch Baseline"
```

---

### Command 6: Clean Tracking Uninstallation

Completely and cleanly strips all injected GTM snippets, Meta Pixel scripts, noscript tags, runtime tracker links (`buzl-tracking.js`), and `data-buzl-track` form attributes from all HTML files.

#### 🪟 Windows (PowerShell)
```powershell
# Uninstall from current site
npx @mahe_pkm/buzl-capi --uninstall

# Uninstall from target site
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --uninstall
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
rem Uninstall from current site
npx @mahe_pkm/buzl-capi --uninstall

rem Uninstall from target site
npx @mahe_pkm/buzl-capi "C:\Projects\MyLandingPage" --uninstall
```

#### 🍎 macOS (Terminal / zsh)
```bash
# Uninstall from current site
npx @mahe_pkm/buzl-capi --uninstall

# Uninstall from target site
npx @mahe_pkm/buzl-capi ~/Projects/MyLandingPage --uninstall
```

#### 🐧 Linux (bash / sh)
```bash
# Uninstall from current site
npx @mahe_pkm/buzl-capi --uninstall

# Uninstall from target site
npx @mahe_pkm/buzl-capi /var/www/html/my-landing-page --uninstall
```

---

### Command 7: Open User Handbook in Browser

Opens the standalone printable HTML handbook in your default web browser for viewing or saving as PDF.

#### 🪟 Windows (PowerShell)
```powershell
npx @mahe_pkm/buzl-capi --handbook
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
npx @mahe_pkm/buzl-capi --handbook
```

#### 🍎 macOS (Terminal / zsh)
```bash
npx @mahe_pkm/buzl-capi --handbook
```

#### 🐧 Linux (bash / sh)
```bash
npx @mahe_pkm/buzl-capi --handbook
```

---

### Command 8: Display CLI Help Manual

Displays the command-line arguments, options, and usage synopsis.

#### 🪟 Windows (PowerShell)
```powershell
npx @mahe_pkm/buzl-capi --help
```

#### 🪟 Windows (Command Prompt / CMD)
```cmd
npx @mahe_pkm/buzl-capi --help
```

#### 🍎 macOS (Terminal / zsh)
```bash
npx @mahe_pkm/buzl-capi --help
```

#### 🐧 Linux (bash / sh)
```bash
npx @mahe_pkm/buzl-capi --help
```

---

## 6. Daemon & Background Service Execution

When running `@mahe_pkm/buzl-capi --gui` as a persistent background daemon for local development teams or staging servers:

### Running as Background Daemon on Windows

#### PowerShell:
```powershell
# Start GUI in background (hidden window)
Start-Process -FilePath "npx" -ArgumentList "@mahe_pkm/buzl-capi --gui" -WindowStyle Hidden

# Check if running on port 3333
Get-NetTCPConnection -LocalPort 3333 -ErrorAction SilentlyContinue

# Stop background GUI
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3333).OwningProcess -Force
```

---

### Running as Background Daemon on macOS

#### Terminal (zsh):
```bash
# Start in background with logging
nohup npx @mahe_pkm/buzl-capi --gui > ~/.buzl-gui.log 2>&1 &

# Inspect live logs
tail -f ~/.buzl-gui.log

# Stop background GUI
kill $(lsof -t -i:3333)
```

---

### Running as Background Daemon on Linux

#### Terminal (bash / nohup):
```bash
# Start in background with logging
nohup npx @mahe_pkm/buzl-capi /var/www/html --gui > /var/log/buzl-gui.log 2>&1 &

# Check running process on port 3333
sudo ss -tulpn | grep :3333

# Stop background GUI
sudo kill $(lsof -t -i:3333)
```

#### Systemd Service Unit (Optional Production Setup):
Save to `/etc/systemd/system/buzl-tracker.service`:
```ini
[Unit]
Description=Buzl Tracker & CAPI GUI Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/html
ExecStart=/usr/bin/npx @mahe_pkm/buzl-capi --gui
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
Activate service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable buzl-tracker
sudo systemctl start buzl-tracker
```

---

## 7. Web GUI Dashboard & Automated Verification Reports

The Web GUI (`http://localhost:3333`) provides complete visual management styled under the **Locations Design System**:

### Live State Inspection & Matrix
- **Target Workspace Path**: Displays the active inspected directory.
- **Active Service Matrix**: Visual pills showing whether GTM, Meta Pixel, Buzl CAPI, Google Sheets, or Zoho are configured or active.
- **Individual Service Removal**: Direct **"Remove"** buttons on each active service card to selectively strip trackers (e.g. remove GTM while preserving Meta Pixel).

### Single-Form Independent Testing
- Discovered forms are listed by archetype and selector (`#contactForm`, `.lead-form`).
- Click **"Test Form"** on any discovered form to dispatch a live payload directly through active channels with immediate status feedback.

### CAPI Telemetry Inspector & Structured Console Log
When running verification or dispatching test leads, the GUI streams the live CAPI audit log formatted to match the staging console layout:

```
============================================================
       BUZL CAPI LIVE DISPATCH & SUBMISSION AUDIT
============================================================
Timestamp: 2026-09-14T13:13:45.146Z
[Executing Staging Lead Submissions]

- Staging URL:       http://localhost:3333/
- CAPI Target:       https://web.gobuzl.com/api/v1/capi/events
- Domain Label:      my-landing-page
- Generated LeadId:  my-landing-page-f0-1789391625146
- Contact Data:      {"name":"Test Lead","phone":"919876543210","location":""}
- Response Status:   201 Created
- DB Record Created: my-landing-page-f0-1789391625146
- Telemetry Latency: 182ms
- Verification Ack:  ACK_OK (Acknowledged)

------------------------------------------------------------
 CAPI VERIFICATION RESULT: 100% SUCCESS (201 CREATED)
============================================================
```

### Exporting Automated Verification Reports (PDF & JSON)

1. **JSON Export (`#btnExportJson`)**:
   - Saves `buzl-verification-report-[timestamp].json` containing:
     - Compliance summary & pass rate.
     - Active project configuration state.
     - Complete list of automated check results.
     - Full CAPI telemetry payload, response, and `formattedAuditLog`.
2. **Printable PDF Export (`#btnExportPdf`)**:
   - Formats a clean A4 letterhead audit report.
   - Triggers native browser print via an isolated, hidden iframe.
   - Text is 100% selectable and copyable vector text.

---

## 8. Google Sheets CRM Engine Deployment Guide

`buzl-tracker` includes an enterprise-ready Google Apps Script CRM template (`Buzl_GoogleAppsScript_Template.gs`) with **zero monthly subscription fees**:

### 30-Second Setup:
1. Open your Google Sheet.
2. Click **Extensions** > **Apps Script**.
3. Clear existing code and paste the contents of `Buzl_GoogleAppsScript_Template.gs` (or copy from the GUI Google Sheets card).
4. Click **Deploy** > **New deployment**.
5. Select type **Web app**.
6. Set **Execute as**: `Me` and **Who has access**: `Anyone`.
7. Click **Deploy**, authorize permissions, and copy the generated Web App URL.
8. Paste the URL into the **Google Sheets Webhook URL** field in `buzl-tracker`.

### Architectural Highlights:
- **Top Row Insertion (Row 2)**: New leads insert directly at Row 2 immediately under the header.
- **Forward Layout**: `Handled By` (Col F) and `Comments` (Col G) sit next to `Lead Stage` (Col E) for rapid qualification.
- **Shift-Proof Filter Formulas**: Subtabs (`New`, `Contacted`, `Qualified`, `Converted`, `Spam`, `Test`) use `=FILTER(INDIRECT(...))` so formulas never break when rows insert at top.
- **Auto-Pruned Rep Tabs**: Generates individual tabs for each team member assigned a lead, and auto-deletes them when lead count reaches 0.

---

## 9. Cross-Platform Troubleshooting & Diagnostics

### Issue 1: Port 3333 is Already in Use

#### 🪟 Windows (PowerShell):
```powershell
# Identify process using port 3333
Get-NetTCPConnection -LocalPort 3333 | Select-Object OwningProcess

# Terminate process
Stop-Process -Id <PID> -Force
```

#### 🍎 macOS (Terminal):
```bash
# Identify and kill process on port 3333
sudo lsof -i :3333
kill -9 $(lsof -t -i:3333)
```

#### 🐧 Linux (bash):
```bash
# Identify and kill process on port 3333
sudo fuser -k 3333/tcp
```

---

### Issue 2: EACCES Permission Denied on Linux / macOS

If running global binaries or executing CLI scripts fails with `EACCES`:

#### macOS / Linux:
```bash
# Make binary executable
chmod +x bin/cli.js

# If installing globally with npm without sudo:
npm config set prefix ~/.npm-global
export PATH=$PATH:~/.npm-global/bin
```

---

### Issue 3: PowerShell Script Execution Restricted (Windows)

If PowerShell displays `File ... cannot be loaded because running scripts is disabled on this system`:

#### Windows (PowerShell Run as Administrator or CurrentUser):
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

---

### Issue 4: Windows Path with Spaces

Always wrap paths with spaces in quotation marks:

```powershell
npx @mahe_pkm/buzl-capi "C:\Users\John Doe\Desktop\My Website" --gui
```

---

## 📄 License & Attribution

MIT License © 2026 Buzl Digital Solutions. Developed for high-performance lead generation teams and digital marketing operators.
