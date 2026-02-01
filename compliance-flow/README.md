# ComplianceFlow

**Local AI Workflow Builder** - A compliance-first, fully local alternative to N8N/Flowise for regulated industries.

## 🎯 Unique Selling Point

**Compliance-First Local AI Platform** targeting enterprises in regulated industries (healthcare, finance, legal, government) who need AI automation without data leaving their infrastructure.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
compliance-flow/
├── docs/                          # Documentation
│   ├── architecture/              # System design & planning
│   │   ├── Enterprise_AI_Platform_Implementation_Plan.md
│   │   ├── Technology_Decision_Matrix.md
│   │   ├── Project_Timeline_Milestones.md
│   │   └── DEPLOYMENT_CONFIGURATIONS.md
│   ├── research/                  # Technical research
│   │   ├── ENTERPRISE_VECTOR_DATABASE_RESEARCH.md
│   │   └── VECTOR_DB_IMPLEMENTATION_EXAMPLES.md
│   ├── guides/                    # Setup & development guides
│   │   ├── Development_Environment_Setup.md
│   │   ├── Testing_Strategy.md
│   │   └── Cost_Estimation_Resource_Planning.md
│   └── api/                       # API documentation (coming soon)
│
├── src/                           # Source code
│   ├── components/                # React components
│   │   ├── nodes/                 # Flow node components
│   │   │   ├── BaseNode.tsx       # Base wrapper for all nodes
│   │   │   ├── TriggerNode.tsx    # Manual/Schedule/Webhook triggers
│   │   │   ├── DatabaseNode.tsx   # PostgreSQL/MySQL/MongoDB
│   │   │   ├── LLMNode.tsx        # Ollama LLM integration
│   │   │   ├── PIIFilterNode.tsx  # GDPR compliance (redact/mask)
│   │   │   ├── OutputNode.tsx     # Chat/Spreadsheet/Email/Telegram
│   │   │   └── index.ts           # Node type registry
│   │   ├── canvas/                # Flow canvas components
│   │   │   └── Canvas.tsx         # React Flow canvas wrapper
│   │   ├── sidebar/               # Sidebar components
│   │   │   └── Sidebar.tsx        # Draggable node palette
│   │   └── common/                # Shared UI components
│   │
│   ├── store/                     # State management (Zustand)
│   │   └── flowStore.ts           # Flow state with persistence
│   │
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Utility functions
│   ├── types/                     # TypeScript type definitions
│   ├── services/                  # API & external services
│   ├── config/                    # App configuration
│   │
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles (Tailwind)
│
├── public/                        # Static assets
│   └── icons/                     # PWA icons
│
├── tests/                         # Test suites
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
│
├── scripts/                       # Build & utility scripts
├── dist/                          # Production build output
│
├── vite.config.ts                 # Vite + PWA configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
└── index.html                     # HTML entry point
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Flow Canvas | React Flow (@xyflow/react) |
| State | Zustand (with persistence) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |

## 🔒 Compliance Features

- **100% Local Processing** - No data leaves your infrastructure
- **GDPR Article 17** - Right to erasure with PII redaction/masking
- **EU AI Act Ready** - Audit logging & transparency
- **SOC 2 Compatible** - Enterprise security controls

## 📊 Node Types

### Triggers
- **Manual Trigger** - Start flows manually
- **Schedule** - Cron-based automation
- **Webhook** - HTTP endpoint triggers

### Data Sources
- **PostgreSQL** - Enterprise relational DB
- **MySQL** - Popular open-source DB
- **MongoDB** - Document database

### AI Models (via Ollama)
- **Llama 3.2** - Meta's latest open model
- **Mistral** - Efficient European LLM
- **CodeLlama** - Code-specialized model

### Compliance
- **PII Redact** - Remove sensitive data
- **PII Mask** - Anonymize data patterns

### Outputs
- **Chat Interface** - Interactive AI chat
- **Spreadsheet** - Data export/analysis
- **Email** - Automated notifications
- **Telegram Bot** - Messaging integration

## 🗺️ Roadmap

- [x] Phase 1: POC Frontend (Current)
- [ ] Phase 2: Backend API + Ollama Integration
- [ ] Phase 3: Database Connectors
- [ ] Phase 4: Compliance Engine
- [ ] Phase 5: Production Packaging

## 📄 License

Proprietary - All rights reserved.
