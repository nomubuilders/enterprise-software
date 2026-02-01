# Enterprise AI Infrastructure Platform
## Development Environment Setup Guide

**Version:** 1.0
**Date:** January 31, 2026

---

## Overview

This guide provides step-by-step instructions for setting up a complete local development environment for the Enterprise AI Infrastructure Platform.

---

## Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 8 cores | 16+ cores |
| RAM | 32 GB | 64+ GB |
| Storage | 100 GB SSD | 500 GB NVMe |
| GPU | None (CPU inference) | NVIDIA RTX 3080+ (16GB VRAM) |

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| **OS** | Ubuntu 22.04+ / macOS 13+ | Development |
| **Docker** | 24.0+ | Containerization |
| **Docker Compose** | 2.20+ | Local orchestration |
| **Node.js** | 20 LTS | Frontend build |
| **Python** | 3.11+ | Backend services |
| **Go** | 1.21+ | Auth/Audit services |
| **Git** | 2.40+ | Version control |
| **VS Code** | Latest | IDE (recommended) |

---

## 1. Initial Setup

### 1.1 Clone Repository

```bash
# Clone the monorepo
git clone https://github.com/your-org/enterprise-ai-platform.git
cd enterprise-ai-platform

# Initialize submodules (if any)
git submodule update --init --recursive
```

### 1.2 Install System Dependencies

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    jq \
    unzip \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for docker group to take effect
```

#### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install \
    git \
    jq \
    wget \
    node@20 \
    python@3.11 \
    go \
    ollama

# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open -a Docker
```

### 1.3 Install Language Runtimes

#### Python Environment

```bash
# Install pyenv for Python version management
curl https://pyenv.run | bash

# Add to shell profile (~/.bashrc or ~/.zshrc)
export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"

# Install Python 3.11
pyenv install 3.11.7
pyenv global 3.11.7

# Verify
python --version  # Should show 3.11.7

# Install Poetry for dependency management
curl -sSL https://install.python-poetry.org | python3 -
```

#### Node.js Environment

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell and install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Install pnpm (faster than npm)
npm install -g pnpm

# Verify
node --version  # Should show v20.x.x
pnpm --version
```

#### Go Environment

```bash
# Download Go
wget https://go.dev/dl/go1.21.6.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.6.linux-amd64.tar.gz

# Add to PATH (~/.bashrc or ~/.zshrc)
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Verify
go version  # Should show go1.21.6
```

---

## 2. Development Environment Configuration

### 2.1 Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

```bash
# .env.local

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_platform_dev
POSTGRES_USER=ai_platform
POSTGRES_PASSWORD=dev_password_change_me

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Ollama
OLLAMA_HOST=http://localhost:11434

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Vault (dev mode)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=dev-root-token

# JWT
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRY=3600

# API
API_PORT=8000
API_HOST=0.0.0.0
DEBUG=true

# Frontend
VITE_API_URL=http://localhost:8000
```

### 2.2 Docker Compose Development Stack

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: ai-platform-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-ai_platform_dev}
      POSTGRES_USER: ${POSTGRES_USER:-ai_platform}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/db/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-ai_platform}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: ai-platform-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Qdrant Vector Database
  qdrant:
    image: qdrant/qdrant:v1.12.0
    container_name: ai-platform-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      QDRANT__SERVICE__GRPC_PORT: 6334

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: ai-platform-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # HashiCorp Vault (Dev Mode)
  vault:
    image: hashicorp/vault:1.15
    container_name: ai-platform-vault
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: dev-root-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    cap_add:
      - IPC_LOCK

  # Ollama LLM Runtime
  ollama:
    image: ollama/ollama:latest
    container_name: ai-platform-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  # Prometheus Monitoring
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: ai-platform-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana Dashboards
  grafana:
    image: grafana/grafana:10.2.0
    container_name: ai-platform-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infrastructure/grafana/provisioning:/etc/grafana/provisioning
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: false

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  minio_data:
  ollama_data:
  prometheus_data:
  grafana_data:

networks:
  default:
    name: ai-platform-network
```

### 2.3 Start Development Stack

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

---

## 3. Service-Specific Setup

### 3.1 Backend Services (Python/FastAPI)

```bash
# Navigate to service directory
cd services/model-service

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Alternative: Using Poetry**

```bash
cd services/model-service

# Install dependencies
poetry install

# Activate environment
poetry shell

# Run migrations
alembic upgrade head

# Start server
poetry run uvicorn app.main:app --reload
```

### 3.2 Auth Service (Go)

```bash
# Navigate to service directory
cd services/auth-service

# Download dependencies
go mod download

# Run tests
go test ./...

# Build
go build -o bin/auth-service ./cmd/server

# Run development server
go run ./cmd/server --config=config/dev.yaml
```

### 3.3 Frontend (React)

```bash
# Navigate to frontend directory
cd web-ui

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test
```

### 3.4 Ollama Models

```bash
# Pull required models
ollama pull llama3.2
ollama pull mistral
ollama pull codellama

# List installed models
ollama list

# Test model
ollama run llama3.2 "Hello, how are you?"

# Pull embedding model
ollama pull nomic-embed-text
```

---

## 4. Database Setup

### 4.1 Run Migrations

```bash
# Apply all migrations
cd services/model-service
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Add new table"

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

### 4.2 Seed Development Data

```bash
# Run seed script
python scripts/seed_dev_data.py

# Or use make command
make seed-db
```

### 4.3 Database Access

```bash
# Connect via psql
psql -h localhost -U ai_platform -d ai_platform_dev

# Or use Docker
docker exec -it ai-platform-postgres psql -U ai_platform -d ai_platform_dev
```

---

## 5. IDE Configuration

### 5.1 VS Code Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "golang.go",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "hashicorp.terraform",
    "redhat.vscode-yaml",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "GitHub.copilot",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

### 5.2 VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },

  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  },
  "python.analysis.typeCheckingMode": "basic",
  "python.testing.pytestEnabled": true,

  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  "[go]": {
    "editor.defaultFormatter": "golang.go"
  },
  "go.lintTool": "golangci-lint",
  "go.lintFlags": ["--fast"],

  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/node_modules": true,
    "**/.venv": true
  },

  "docker.compose.files": ["docker-compose.dev.yml"]
}
```

### 5.3 Launch Configurations

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Model Service",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/services/model-service",
      "envFile": "${workspaceFolder}/.env.local"
    },
    {
      "name": "Go: Auth Service",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/services/auth-service/cmd/server",
      "args": ["--config=config/dev.yaml"]
    },
    {
      "name": "Frontend: React",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/web-ui/src"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Python: Model Service", "Go: Auth Service", "Frontend: React"]
    }
  ]
}
```

---

## 6. Development Workflow

### 6.1 Makefile Commands

Create a `Makefile` in the project root:

```makefile
.PHONY: help dev up down logs test lint build clean

help:
	@echo "Available commands:"
	@echo "  make dev        - Start development environment"
	@echo "  make up         - Start Docker services"
	@echo "  make down       - Stop Docker services"
	@echo "  make logs       - View Docker logs"
	@echo "  make test       - Run all tests"
	@echo "  make lint       - Run linters"
	@echo "  make build      - Build all services"
	@echo "  make clean      - Clean build artifacts"

# Development
dev: up
	@echo "Starting development servers..."
	@tmux new-session -d -s ai-platform \; \
		send-keys 'cd services/model-service && source .venv/bin/activate && uvicorn app.main:app --reload' Enter \; \
		split-window -h \; \
		send-keys 'cd services/auth-service && go run ./cmd/server' Enter \; \
		split-window -v \; \
		send-keys 'cd web-ui && pnpm dev' Enter \; \
		attach

# Docker
up:
	docker-compose -f docker-compose.dev.yml up -d

down:
	docker-compose -f docker-compose.dev.yml down

logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Testing
test:
	cd services/model-service && pytest
	cd services/auth-service && go test ./...
	cd web-ui && pnpm test

test-coverage:
	cd services/model-service && pytest --cov=app --cov-report=html
	cd services/auth-service && go test -coverprofile=coverage.out ./...

# Linting
lint:
	cd services/model-service && ruff check . && black --check .
	cd services/auth-service && golangci-lint run
	cd web-ui && pnpm lint

lint-fix:
	cd services/model-service && ruff check --fix . && black .
	cd services/auth-service && golangci-lint run --fix
	cd web-ui && pnpm lint --fix

# Build
build:
	docker-compose -f docker-compose.dev.yml build

build-prod:
	docker-compose -f docker-compose.prod.yml build

# Database
migrate:
	cd services/model-service && alembic upgrade head

migrate-create:
	cd services/model-service && alembic revision --autogenerate -m "$(name)"

seed-db:
	cd services/model-service && python scripts/seed_dev_data.py

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name "node_modules" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
```

### 6.2 Git Hooks (Pre-commit)

Install pre-commit:

```bash
pip install pre-commit
pre-commit install
```

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=1000']

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.(js|jsx|ts|tsx)$
        additional_dependencies:
          - eslint@8.56.0
          - typescript@5.3.3
          - '@typescript-eslint/parser@6.18.0'
          - '@typescript-eslint/eslint-plugin@6.18.0'

  - repo: https://github.com/golangci/golangci-lint
    rev: v1.55.2
    hooks:
      - id: golangci-lint
```

---

## 7. Troubleshooting

### Common Issues

#### Docker Issues

```bash
# Reset Docker environment
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
docker-compose -f docker-compose.dev.yml up -d
```

#### PostgreSQL Connection Refused

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs ai-platform-postgres

# Verify port
nc -zv localhost 5432
```

#### Ollama GPU Not Detected

```bash
# Verify NVIDIA drivers
nvidia-smi

# Verify NVIDIA container toolkit
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# Restart Ollama with GPU
docker-compose -f docker-compose.dev.yml restart ollama
```

#### Port Conflicts

```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>

# Or change port in .env.local
```

---

## 8. Quick Reference

### Service URLs (Development)

| Service | URL |
|---------|-----|
| API Gateway | http://localhost:8000 |
| Frontend | http://localhost:5173 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| MinIO Console | http://localhost:9001 |
| Vault UI | http://localhost:8200 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | ai_platform | dev_password |
| MinIO | minioadmin | minioadmin |
| Grafana | admin | admin |
| Vault | - | dev-root-token |

---

**Document Version:** 1.0
**Last Updated:** January 31, 2026
