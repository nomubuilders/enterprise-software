# Compliance Ready AI

A desktop application for building visual AI compliance workflows. Process sensitive data entirely on-premises using local LLMs, with built-in PII filtering and audit logging for regulated industries.

Built by [Nomu](https://nomu.com) — "We Make Data Speak."

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **Docker Desktop** (manages backend services)
- **Ollama** (local LLM inference)

## Quick Start

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt
```

### 2. Pull an Ollama Model

```bash
ollama pull llama3.2
```

### 3. Run in Development

**Option A: Electron desktop app (recommended)**

```bash
cd frontend
npm run dev:electron
```

This opens the native desktop window. The app manages Docker services (backend, databases, Ollama) through the built-in Service Dashboard.

**Option B: Browser only**

Run three terminals:

```bash
# Terminal 1 - Backend services
docker compose up

# Terminal 2 - Backend API
cd backend
python -m uvicorn app.main:app --reload

# Terminal 3 - Frontend
cd frontend
npm run dev
```

Then open http://localhost:5173.

## Building for Production

### Package the Desktop App

```bash
cd frontend

# macOS (universal DMG)
npm run package:mac

# Windows (NSIS installer)
npm run package:win

# Linux (AppImage + .deb)
npm run package:linux
```

Built artifacts go to `frontend/dist-electron/`.

### Build Web Version Only

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`.

## Updating the Application

### Auto-Updates (Desktop)

The desktop app checks for updates from GitHub Releases automatically on launch. When an update is available, a notification appears. Updates require manual approval before downloading — no automatic downloads for enterprise environments.

To publish an update:

1. Bump `version` in `frontend/package.json`
2. Build and package: `npm run package:mac` (or win/linux)
3. Create a GitHub Release on `nomubuilders/enterprise-software` with the packaged artifacts
4. Users receive the update notification on next launch

### Manual Update

```bash
git pull origin main
cd frontend && npm install
cd ../backend && pip install -r requirements.txt
```

## Project Structure

```
compliance-flow/
├── frontend/                # Electron + React application
│   ├── electron/            # Electron main process
│   │   ├── main/            # Window management, Docker, IPC, auto-updater
│   │   ├── preload/         # Secure context bridge (electronAPI)
│   │   └── resources/       # App icons, production docker-compose, entitlements
│   ├── src/                 # React renderer
│   │   ├── components/
│   │   │   ├── nodes/       # Workflow nodes (Trigger, Database, LLM, PII, Output)
│   │   │   ├── canvas/      # React Flow canvas
│   │   │   ├── panels/      # Chat interface, AI assistant
│   │   │   ├── electron/    # Setup wizard, service dashboard, update notification
│   │   │   ├── sidebar/     # Node palette
│   │   │   ├── modals/      # Dialog windows
│   │   │   └── common/      # Shared UI (Button, Input, Modal, Select)
│   │   ├── store/           # Zustand state management
│   │   ├── services/        # AI workflow builder, intent detection
│   │   └── types/           # TypeScript interfaces
│   ├── electron-builder.yml # Desktop packaging config
│   ├── electron.vite.config.ts
│   └── vite.config.ts
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── api/             # Route handlers (health, databases, llm, workflows, docker, documents)
│   │   ├── services/        # Ollama, Docker, database connectors
│   │   ├── models/          # Pydantic models
│   │   └── core/            # Settings, config
│   └── requirements.txt
├── config/                  # App configuration
├── docker-compose.yml       # Development services
└── docs/                    # Architecture and planning documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 40, electron-vite, electron-builder |
| Frontend | React 19, TypeScript, Vite 7 |
| Workflow Canvas | @xyflow/react 12 (React Flow) |
| State Management | Zustand 5 |
| Styling | Tailwind CSS 4.1 |
| Backend | FastAPI, Uvicorn, Python 3.10+ |
| LLM | Ollama (Llama 3.2, Mistral, CodeLlama) |
| PII Detection | Presidio + spaCy |
| Databases | PostgreSQL 16, MySQL, MongoDB 7, Redis 7 |
| Containers | Docker Compose |

## Usage

### Building Workflows

1. **Drag nodes** from the sidebar onto the canvas
2. **Connect nodes** by dragging from output handles to input handles
3. **Configure nodes** by clicking them to open the settings panel
4. **Run the workflow** with the Run button

### AI Assistant

Click the AI Assistant button to open the floating assistant window. Describe what you want in natural language:

- *"Analyze customer feedback from our database"* — generates a full workflow
- *"What does this workflow do?"* — explains the current workflow
- *"How do I connect to PostgreSQL?"* — provides help without modifying anything

### Node Types

| Category | Nodes |
|----------|-------|
| Triggers | Manual, Schedule (cron), Webhook |
| Data Sources | PostgreSQL, MySQL, MongoDB |
| AI Models | Ollama LLM (Llama 3.2, Mistral, CodeLlama) |
| Compliance | PII Redact, PII Mask (GDPR Article 17) |
| Outputs | Chat Interface, Spreadsheet, Email, Telegram |

### Docker Service Dashboard (Desktop)

The desktop app includes a service dashboard that manages:
- **Backend API** (FastAPI on port 8000)
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **MongoDB** (port 27017)
- **Ollama** (port 11434)

Services start automatically via Docker Compose. Health status is polled every 10 seconds.

## Configuration

### Database Connections

Configure in the Database node settings panel:

| Field | Example |
|-------|---------|
| Host | `localhost` |
| Port | `5432` |
| Database | `my_database` |
| Username | `postgres` |
| Password | `your_password` |

### Environment Variables

Backend configuration via environment variables or `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `true` | Enable debug logging |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `compliance_flow` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection URL |

## Compliance

- **100% Local Processing** — no data leaves your infrastructure
- **GDPR Article 17** — PII redaction and masking built into workflow nodes
- **EU AI Act Ready** — audit logging and transparency controls
- **SOC 2 Compatible** — enterprise security architecture

## Troubleshooting

### Docker services won't start
- Verify Docker Desktop is running: `docker info`
- Check for port conflicts: `lsof -i :8000` (or 5432, 6379, etc.)
- View logs: use the Service Dashboard or `docker compose logs`

### Ollama not responding
- Ensure Ollama is running: `ollama serve`
- Check available models: `ollama list`
- Pull a model if needed: `ollama pull llama3.2`

### Electron app won't launch
- Rebuild: `cd frontend && npm run build:electron`
- Check Node version: `node -v` (must be 18+)
- Clear build cache: `rm -rf frontend/out frontend/dist-electron`

### Backend API errors
- Check API docs at http://localhost:8000/docs
- View health status: http://localhost:8000/api/v1/health
- Check backend logs: `cd backend && python -m uvicorn app.main:app --reload --log-level debug`

## License

Proprietary - All rights reserved.
