# Distribution & Updates Guide

How to package, host, and auto-update the Compliance Ready AI desktop app.

## Building Installers

```bash
cd frontend

# macOS (universal DMG)
npm run package:mac

# Windows (NSIS installer)
npm run package:win

# Linux (AppImage + .deb)
npm run package:linux
```

Output goes to `frontend/dist-electron/`:

| Platform | File | Example |
|----------|------|---------|
| macOS | `.dmg` | `Compliance Ready AI-1.0.0-universal.dmg` |
| Windows | `.exe` | `Compliance Ready AI Setup 1.0.0.exe` |
| Linux | `.AppImage` / `.deb` | `Compliance-Ready-AI-1.0.0.AppImage` |

**Note:** Building `.exe` on macOS requires Wine or a Windows CI runner. Build each platform on its native OS or use GitHub Actions.

## Hosting for Initial Download

Host the packaged files as static downloads on your website. Any static file host works:
- S3 bucket, Vercel, Nginx, a simple download link, etc.
- Users download the installer, run it, and the app is installed

## Auto-Updates (After Install)

The app is already configured to check for updates on launch via `electron-updater`. Current config in `electron-builder.yml`:

```yaml
publish:
  provider: github
  owner: nomubuilders
  repo: enterprise-software
```

### How It Works

1. User installs v1.0.0 from **your website**
2. You publish v1.1.0 as a **GitHub Release**
3. On next launch, the app detects the update and shows a notification
4. User approves the download (no automatic downloads — enterprise-friendly)
5. After download, user chooses when to restart and install

### Publishing an Update

```bash
# 1. Bump version
cd frontend
npm version 1.1.0

# 2. Build & package
npm run package:mac
npm run package:win
npm run package:linux

# 3. Create GitHub Release with artifacts
cd ..
gh release create v1.1.0 \
  frontend/dist-electron/*.dmg \
  frontend/dist-electron/*.exe \
  frontend/dist-electron/*.AppImage \
  --title "v1.1.0" \
  --notes "What changed in this release"
```

electron-builder automatically generates `latest-mac.yml` / `latest.yml` (Windows) / `latest-linux.yml` in `dist-electron/`. These must be included in the GitHub Release — `gh release create` with the glob pattern picks them up.

### What Gets Uploaded to GitHub Releases

```
dist-electron/
├── Compliance Ready AI-1.1.0-universal.dmg
├── Compliance Ready AI-1.1.0-universal.dmg.blockmap
├── latest-mac.yml                              # <-- updater reads this
├── Compliance Ready AI Setup 1.1.0.exe
├── Compliance Ready AI Setup 1.1.0.exe.blockmap
├── latest.yml                                  # <-- updater reads this
├── Compliance-Ready-AI-1.1.0.AppImage
└── latest-linux.yml                            # <-- updater reads this
```

## Alternative: Self-Hosted Updates

If you don't want updates served from GitHub, switch to a generic static server.

### 1. Update `electron-builder.yml`

```yaml
publish:
  provider: generic
  url: https://your-site.com/releases/
```

### 2. Upload Files

After packaging, upload the contents of `dist-electron/` to `https://your-site.com/releases/`. The updater checks for the `latest-mac.yml` / `latest.yml` files at that URL.

### 3. Directory Structure on Your Server

```
https://your-site.com/releases/
├── latest-mac.yml
├── latest.yml
├── latest-linux.yml
├── Compliance Ready AI-1.1.0-universal.dmg
├── Compliance Ready AI Setup 1.1.0.exe
└── Compliance-Ready-AI-1.1.0.AppImage
```

## Summary

| Concern | Where | Config |
|---------|-------|--------|
| First install | Your website (static download) | N/A |
| Auto-updates | GitHub Releases (default) | `electron-builder.yml` → `publish.provider: github` |
| Self-hosted updates | Your own server | `electron-builder.yml` → `publish.provider: generic` |
| Update approval | Manual (user sees notification) | `auto-updater.ts` → `autoDownload: false` |
