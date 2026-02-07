# CLAUDE.md

> Think carefully and implement the most concise solution that changes as little code as possible.

## Project Overview

**Compliance Ready AI** - A desktop application and visual workflow builder for AI compliance pipelines. Built for enterprise clients who need to process sensitive data on-premises using local AI models. Packaged as an Electron desktop app with a FastAPI backend and Docker-managed services.

- **Company**: Nomu - AI implementation consulting for privacy-sensitive organizations
- **Tagline**: "We Make Data Speak."
- **Product**: Drag-and-drop workflow builder with compliance nodes (PII filtering, local LLM, database connectors)

## Architecture

```
compliance-flow/
├── frontend/          # Electron + React app
│   ├── electron/      # Electron main/preload processes
│   │   ├── main/      # Main process (window, Docker, IPC, auto-updater)
│   │   ├── preload/   # Context bridge (electronAPI)
│   │   └── resources/ # Icons, docker-compose.prod.yml, entitlements
│   ├── src/           # React renderer (components, store, services)
│   └── out/           # Build output (main, preload, renderer)
├── backend/           # FastAPI Python backend
│   └── app/           # API routes, services, models
├── config/            # App config (approved-images.json)
└── docker-compose.yml # Dev services (backend, postgres, redis, mongo, ollama)
```

## Tech Stack

### Frontend (Electron + React)
- **Desktop**: Electron 40 + electron-vite 5 + electron-builder 26
- **Framework**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS 4.1 (utility-first, no CSS modules)
- **State**: Zustand 5
- **Canvas**: @xyflow/react 12 (React Flow)
- **Icons**: lucide-react
- **Auto-update**: electron-updater (GitHub releases)
- **PWA**: vite-plugin-pwa (for browser fallback)

### Backend (FastAPI)
- **Framework**: FastAPI + Uvicorn
- **LLM**: Ollama (local inference)
- **Databases**: PostgreSQL (asyncpg), MySQL (aiomysql), MongoDB (motor), Redis
- **PII Detection**: Presidio (analyzer + anonymizer) + spaCy
- **Documents**: PyPDF2, python-docx
- **Containers**: Docker SDK

### Infrastructure (Docker Compose)
- PostgreSQL 16, Redis 7, MongoDB 7, Ollama (with GPU support)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (browser only, no Electron) |
| `npm run dev:electron` | Electron dev mode with hot reload |
| `npm run build` | Build React for production (browser) |
| `npm run build:electron` | Build Electron app |
| `npm run package:mac` | Package macOS DMG (universal) |
| `npm run package:win` | Package Windows NSIS installer |
| `npm run package:linux` | Package Linux AppImage + deb |

All scripts run from `frontend/`.

## Nomu Brand Guidelines

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Brand Purple | `#4004DA` | Primary brand color, buttons, focus rings, AI elements |
| Brand Orange | `#FF6C1D` | Accent, CTAs, highlights, trigger nodes |
| Black | `#000000` | Dark theme background |
| Dark Gray | `#36312E` | Dark theme surfaces/cards |
| Off-White | `#FEFCFD` | Light theme background, dark theme text |
| Gray | `#4D4D4D` | Secondary text, muted elements |

### Typography
- **Headings/Titles**: Barlow (Google Fonts)
- **Subtitles**: Work Sans Bold
- **Body Text**: Work Sans Regular

## Project-Specific Instructions

- Use Tailwind utility classes for all styling (no inline styles, no CSS modules)
- Use Zustand for any new state management needs
- All components are in `frontend/src/components/` organized by type (nodes, panels, modals, common, sidebar, canvas, electron)
- Reusable UI components (Button, Input, Modal, Select) are in `frontend/src/components/common/`
- Electron components (SetupWizard, ServiceDashboard, UpdateNotification, TutorialOverlay) are in `frontend/src/components/electron/`
- Follow the existing pattern of TypeScript interfaces in `frontend/src/types/`
- Keep node types visually distinct from each other
- Electron main process code lives in `frontend/electron/main/`
- IPC communication uses `contextBridge.exposeInMainWorld('electronAPI', ...)` pattern

## Electron Architecture

### Main Process (`electron/main/`)
- `index.ts` - App entry: window creation, IPC registration, Docker lifecycle
- `window-manager.ts` - BrowserWindow setup (1400x900, preload, context isolation)
- `docker-manager.ts` - Docker Compose orchestration (start/stop/health/logs)
- `ipc-handlers.ts` - IPC bridge between renderer and main process
- `auto-updater.ts` - GitHub release auto-updater (manual download approval)

### Preload (`electron/preload/`)
- Exposes `window.electronAPI` with namespaces: `docker`, `app`, `updater`
- Type-safe bridge with `contextIsolation: true`, `nodeIntegration: false`

### Packaging
- `electron-builder.yml` configures macOS (DMG universal), Windows (NSIS x64), Linux (AppImage + deb)
- App ID: `com.nomu.complianceflow`
- Auto-update publishes to GitHub releases (`nomubuilders/enterprise-software`)
- Docker compose file bundled as `extraResources` for production

## Key Features

### Floating Draggable Windows
- **Chat Interface** (`ChatInterfacePanel.tsx`) - Floating, resizable, minimizable chat window for data queries
- **AI Assistant** (`AIAssistantPanel.tsx`) - Floating, resizable, minimizable AI helper for workflow building
- Both support 8-directional resizing (N, S, E, W, NE, NW, SE, SW)
- Minimum size: 320x400px

### Smart AI Assistant
- **Intent Detection** (`aiAssistantIntentDetector.ts`) - Detects user intent: build_workflow, explain_workflow, get_help, analyze_workflow, general_question
- Only builds workflows when user actually wants them (not for questions)

### Database Integration
- Recursive upstream node detection for finding database nodes in workflow chains
- Supports PostgreSQL, MySQL, MongoDB
- Auto-loads table schema and sample data

### Visual Feedback
- **Smart Edge Styling** - Edges change appearance based on node configuration state
- Configured: Cyan, 3px, animated | Unconfigured: Gray, 2px, static

### Docker Service Management
- Desktop app manages backend services via Docker Compose
- Health polling every 10s with status broadcast to renderer
- Port conflict detection before starting services
- Log streaming per service

## Distribution & Updates

See [DISTRIBUTION.md](./DISTRIBUTION.md) for the full guide. Summary:

- **Initial download**: Host `.dmg` / `.exe` / `.AppImage` from `frontend/dist-electron/` on your website as static files
- **Auto-updates**: Configured via GitHub Releases (`nomubuilders/enterprise-software`). electron-builder generates `latest-mac.yml` / `latest.yml` automatically
- **Publish flow**: Bump version in `frontend/package.json` → `npm run package:mac` (or win/linux) → `gh release create v{version}` with artifacts
- **Alternative**: Switch `publish.provider` in `electron-builder.yml` from `github` to `generic` with your own URL

## Testing

- `npm test` from `frontend/`
- Check browser console for `[ChatInterface]` logs when debugging database connections
- Verify edge colors change when nodes are properly configured

## Code Style

- TypeScript strict mode
- Functional components with hooks
- Tailwind for all styling
- Use console.log with prefixes like `[ChatInterface]` or `[AI Assistant]` for debugging
