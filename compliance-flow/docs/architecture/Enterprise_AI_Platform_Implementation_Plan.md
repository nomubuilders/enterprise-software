# Enterprise AI Infrastructure Platform
## Comprehensive Implementation Plan

**Version:** 1.0
**Date:** January 31, 2026
**Based on PRD Analysis and Multi-Agent Research**

---

## Executive Summary

This document provides a complete implementation roadmap for building an Enterprise AI Infrastructure Platform that enables organizations to deploy and manage proprietary AI software within their own infrastructure. The platform integrates with Ollama and Hugging Face for LLM management, connects to enterprise databases and services, provides advanced codebase analysis, and ensures GDPR/EU AI Act compliance.

**Estimated Timeline:** 9-12 months
**Team Size:** 12-18 engineers
**Technology Stack:** Python (FastAPI), Go, TypeScript (React), PostgreSQL, Redis, Kubernetes

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Phase 1: Core Platform Foundation](#2-phase-1-core-platform-foundation-months-1-3)
3. [Phase 2: LLM Integration Layer](#3-phase-2-llm-integration-layer-months-2-4)
4. [Phase 3: Data Integration Layer](#4-phase-3-data-integration-layer-months-3-5)
5. [Phase 4: Code Analysis Engine](#5-phase-4-code-analysis-engine-months-4-6)
6. [Phase 5: Vector Search & RAG](#6-phase-5-vector-search--rag-months-5-7)
7. [Phase 6: Compliance Framework](#7-phase-6-compliance-framework-months-6-8)
8. [Phase 7: Security Implementation](#8-phase-7-security-implementation-months-7-9)
9. [Phase 8: Production Deployment](#9-phase-8-production-deployment-months-8-10)
10. [Technology Stack Details](#10-technology-stack-details)
11. [Team Structure](#11-team-structure)
12. [Risk Mitigation](#12-risk-mitigation)

---

## 1. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Web UI        │  │   CLI Tool      │  │   REST API      │                  │
│  │   (React/TS)    │  │   (Go)          │  │   (FastAPI)     │                  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼────────────────────┼────────────────────┼────────────────────────────┘
            │                    │                    │
┌───────────┼────────────────────┼────────────────────┼────────────────────────────┐
│           └────────────────────┼────────────────────┘                            │
│                                │                                                  │
│                     ┌──────────▼──────────┐                                      │
│                     │   API Gateway       │                                      │
│                     │   (Kong/Tyk)        │                                      │
│                     └──────────┬──────────┘                                      │
│                                │                                                  │
│  ┌─────────────────────────────┼─────────────────────────────┐                   │
│  │                    CORE SERVICES LAYER                    │                   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │                   │
│  │  │ Auth        │  │ Model       │  │ Workflow    │       │                   │
│  │  │ Service     │  │ Manager     │  │ Engine      │       │                   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │                   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │                   │
│  │  │ Compliance  │  │ Code        │  │ Data        │       │                   │
│  │  │ Engine      │  │ Analyzer    │  │ Connector   │       │                   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │                   │
│  └───────────────────────────────────────────────────────────┘                   │
│                                                                                   │
│                            APPLICATION LAYER                                      │
└───────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌───────────────────────────────────────┼───────────────────────────────────────────┐
│                     LLM INTEGRATION LAYER                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Ollama         │  │ Hugging Face    │  │ Model           │                   │
│  │ Connector      │  │ Connector       │  │ Abstraction     │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
└───────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌───────────────────────────────────────┼───────────────────────────────────────────┐
│                     DATA INTEGRATION LAYER                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │PostgreSQL│ │MongoDB │ │Gmail    │ │Outlook  │ │S3/MinIO │ │Git      │        │
│  │MySQL    │ │Redis   │ │IMAP     │ │Graph    │ │NFS/SMB  │ │Jira     │        │
│  │Oracle   │ │Cassandra│ │SMTP     │ │API      │ │Local    │ │Salesforce│       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
└───────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌───────────────────────────────────────┼───────────────────────────────────────────┐
│                     STORAGE LAYER                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ PostgreSQL      │  │ Qdrant/Milvus   │  │ Redis           │                   │
│  │ (Metadata)      │  │ (Vectors)       │  │ (Cache)         │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ MinIO           │  │ Elasticsearch   │  │ Neo4j           │                   │
│  │ (Objects)       │  │ (Full-text)     │  │ (Graph)         │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
└───────────────────────────────────────────────────────────────────────────────────┘
                                       │
┌───────────────────────────────────────┼───────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Kubernetes      │  │ Prometheus/     │  │ HashiCorp       │                   │
│  │ (Orchestration) │  │ Grafana (Obs)   │  │ Vault (Secrets) │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Microservices Architecture

| Service | Technology | Responsibility |
|---------|-----------|----------------|
| **api-gateway** | Kong/Tyk | Rate limiting, auth proxy, routing |
| **auth-service** | Go + OPA | Authentication, authorization, SSO |
| **model-service** | Python + FastAPI | LLM lifecycle management |
| **connector-service** | Python + FastAPI | Data source integrations |
| **code-analyzer** | Python + Tree-sitter | Codebase analysis, AST parsing |
| **compliance-service** | Python + FastAPI | GDPR/AI Act compliance |
| **workflow-service** | Python + Celery | Task orchestration |
| **search-service** | Python + Qdrant | Semantic search, RAG |
| **audit-service** | Go | Immutable logging, monitoring |
| **web-ui** | React + TypeScript | User interface |

---

## 2. Phase 1: Core Platform Foundation (Months 1-3)

### 2.1 Project Setup and Infrastructure

**Week 1-2: Repository and CI/CD Setup**

```yaml
# Repository Structure
enterprise-ai-platform/
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── model-service/
│   ├── connector-service/
│   ├── code-analyzer/
│   ├── compliance-service/
│   ├── workflow-service/
│   ├── search-service/
│   └── audit-service/
├── shared/
│   ├── proto/              # gRPC definitions
│   ├── schemas/            # JSON schemas
│   └── libs/               # Shared libraries
├── infrastructure/
│   ├── terraform/          # IaC
│   ├── kubernetes/         # K8s manifests
│   └── docker/             # Docker configs
├── web-ui/                 # React frontend
├── docs/                   # Documentation
└── tests/                  # Integration tests
```

**Week 3-4: Core Infrastructure**

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ai_platform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  qdrant:
    image: qdrant/qdrant:v1.12.0
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data

  vault:
    image: hashicorp/vault:1.15
    cap_add:
      - IPC_LOCK
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN}
```

### 2.2 Authentication Service Implementation

**Technology:** Go + OPA (Open Policy Agent)

```go
// auth-service/internal/auth/handler.go
package auth

import (
    "context"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/open-policy-agent/opa/rego"
)

type AuthService struct {
    jwtSecret     []byte
    opaPolicy     *rego.PreparedEvalQuery
    userStore     UserStore
    sessionStore  SessionStore
}

type Claims struct {
    UserID    string   `json:"user_id"`
    Email     string   `json:"email"`
    Roles     []string `json:"roles"`
    TenantID  string   `json:"tenant_id"`
    jwt.RegisteredClaims
}

func (s *AuthService) Authenticate(ctx context.Context, req *AuthRequest) (*AuthResponse, error) {
    // 1. Validate credentials
    user, err := s.userStore.ValidateCredentials(ctx, req.Email, req.Password)
    if err != nil {
        return nil, ErrInvalidCredentials
    }

    // 2. Check MFA if enabled
    if user.MFAEnabled {
        if err := s.validateMFA(ctx, user, req.MFACode); err != nil {
            return nil, err
        }
    }

    // 3. Generate tokens
    accessToken, err := s.generateAccessToken(user)
    if err != nil {
        return nil, err
    }

    refreshToken, err := s.generateRefreshToken(user)
    if err != nil {
        return nil, err
    }

    // 4. Store session
    session := &Session{
        UserID:       user.ID,
        RefreshToken: refreshToken,
        ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
    }
    if err := s.sessionStore.Create(ctx, session); err != nil {
        return nil, err
    }

    return &AuthResponse{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresIn:    3600, // 1 hour
    }, nil
}

func (s *AuthService) Authorize(ctx context.Context, req *AuthzRequest) (bool, error) {
    // OPA policy evaluation
    input := map[string]interface{}{
        "user":     req.User,
        "action":   req.Action,
        "resource": req.Resource,
    }

    results, err := s.opaPolicy.Eval(ctx, rego.EvalInput(input))
    if err != nil {
        return false, err
    }

    if len(results) == 0 {
        return false, nil
    }

    allowed, ok := results[0].Bindings["allow"].(bool)
    return ok && allowed, nil
}
```

**OPA RBAC Policy:**

```rego
# auth-service/policies/rbac.rego
package authz

default allow = false

# Role definitions
role_permissions := {
    "admin": ["*"],
    "developer": ["models:read", "models:deploy", "connectors:read", "code:analyze"],
    "analyst": ["models:read", "connectors:read", "search:query"],
    "viewer": ["models:read", "connectors:read"]
}

# Allow if user has required permission
allow {
    some role in input.user.roles
    some permission in role_permissions[role]
    permission == "*"
}

allow {
    some role in input.user.roles
    some permission in role_permissions[role]
    permission == concat(":", [input.resource, input.action])
}
```

### 2.3 API Gateway Configuration

```yaml
# infrastructure/kubernetes/kong-config.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
config:
  minute: 100
  hour: 1000
  policy: local
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
config:
  secret_is_base64: false
  claims_to_verify:
    - exp
    - nbf
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-platform-ingress
  annotations:
    konghq.com/plugins: rate-limiting,jwt-auth
spec:
  ingressClassName: kong
  rules:
    - host: api.ai-platform.local
      http:
        paths:
          - path: /api/v1/auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 8080
          - path: /api/v1/models
            pathType: Prefix
            backend:
              service:
                name: model-service
                port:
                  number: 8000
```

### 2.4 Database Schema Design

```sql
-- migrations/001_initial_schema.sql

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Models
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'ollama', 'huggingface'
    model_id VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    config JSONB,
    metadata JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Connectors
CREATE TABLE connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'sql', 'nosql', 'email', 'storage', 'vcs'
    config JSONB NOT NULL,
    credentials_vault_path VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs (Append-only)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entry_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64),
    timestamp TIMESTAMP DEFAULT NOW(),
    actor_id UUID,
    actor_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    result VARCHAR(50),
    details JSONB,
    remote_address INET,
    user_agent TEXT
);

-- Immutability: Revoke UPDATE and DELETE
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;

-- Indexes
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_connectors_type ON connectors(type);
```

### 2.5 Deliverables for Phase 1

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| CI/CD Pipeline | GitHub Actions with staging/prod | All tests pass, automated deployment |
| Auth Service | JWT + MFA + RBAC | 99.9% uptime, <100ms auth latency |
| API Gateway | Kong with rate limiting | 10K req/min capacity |
| Database | PostgreSQL with migrations | Backup/restore tested |
| Dev Environment | Docker Compose | One-command startup |

---

## 3. Phase 2: LLM Integration Layer (Months 2-4)

### 3.1 Ollama Connector

```python
# model-service/connectors/ollama.py
import httpx
import asyncio
from typing import AsyncGenerator, Optional
from dataclasses import dataclass
from enum import Enum

class OllamaStatus(Enum):
    PENDING = "pending"
    PULLING = "pulling"
    READY = "ready"
    ERROR = "error"

@dataclass
class OllamaModel:
    name: str
    size: int
    digest: str
    modified_at: str
    details: dict

class OllamaConnector:
    """Production-ready Ollama integration"""

    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=300.0)

    async def list_models(self) -> list[OllamaModel]:
        """List all available models"""
        response = await self.client.get(f"{self.base_url}/api/tags")
        response.raise_for_status()

        data = response.json()
        return [
            OllamaModel(
                name=m["name"],
                size=m["size"],
                digest=m["digest"],
                modified_at=m["modified_at"],
                details=m.get("details", {})
            )
            for m in data.get("models", [])
        ]

    async def pull_model(
        self,
        model_name: str,
        progress_callback: Optional[callable] = None
    ) -> AsyncGenerator[dict, None]:
        """Pull model with progress streaming"""
        async with self.client.stream(
            "POST",
            f"{self.base_url}/api/pull",
            json={"name": model_name, "stream": True}
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    import json
                    progress = json.loads(line)
                    if progress_callback:
                        await progress_callback(progress)
                    yield progress

    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """Generate completion with streaming"""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        if system:
            payload["system"] = system

        if stream:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        import json
                        chunk = json.loads(line)
                        if "response" in chunk:
                            yield chunk["response"]
        else:
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            yield response.json()["response"]

    async def chat(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """Chat completion with message history"""
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {"temperature": temperature}
        }

        async with self.client.stream(
            "POST",
            f"{self.base_url}/api/chat",
            json=payload
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    import json
                    chunk = json.loads(line)
                    if "message" in chunk and "content" in chunk["message"]:
                        yield chunk["message"]["content"]

    async def get_model_info(self, model_name: str) -> dict:
        """Get detailed model information"""
        response = await self.client.post(
            f"{self.base_url}/api/show",
            json={"name": model_name}
        )
        response.raise_for_status()
        return response.json()

    async def delete_model(self, model_name: str) -> bool:
        """Delete a model"""
        response = await self.client.delete(
            f"{self.base_url}/api/delete",
            json={"name": model_name}
        )
        return response.status_code == 200
```

### 3.2 Hugging Face Connector

```python
# model-service/connectors/huggingface.py
import os
from pathlib import Path
from typing import Optional, Union
from dataclasses import dataclass
from huggingface_hub import (
    HfApi,
    snapshot_download,
    hf_hub_download,
    model_info
)
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

@dataclass
class HFModelInfo:
    model_id: str
    author: str
    downloads: int
    likes: int
    tags: list[str]
    pipeline_tag: str
    library_name: str

class HuggingFaceConnector:
    """Hugging Face Hub integration with quantization support"""

    def __init__(
        self,
        cache_dir: str = "/models/huggingface",
        token: Optional[str] = None
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.api = HfApi(token=token)
        self.token = token

    async def search_models(
        self,
        query: str,
        task: Optional[str] = None,
        library: str = "transformers",
        limit: int = 20
    ) -> list[HFModelInfo]:
        """Search models on Hugging Face Hub"""
        models = self.api.list_models(
            search=query,
            filter=task,
            library=library,
            limit=limit,
            sort="downloads",
            direction=-1
        )

        return [
            HFModelInfo(
                model_id=m.id,
                author=m.author,
                downloads=m.downloads,
                likes=m.likes,
                tags=m.tags,
                pipeline_tag=m.pipeline_tag,
                library_name=m.library_name
            )
            for m in models
        ]

    async def download_model(
        self,
        model_id: str,
        revision: str = "main",
        allow_patterns: Optional[list[str]] = None,
        progress_callback: Optional[callable] = None
    ) -> Path:
        """Download model with SafeTensors preference"""
        # Prefer SafeTensors format (76.6x faster loading)
        if allow_patterns is None:
            allow_patterns = [
                "*.safetensors",
                "*.json",
                "*.txt",
                "tokenizer*",
                "config.json"
            ]

        local_dir = snapshot_download(
            repo_id=model_id,
            revision=revision,
            cache_dir=str(self.cache_dir),
            allow_patterns=allow_patterns,
            token=self.token
        )

        return Path(local_dir)

    async def load_model_quantized(
        self,
        model_id: str,
        quantization: str = "4bit",  # "4bit", "8bit", "none"
        device_map: str = "auto"
    ) -> tuple:
        """Load model with bitsandbytes quantization"""
        from transformers import BitsAndBytesConfig

        quantization_config = None
        if quantization == "4bit":
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True
            )
        elif quantization == "8bit":
            quantization_config = BitsAndBytesConfig(
                load_in_8bit=True
            )

        tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            cache_dir=str(self.cache_dir),
            token=self.token
        )

        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            quantization_config=quantization_config,
            device_map=device_map,
            cache_dir=str(self.cache_dir),
            token=self.token,
            torch_dtype=torch.float16
        )

        return model, tokenizer

    def get_model_info(self, model_id: str) -> dict:
        """Get model metadata from Hub"""
        info = model_info(model_id, token=self.token)
        return {
            "id": info.id,
            "author": info.author,
            "downloads": info.downloads,
            "likes": info.likes,
            "tags": info.tags,
            "library_name": info.library_name,
            "pipeline_tag": info.pipeline_tag,
            "created_at": info.created_at.isoformat() if info.created_at else None,
            "last_modified": info.last_modified.isoformat() if info.last_modified else None
        }
```

### 3.3 Model Abstraction Layer (OpenAI-Compatible API)

```python
# model-service/abstraction/unified_api.py
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Union
from dataclasses import dataclass
from enum import Enum

class ModelProvider(Enum):
    OLLAMA = "ollama"
    HUGGINGFACE = "huggingface"
    VLLM = "vllm"

@dataclass
class ChatMessage:
    role: str  # "system", "user", "assistant"
    content: str

@dataclass
class CompletionRequest:
    model: str
    messages: list[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = True
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0

@dataclass
class CompletionChunk:
    id: str
    object: str
    created: int
    model: str
    choices: list[dict]

class BaseModelProvider(ABC):
    """Abstract base for model providers"""

    @abstractmethod
    async def chat_completion(
        self, request: CompletionRequest
    ) -> AsyncGenerator[CompletionChunk, None]:
        pass

    @abstractmethod
    async def list_models(self) -> list[dict]:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass

class UnifiedModelAPI:
    """OpenAI-compatible API abstraction layer"""

    def __init__(self):
        self.providers: dict[ModelProvider, BaseModelProvider] = {}
        self.model_registry: dict[str, ModelProvider] = {}

    def register_provider(
        self,
        provider_type: ModelProvider,
        provider: BaseModelProvider
    ):
        """Register a model provider"""
        self.providers[provider_type] = provider

    def register_model(
        self,
        model_name: str,
        provider: ModelProvider
    ):
        """Register model to provider mapping"""
        self.model_registry[model_name] = provider

    async def chat_completions_create(
        self,
        request: CompletionRequest
    ) -> AsyncGenerator[CompletionChunk, None]:
        """OpenAI-compatible chat completions endpoint"""
        provider_type = self.model_registry.get(request.model)
        if not provider_type:
            raise ValueError(f"Model {request.model} not registered")

        provider = self.providers.get(provider_type)
        if not provider:
            raise ValueError(f"Provider {provider_type} not available")

        async for chunk in provider.chat_completion(request):
            yield chunk

    async def list_models(self) -> list[dict]:
        """List all available models across providers"""
        all_models = []
        for provider_type, provider in self.providers.items():
            models = await provider.list_models()
            for model in models:
                model["provider"] = provider_type.value
                all_models.append(model)
        return all_models
```

### 3.4 vLLM Integration for High-Performance Inference

```python
# model-service/inference/vllm_engine.py
from vllm import LLM, SamplingParams
from vllm.engine.async_llm_engine import AsyncLLMEngine
from vllm.engine.arg_utils import AsyncEngineArgs
from typing import AsyncGenerator
import asyncio

class VLLMInferenceEngine:
    """
    High-performance inference with vLLM
    24x throughput improvement via PagedAttention
    """

    def __init__(
        self,
        model_path: str,
        tensor_parallel_size: int = 1,
        gpu_memory_utilization: float = 0.9,
        max_model_len: int = 4096
    ):
        self.engine_args = AsyncEngineArgs(
            model=model_path,
            tensor_parallel_size=tensor_parallel_size,
            gpu_memory_utilization=gpu_memory_utilization,
            max_model_len=max_model_len,
            trust_remote_code=True
        )
        self.engine = None

    async def initialize(self):
        """Initialize the async engine"""
        self.engine = AsyncLLMEngine.from_engine_args(self.engine_args)

    async def generate(
        self,
        prompt: str,
        request_id: str,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 0.95
    ) -> AsyncGenerator[str, None]:
        """Generate with streaming output"""
        sampling_params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p
        )

        results_generator = self.engine.generate(
            prompt,
            sampling_params,
            request_id
        )

        async for result in results_generator:
            for output in result.outputs:
                yield output.text

    async def batch_generate(
        self,
        prompts: list[str],
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> list[str]:
        """Batch generation for throughput optimization"""
        sampling_params = SamplingParams(
            temperature=temperature,
            max_tokens=max_tokens
        )

        llm = LLM(
            model=self.engine_args.model,
            tensor_parallel_size=self.engine_args.tensor_parallel_size
        )

        outputs = llm.generate(prompts, sampling_params)
        return [output.outputs[0].text for output in outputs]
```

### 3.5 Model Service API

```python
# model-service/main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI(title="Model Service", version="1.0.0")

class DeployModelRequest(BaseModel):
    model_id: str
    source: str  # "ollama" or "huggingface"
    config: Optional[dict] = None

class ChatRequest(BaseModel):
    model: str
    messages: list[dict]
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = True

@app.post("/api/v1/models/deploy")
async def deploy_model(
    request: DeployModelRequest,
    background_tasks: BackgroundTasks
):
    """Deploy a model from Ollama or Hugging Face"""
    deployment_id = str(uuid.uuid4())

    # Add to background task queue
    background_tasks.add_task(
        model_manager.deploy_model,
        deployment_id,
        request.model_id,
        request.source,
        request.config
    )

    return {
        "deployment_id": deployment_id,
        "status": "pending",
        "message": f"Model {request.model_id} deployment started"
    }

@app.get("/api/v1/models")
async def list_models():
    """List all available models"""
    return await unified_api.list_models()

@app.post("/api/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """OpenAI-compatible chat completions"""
    if request.stream:
        async def generate():
            async for chunk in unified_api.chat_completions_create(request):
                yield f"data: {chunk.json()}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    else:
        # Non-streaming response
        full_response = ""
        async for chunk in unified_api.chat_completions_create(request):
            full_response += chunk.choices[0].get("delta", {}).get("content", "")

        return {
            "id": str(uuid.uuid4()),
            "object": "chat.completion",
            "model": request.model,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": full_response},
                "finish_reason": "stop"
            }]
        }

@app.get("/api/v1/models/{model_id}/status")
async def get_model_status(model_id: str):
    """Get deployment status for a model"""
    return await model_manager.get_status(model_id)
```

### 3.6 Deliverables for Phase 2

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Ollama Connector | Full API integration | Model pull, generate, chat working |
| HuggingFace Connector | Hub + quantization | 4-bit loading, 75% memory reduction |
| Unified API | OpenAI-compatible | Drop-in replacement for OpenAI SDK |
| vLLM Engine | High-performance inference | 24x throughput vs baseline |
| Model Manager | Lifecycle management | Deploy, monitor, delete models |

---

## 4. Phase 3: Data Integration Layer (Months 3-5)

### 4.1 Unified Connector Architecture

```python
# connector-service/core/base.py
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from dataclasses import dataclass
from enum import Enum

class ConnectorType(Enum):
    SQL = "sql"
    NOSQL = "nosql"
    EMAIL = "email"
    STORAGE = "storage"
    VCS = "vcs"
    ENTERPRISE = "enterprise"

@dataclass
class ConnectorConfig:
    connector_type: ConnectorType
    connector_name: str
    credentials_vault_path: str
    options: Dict[str, Any] = None

class BaseConnector(ABC):
    """Abstract base for all data connectors"""

    def __init__(self, config: ConnectorConfig, vault_client):
        self.config = config
        self.vault = vault_client
        self.connected = False

    async def get_credentials(self) -> Dict:
        """Retrieve credentials from HashiCorp Vault"""
        secret = await self.vault.secrets.kv.v2.read_secret_version(
            path=self.config.credentials_vault_path
        )
        return secret["data"]["data"]

    @abstractmethod
    async def connect(self) -> bool:
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass

    @abstractmethod
    async def execute(self, operation: str, **kwargs) -> Any:
        pass

class ConnectorFactory:
    """Factory for creating connectors"""

    _registry: Dict[str, type] = {}

    @classmethod
    def register(cls, connector_key: str, connector_class: type):
        cls._registry[connector_key] = connector_class

    @classmethod
    def create(cls, config: ConnectorConfig, vault_client) -> BaseConnector:
        key = f"{config.connector_type.value}_{config.connector_name}"
        if key not in cls._registry:
            raise ValueError(f"Unknown connector: {key}")
        return cls._registry[key](config, vault_client)
```

### 4.2 SQL Database Connector

```python
# connector-service/connectors/sql.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, inspect
from typing import List, Dict, Any

class PostgreSQLConnector(BaseConnector):
    """PostgreSQL connector with connection pooling"""

    CONNECTOR_TYPE = "sql"
    CONNECTOR_NAME = "postgresql"

    async def connect(self) -> bool:
        credentials = await self.get_credentials()

        connection_string = (
            f"postgresql+asyncpg://{credentials['username']}:"
            f"{credentials['password']}@{credentials['host']}:"
            f"{credentials['port']}/{credentials['database']}"
        )

        self.engine = create_async_engine(
            connection_string,
            pool_size=20,
            max_overflow=10,
            pool_recycle=3600,
            pool_pre_ping=True
        )

        self.session_factory = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

        # Test connection
        async with self.engine.begin() as conn:
            await conn.execute(text("SELECT 1"))

        self.connected = True
        return True

    async def disconnect(self) -> bool:
        if self.engine:
            await self.engine.dispose()
        self.connected = False
        return True

    async def health_check(self) -> bool:
        try:
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    async def execute(self, operation: str, **kwargs) -> Any:
        if operation == "query":
            return await self._execute_query(kwargs["sql"], kwargs.get("params"))
        elif operation == "execute":
            return await self._execute_statement(kwargs["sql"], kwargs.get("params"))
        elif operation == "discover_schema":
            return await self._discover_schema()
        elif operation == "nl_to_sql":
            return await self._natural_language_to_sql(kwargs["query"])

    async def _execute_query(self, sql: str, params: Dict = None) -> List[Dict]:
        async with self.session_factory() as session:
            result = await session.execute(text(sql), params or {})
            rows = result.fetchall()
            columns = result.keys()
            return [dict(zip(columns, row)) for row in rows]

    async def _discover_schema(self) -> Dict:
        """Discover database schema for NL-to-SQL"""
        async with self.engine.begin() as conn:
            inspector = inspect(conn)

            schema = {}
            for table_name in inspector.get_table_names():
                columns = inspector.get_columns(table_name)
                pk = inspector.get_pk_constraint(table_name)
                fks = inspector.get_foreign_keys(table_name)

                schema[table_name] = {
                    "columns": [
                        {
                            "name": col["name"],
                            "type": str(col["type"]),
                            "nullable": col["nullable"]
                        }
                        for col in columns
                    ],
                    "primary_key": pk.get("constrained_columns", []),
                    "foreign_keys": [
                        {
                            "columns": fk["constrained_columns"],
                            "references": f"{fk['referred_table']}.{fk['referred_columns']}"
                        }
                        for fk in fks
                    ]
                }

            return schema

    async def _natural_language_to_sql(self, query: str) -> str:
        """Convert natural language to SQL using LLM"""
        schema = await self._discover_schema()

        # Format schema for LLM context
        schema_context = self._format_schema_for_llm(schema)

        prompt = f"""Given the following database schema:
{schema_context}

Convert this natural language query to SQL:
"{query}"

Return only the SQL query, nothing else."""

        # Call LLM service
        sql = await llm_service.generate(
            model="llama3.2",
            prompt=prompt,
            temperature=0
        )

        return sql.strip()

# Register connector
ConnectorFactory.register("sql_postgresql", PostgreSQLConnector)
```

### 4.3 Email Connector (Gmail + Outlook)

```python
# connector-service/connectors/email.py
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import httpx
from typing import List, Dict
import base64

class GmailConnector(BaseConnector):
    """Gmail API connector with OAuth2"""

    CONNECTOR_TYPE = "email"
    CONNECTOR_NAME = "gmail"

    SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send'
    ]

    async def connect(self) -> bool:
        credentials = await self.get_credentials()

        creds = Credentials(
            token=credentials['access_token'],
            refresh_token=credentials['refresh_token'],
            token_uri='https://oauth2.googleapis.com/token',
            client_id=credentials['client_id'],
            client_secret=credentials['client_secret']
        )

        self.service = build('gmail', 'v1', credentials=creds)
        self.connected = True
        return True

    async def execute(self, operation: str, **kwargs) -> Any:
        if operation == "list_messages":
            return await self._list_messages(kwargs.get("query"), kwargs.get("max_results", 10))
        elif operation == "get_message":
            return await self._get_message(kwargs["message_id"])
        elif operation == "send_message":
            return await self._send_message(kwargs["to"], kwargs["subject"], kwargs["body"])

    async def _list_messages(self, query: str = None, max_results: int = 10) -> List[Dict]:
        results = self.service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()

        messages = []
        for msg in results.get('messages', []):
            full_msg = await self._get_message(msg['id'])
            messages.append(full_msg)

        return messages

    async def _get_message(self, message_id: str) -> Dict:
        message = self.service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()

        headers = message['payload']['headers']

        return {
            'id': message['id'],
            'thread_id': message['threadId'],
            'subject': next((h['value'] for h in headers if h['name'] == 'Subject'), ''),
            'from': next((h['value'] for h in headers if h['name'] == 'From'), ''),
            'to': next((h['value'] for h in headers if h['name'] == 'To'), ''),
            'date': next((h['value'] for h in headers if h['name'] == 'Date'), ''),
            'body': self._extract_body(message['payload']),
            'attachments': self._extract_attachments(message['payload'])
        }

    def _extract_body(self, payload: Dict) -> str:
        """Extract email body from payload"""
        if 'body' in payload and payload['body'].get('data'):
            return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')

        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    if part['body'].get('data'):
                        return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')

        return ''

class OutlookConnector(BaseConnector):
    """Microsoft Graph API connector for Outlook"""

    CONNECTOR_TYPE = "email"
    CONNECTOR_NAME = "outlook"

    async def connect(self) -> bool:
        credentials = await self.get_credentials()

        self.access_token = credentials['access_token']
        self.client = httpx.AsyncClient(
            base_url='https://graph.microsoft.com/v1.0',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )

        self.connected = True
        return True

    async def execute(self, operation: str, **kwargs) -> Any:
        if operation == "list_messages":
            return await self._list_messages(kwargs.get("folder", "inbox"), kwargs.get("top", 10))
        elif operation == "get_message":
            return await self._get_message(kwargs["message_id"])
        elif operation == "send_message":
            return await self._send_message(kwargs["to"], kwargs["subject"], kwargs["body"])

    async def _list_messages(self, folder: str = "inbox", top: int = 10) -> List[Dict]:
        response = await self.client.get(
            f'/me/mailFolders/{folder}/messages',
            params={'$top': top, '$orderby': 'receivedDateTime desc'}
        )
        response.raise_for_status()

        data = response.json()
        return [
            {
                'id': msg['id'],
                'subject': msg['subject'],
                'from': msg['from']['emailAddress']['address'],
                'to': [r['emailAddress']['address'] for r in msg['toRecipients']],
                'date': msg['receivedDateTime'],
                'body': msg['bodyPreview'],
                'has_attachments': msg['hasAttachments']
            }
            for msg in data.get('value', [])
        ]

ConnectorFactory.register("email_gmail", GmailConnector)
ConnectorFactory.register("email_outlook", OutlookConnector)
```

### 4.4 File Storage Connector (S3/MinIO)

```python
# connector-service/connectors/storage.py
from minio import Minio
from minio.error import S3Error
from typing import AsyncGenerator, List, Dict
from pathlib import Path
import aiofiles
import hashlib

class MinIOConnector(BaseConnector):
    """S3-compatible storage connector"""

    CONNECTOR_TYPE = "storage"
    CONNECTOR_NAME = "minio"

    async def connect(self) -> bool:
        credentials = await self.get_credentials()

        self.client = Minio(
            endpoint=credentials['endpoint'],
            access_key=credentials['access_key'],
            secret_key=credentials['secret_key'],
            secure=credentials.get('use_ssl', True)
        )

        self.connected = True
        return True

    async def execute(self, operation: str, **kwargs) -> Any:
        if operation == "upload":
            return await self._upload(kwargs["bucket"], kwargs["object_name"], kwargs["file_path"])
        elif operation == "download":
            return await self._download(kwargs["bucket"], kwargs["object_name"], kwargs["file_path"])
        elif operation == "list":
            return await self._list_objects(kwargs["bucket"], kwargs.get("prefix", ""))
        elif operation == "delete":
            return await self._delete(kwargs["bucket"], kwargs["object_name"])

    async def _upload(self, bucket: str, object_name: str, file_path: str) -> Dict:
        # Ensure bucket exists
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)

        # Calculate checksum
        async with aiofiles.open(file_path, 'rb') as f:
            content = await f.read()
            checksum = hashlib.sha256(content).hexdigest()

        # Upload with metadata
        result = self.client.fput_object(
            bucket,
            object_name,
            file_path,
            metadata={'checksum': checksum}
        )

        return {
            'bucket': bucket,
            'object_name': result.object_name,
            'etag': result.etag,
            'checksum': checksum
        }

    async def _list_objects(self, bucket: str, prefix: str = "") -> List[Dict]:
        objects = self.client.list_objects(bucket, prefix=prefix, recursive=True)
        return [
            {
                'name': obj.object_name,
                'size': obj.size,
                'last_modified': obj.last_modified.isoformat(),
                'etag': obj.etag
            }
            for obj in objects
        ]

ConnectorFactory.register("storage_minio", MinIOConnector)
```

### 4.5 Deliverables for Phase 3

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Connector Framework | Plugin architecture | Easy to add new connectors |
| SQL Connectors | PostgreSQL, MySQL, Oracle | Schema discovery, NL-to-SQL |
| NoSQL Connectors | MongoDB, Redis | Document/KV operations |
| Email Connectors | Gmail, Outlook | OAuth2, read/send |
| Storage Connector | MinIO/S3 | Upload, download, list |
| VCS Connector | Git | Clone, diff, history |

---

## 5. Phase 4: Code Analysis Engine (Months 4-6)

### 5.1 Tree-sitter Multi-Language Parser

```python
# code-analyzer/parsers/tree_sitter_parser.py
import tree_sitter_python
import tree_sitter_javascript
import tree_sitter_typescript
import tree_sitter_go
import tree_sitter_rust
import tree_sitter_java
from tree_sitter import Language, Parser
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class CodeNode:
    type: str
    name: str
    start_line: int
    end_line: int
    children: List['CodeNode']
    metadata: Dict[str, Any]

class MultiLanguageParser:
    """Tree-sitter based multi-language parser"""

    LANGUAGES = {
        'python': tree_sitter_python.language(),
        'javascript': tree_sitter_javascript.language(),
        'typescript': tree_sitter_typescript.language_typescript(),
        'go': tree_sitter_go.language(),
        'rust': tree_sitter_rust.language(),
        'java': tree_sitter_java.language()
    }

    def __init__(self):
        self.parsers: Dict[str, Parser] = {}
        for lang, language in self.LANGUAGES.items():
            parser = Parser()
            parser.language = language
            self.parsers[lang] = parser

    def parse(self, code: str, language: str) -> CodeNode:
        """Parse code into AST"""
        if language not in self.parsers:
            raise ValueError(f"Unsupported language: {language}")

        parser = self.parsers[language]
        tree = parser.parse(bytes(code, 'utf-8'))

        return self._tree_to_node(tree.root_node, code)

    def _tree_to_node(self, node, source: str) -> CodeNode:
        """Convert tree-sitter node to CodeNode"""
        children = [
            self._tree_to_node(child, source)
            for child in node.children
            if child.is_named
        ]

        return CodeNode(
            type=node.type,
            name=self._extract_name(node, source),
            start_line=node.start_point[0] + 1,
            end_line=node.end_point[0] + 1,
            children=children,
            metadata=self._extract_metadata(node, source)
        )

    def _extract_name(self, node, source: str) -> str:
        """Extract name from node"""
        # Function/method name
        if node.type in ('function_definition', 'method_definition', 'function_declaration'):
            name_node = node.child_by_field_name('name')
            if name_node:
                return source[name_node.start_byte:name_node.end_byte]

        # Class name
        if node.type in ('class_definition', 'class_declaration'):
            name_node = node.child_by_field_name('name')
            if name_node:
                return source[name_node.start_byte:name_node.end_byte]

        return ''

    def extract_functions(self, code: str, language: str) -> List[Dict]:
        """Extract all functions/methods from code"""
        tree = self.parsers[language].parse(bytes(code, 'utf-8'))
        functions = []

        def visit(node):
            if node.type in ('function_definition', 'method_definition',
                           'function_declaration', 'method_declaration'):
                functions.append({
                    'name': self._extract_name(node, code),
                    'start_line': node.start_point[0] + 1,
                    'end_line': node.end_point[0] + 1,
                    'code': code[node.start_byte:node.end_byte],
                    'params': self._extract_params(node, code),
                    'docstring': self._extract_docstring(node, code)
                })

            for child in node.children:
                visit(child)

        visit(tree.root_node)
        return functions

    def extract_classes(self, code: str, language: str) -> List[Dict]:
        """Extract all classes from code"""
        tree = self.parsers[language].parse(bytes(code, 'utf-8'))
        classes = []

        def visit(node):
            if node.type in ('class_definition', 'class_declaration'):
                methods = []
                for child in node.children:
                    if child.type in ('function_definition', 'method_definition',
                                    'method_declaration'):
                        methods.append({
                            'name': self._extract_name(child, code),
                            'start_line': child.start_point[0] + 1,
                            'end_line': child.end_point[0] + 1
                        })

                classes.append({
                    'name': self._extract_name(node, code),
                    'start_line': node.start_point[0] + 1,
                    'end_line': node.end_point[0] + 1,
                    'methods': methods,
                    'docstring': self._extract_docstring(node, code)
                })

            for child in node.children:
                visit(child)

        visit(tree.root_node)
        return classes
```

### 5.2 Code Metrics Calculator

```python
# code-analyzer/metrics/calculator.py
from dataclasses import dataclass
from typing import Dict, List
import math

@dataclass
class CodeMetrics:
    cyclomatic_complexity: int
    maintainability_index: float
    lines_of_code: int
    comment_lines: int
    blank_lines: int
    halstead_volume: float
    function_count: int
    class_count: int

class MetricsCalculator:
    """Calculate code quality metrics"""

    DECISION_KEYWORDS = {
        'python': ['if', 'elif', 'for', 'while', 'except', 'with', 'and', 'or'],
        'javascript': ['if', 'else if', 'for', 'while', 'catch', 'case', '&&', '||', '?'],
        'typescript': ['if', 'else if', 'for', 'while', 'catch', 'case', '&&', '||', '?'],
        'go': ['if', 'for', 'switch', 'case', 'select', '&&', '||'],
        'java': ['if', 'else if', 'for', 'while', 'catch', 'case', '&&', '||', '?']
    }

    def calculate(self, code: str, language: str, ast_node) -> CodeMetrics:
        """Calculate all metrics for code"""
        lines = code.split('\n')

        loc = len([l for l in lines if l.strip()])
        comment_lines = self._count_comments(code, language)
        blank_lines = len([l for l in lines if not l.strip()])

        cc = self._cyclomatic_complexity(code, language)
        halstead = self._halstead_volume(code, language)
        mi = self._maintainability_index(halstead, cc, loc)

        func_count = len(self._extract_functions(ast_node))
        class_count = len(self._extract_classes(ast_node))

        return CodeMetrics(
            cyclomatic_complexity=cc,
            maintainability_index=mi,
            lines_of_code=loc,
            comment_lines=comment_lines,
            blank_lines=blank_lines,
            halstead_volume=halstead,
            function_count=func_count,
            class_count=class_count
        )

    def _cyclomatic_complexity(self, code: str, language: str) -> int:
        """
        Calculate McCabe's Cyclomatic Complexity
        CC = E - N + 2P (or count decision points + 1)
        """
        keywords = self.DECISION_KEYWORDS.get(language, [])
        complexity = 1  # Base complexity

        for keyword in keywords:
            complexity += code.count(keyword)

        return complexity

    def _halstead_volume(self, code: str, language: str) -> float:
        """
        Calculate Halstead Volume
        V = N * log2(n)
        N = total operators + operands
        n = unique operators + operands
        """
        # Simplified calculation - tokenize and count
        import re
        tokens = re.findall(r'\w+|[^\s\w]', code)

        n = len(set(tokens))  # Unique tokens (vocabulary)
        N = len(tokens)        # Total tokens (length)

        if n == 0:
            return 0

        return N * math.log2(n) if n > 0 else 0

    def _maintainability_index(
        self,
        halstead_volume: float,
        cyclomatic_complexity: int,
        loc: int
    ) -> float:
        """
        Calculate Maintainability Index (0-100 scale)
        MI = max(0, (171 - 5.2*ln(V) - 0.23*CC - 16.2*ln(LOC)) * 100 / 171)
        """
        if halstead_volume <= 0 or loc <= 0:
            return 100.0

        mi = 171 - 5.2 * math.log(halstead_volume) \
             - 0.23 * cyclomatic_complexity \
             - 16.2 * math.log(loc)

        # Normalize to 0-100
        mi = max(0, mi * 100 / 171)

        return round(mi, 2)
```

### 5.3 Security Scanner (SAST)

```python
# code-analyzer/security/scanner.py
from dataclasses import dataclass
from typing import List, Dict, Optional
import re
from enum import Enum

class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class SecurityFinding:
    rule_id: str
    title: str
    description: str
    severity: Severity
    file_path: str
    line_number: int
    code_snippet: str
    cwe_id: Optional[str] = None
    fix_suggestion: Optional[str] = None

class SecurityScanner:
    """Static Application Security Testing (SAST)"""

    # Security rules (simplified - production would use Semgrep)
    RULES = {
        'sql_injection': {
            'pattern': r'f["\'].*SELECT.*{.*}',
            'severity': Severity.CRITICAL,
            'cwe': 'CWE-89',
            'title': 'Potential SQL Injection',
            'description': 'User input in SQL query without parameterization',
            'fix': 'Use parameterized queries or ORM'
        },
        'hardcoded_secret': {
            'pattern': r'(password|secret|api_key|token)\s*=\s*["\'][^"\']+["\']',
            'severity': Severity.HIGH,
            'cwe': 'CWE-798',
            'title': 'Hardcoded Secret',
            'description': 'Secrets should not be hardcoded in source code',
            'fix': 'Use environment variables or secret manager'
        },
        'xss_vulnerability': {
            'pattern': r'innerHTML\s*=.*\+',
            'severity': Severity.HIGH,
            'cwe': 'CWE-79',
            'title': 'Potential XSS Vulnerability',
            'description': 'Direct DOM manipulation with user input',
            'fix': 'Use textContent or sanitize input'
        },
        'insecure_random': {
            'pattern': r'random\.random\(\)|Math\.random\(\)',
            'severity': Severity.MEDIUM,
            'cwe': 'CWE-330',
            'title': 'Insecure Random Number Generator',
            'description': 'Using non-cryptographic random for security purposes',
            'fix': 'Use secrets module (Python) or crypto.randomBytes (Node.js)'
        },
        'path_traversal': {
            'pattern': r'open\(.*\+.*\)|os\.path\.join\(.*input',
            'severity': Severity.HIGH,
            'cwe': 'CWE-22',
            'title': 'Potential Path Traversal',
            'description': 'User input used in file path without validation',
            'fix': 'Validate and sanitize file paths'
        }
    }

    def scan(self, code: str, file_path: str) -> List[SecurityFinding]:
        """Scan code for security vulnerabilities"""
        findings = []
        lines = code.split('\n')

        for rule_id, rule in self.RULES.items():
            pattern = re.compile(rule['pattern'], re.IGNORECASE)

            for i, line in enumerate(lines, 1):
                if pattern.search(line):
                    findings.append(SecurityFinding(
                        rule_id=rule_id,
                        title=rule['title'],
                        description=rule['description'],
                        severity=rule['severity'],
                        file_path=file_path,
                        line_number=i,
                        code_snippet=line.strip(),
                        cwe_id=rule.get('cwe'),
                        fix_suggestion=rule.get('fix')
                    ))

        return findings

    def scan_secrets(self, code: str, file_path: str) -> List[SecurityFinding]:
        """Scan for hardcoded secrets"""
        findings = []
        lines = code.split('\n')

        # Secret patterns
        patterns = {
            'aws_key': (r'AKIA[0-9A-Z]{16}', 'AWS Access Key'),
            'private_key': (r'-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----', 'Private Key'),
            'github_token': (r'ghp_[a-zA-Z0-9]{36}', 'GitHub Token'),
            'generic_api_key': (r'api[_-]?key["\']?\s*[:=]\s*["\'][a-zA-Z0-9]{20,}', 'API Key'),
            'jwt_token': (r'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*', 'JWT Token')
        }

        for i, line in enumerate(lines, 1):
            for secret_type, (pattern, name) in patterns.items():
                if re.search(pattern, line):
                    findings.append(SecurityFinding(
                        rule_id=f'secret_{secret_type}',
                        title=f'Exposed {name}',
                        description=f'Found exposed {name} in source code',
                        severity=Severity.CRITICAL,
                        file_path=file_path,
                        line_number=i,
                        code_snippet=line.strip()[:50] + '...',  # Truncate
                        cwe_id='CWE-798',
                        fix_suggestion='Remove secret and rotate credentials'
                    ))

        return findings
```

### 5.4 Deliverables for Phase 4

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Multi-Language Parser | Tree-sitter (50+ langs) | Parse Python, JS, Go, Java, Rust |
| Metrics Calculator | CC, MI, LOC, Halstead | Accurate metrics calculation |
| Security Scanner | SAST rules engine | Detect OWASP Top 10 |
| Secret Detection | Pattern-based scanning | Find exposed credentials |
| Dependency Analyzer | Package vulnerability scan | CVE database integration |

---

## 6. Phase 5: Vector Search & RAG (Months 5-7)

### 6.1 Vector Database Integration (Qdrant)

```python
# search-service/vector_db/qdrant_client.py
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
    SearchParams, HnswConfigDiff
)
from typing import List, Dict, Any, Optional
import uuid

class QdrantVectorStore:
    """Qdrant vector database integration"""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6333,
        collection_name: str = "documents"
    ):
        self.client = AsyncQdrantClient(host=host, port=port)
        self.collection_name = collection_name

    async def create_collection(
        self,
        vector_size: int = 1024,
        distance: Distance = Distance.COSINE
    ):
        """Create collection with HNSW index"""
        await self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=distance
            ),
            hnsw_config=HnswConfigDiff(
                m=16,                    # Max connections per node
                ef_construct=200,        # Index build quality
                full_scan_threshold=10000
            )
        )

    async def upsert(
        self,
        vectors: List[List[float]],
        payloads: List[Dict[str, Any]],
        ids: Optional[List[str]] = None
    ) -> int:
        """Insert or update vectors"""
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in vectors]

        points = [
            PointStruct(
                id=id_,
                vector=vector,
                payload=payload
            )
            for id_, vector, payload in zip(ids, vectors, payloads)
        ]

        await self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

        return len(points)

    async def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        filter_conditions: Optional[Dict] = None,
        score_threshold: float = 0.7
    ) -> List[Dict]:
        """Semantic search with filtering"""
        search_filter = None
        if filter_conditions:
            conditions = [
                FieldCondition(
                    key=key,
                    match=MatchValue(value=value)
                )
                for key, value in filter_conditions.items()
            ]
            search_filter = Filter(must=conditions)

        results = await self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            query_filter=search_filter,
            score_threshold=score_threshold,
            search_params=SearchParams(
                hnsw_ef=128,  # Search quality
                exact=False   # Use approximate search
            )
        )

        return [
            {
                'id': hit.id,
                'score': hit.score,
                'payload': hit.payload
            }
            for hit in results
        ]

    async def hybrid_search(
        self,
        query_vector: List[float],
        text_query: str,
        limit: int = 10,
        vector_weight: float = 0.7
    ) -> List[Dict]:
        """Hybrid search combining vector and keyword"""
        # Vector search results
        vector_results = await self.search(query_vector, limit=limit * 2)

        # Keyword matching in payloads
        keyword_scores = {}
        for result in vector_results:
            text_content = result['payload'].get('content', '')
            keyword_score = self._calculate_bm25_score(text_query, text_content)
            keyword_scores[result['id']] = keyword_score

        # Reciprocal Rank Fusion (RRF)
        final_scores = {}
        k = 60  # RRF constant

        for i, result in enumerate(vector_results):
            vector_rank = i + 1
            keyword_rank = sorted(keyword_scores.keys(),
                                key=lambda x: keyword_scores[x],
                                reverse=True).index(result['id']) + 1

            rrf_score = (vector_weight / (k + vector_rank)) + \
                       ((1 - vector_weight) / (k + keyword_rank))

            final_scores[result['id']] = {
                'score': rrf_score,
                'payload': result['payload']
            }

        # Sort by final score
        sorted_results = sorted(
            final_scores.items(),
            key=lambda x: x[1]['score'],
            reverse=True
        )[:limit]

        return [
            {'id': id_, 'score': data['score'], 'payload': data['payload']}
            for id_, data in sorted_results
        ]
```

### 6.2 Document Processing Pipeline

```python
# search-service/processing/document_processor.py
from typing import List, Dict, Any
from dataclasses import dataclass
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from bs4 import BeautifulSoup
import tiktoken

@dataclass
class DocumentChunk:
    content: str
    metadata: Dict[str, Any]
    start_char: int
    end_char: int
    token_count: int

class DocumentProcessor:
    """Process documents for RAG pipeline"""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    async def process_document(
        self,
        file_path: str,
        file_type: str
    ) -> List[DocumentChunk]:
        """Extract and chunk document content"""
        # Extract text based on file type
        if file_type == 'pdf':
            text = await self._extract_pdf(file_path)
        elif file_type == 'docx':
            text = await self._extract_docx(file_path)
        elif file_type == 'html':
            text = await self._extract_html(file_path)
        elif file_type == 'txt':
            with open(file_path, 'r') as f:
                text = f.read()
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

        # Chunk the text
        chunks = self._semantic_chunking(text, file_path)

        return chunks

    async def _extract_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        doc = fitz.open(file_path)
        text_parts = []

        for page in doc:
            text_parts.append(page.get_text())

        doc.close()
        return '\n'.join(text_parts)

    async def _extract_docx(self, file_path: str) -> str:
        """Extract text from DOCX"""
        doc = DocxDocument(file_path)
        paragraphs = [p.text for p in doc.paragraphs]
        return '\n'.join(paragraphs)

    async def _extract_html(self, file_path: str) -> str:
        """Extract text from HTML"""
        with open(file_path, 'r') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        # Remove script and style elements
        for element in soup(['script', 'style', 'nav', 'footer']):
            element.decompose()

        return soup.get_text(separator='\n', strip=True)

    def _semantic_chunking(
        self,
        text: str,
        source: str
    ) -> List[DocumentChunk]:
        """Chunk text semantically using sentences and paragraphs"""
        # Split into paragraphs
        paragraphs = text.split('\n\n')

        chunks = []
        current_chunk = []
        current_tokens = 0
        start_char = 0

        for paragraph in paragraphs:
            paragraph_tokens = len(self.tokenizer.encode(paragraph))

            if current_tokens + paragraph_tokens > self.chunk_size:
                # Save current chunk
                if current_chunk:
                    chunk_text = '\n\n'.join(current_chunk)
                    chunks.append(DocumentChunk(
                        content=chunk_text,
                        metadata={
                            'source': source,
                            'chunk_index': len(chunks)
                        },
                        start_char=start_char,
                        end_char=start_char + len(chunk_text),
                        token_count=current_tokens
                    ))
                    start_char += len(chunk_text) + 2  # +2 for \n\n

                # Start new chunk with overlap
                if self.chunk_overlap > 0 and current_chunk:
                    overlap_text = current_chunk[-1]  # Keep last paragraph
                    current_chunk = [overlap_text, paragraph]
                    current_tokens = len(self.tokenizer.encode(overlap_text)) + paragraph_tokens
                else:
                    current_chunk = [paragraph]
                    current_tokens = paragraph_tokens
            else:
                current_chunk.append(paragraph)
                current_tokens += paragraph_tokens

        # Don't forget last chunk
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append(DocumentChunk(
                content=chunk_text,
                metadata={
                    'source': source,
                    'chunk_index': len(chunks)
                },
                start_char=start_char,
                end_char=start_char + len(chunk_text),
                token_count=current_tokens
            ))

        return chunks
```

### 6.3 RAG Pipeline

```python
# search-service/rag/pipeline.py
from typing import List, Dict, Any, AsyncGenerator
from dataclasses import dataclass

@dataclass
class RAGResponse:
    answer: str
    sources: List[Dict]
    confidence: float

class RAGPipeline:
    """Retrieval-Augmented Generation pipeline"""

    def __init__(
        self,
        vector_store: QdrantVectorStore,
        embedding_model,
        llm_service
    ):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.llm = llm_service

    async def query(
        self,
        question: str,
        top_k: int = 5,
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """Execute RAG query with streaming"""
        # 1. Generate query embedding
        query_embedding = await self.embedding_model.embed(question)

        # 2. Retrieve relevant documents
        results = await self.vector_store.hybrid_search(
            query_vector=query_embedding,
            text_query=question,
            limit=top_k
        )

        # 3. Build context from retrieved documents
        context = self._build_context(results)

        # 4. Generate answer with citations
        prompt = self._build_rag_prompt(question, context, results)

        # 5. Stream response
        async for token in self.llm.generate(
            model="llama3.2",
            prompt=prompt,
            temperature=0.3,
            stream=True
        ):
            yield token

    def _build_context(self, results: List[Dict]) -> str:
        """Build context string from search results"""
        context_parts = []

        for i, result in enumerate(results, 1):
            content = result['payload'].get('content', '')
            source = result['payload'].get('source', 'Unknown')

            context_parts.append(
                f"[Document {i}] (Source: {source})\n{content}"
            )

        return "\n\n---\n\n".join(context_parts)

    def _build_rag_prompt(
        self,
        question: str,
        context: str,
        results: List[Dict]
    ) -> str:
        """Build prompt for RAG generation"""
        return f"""You are a helpful assistant. Answer the question based on the provided context.
If the context doesn't contain enough information, say so.
Always cite your sources using [Document N] format.

Context:
{context}

Question: {question}

Instructions:
1. Answer based on the provided context
2. Cite sources using [Document N] format
3. If information is not in context, acknowledge it
4. Be concise but thorough

Answer:"""

    async def query_with_citations(
        self,
        question: str,
        top_k: int = 5
    ) -> RAGResponse:
        """Query with structured citations"""
        # Collect full response
        full_response = ""
        async for token in self.query(question, top_k, stream=True):
            full_response += token

        # Extract citations
        import re
        citations = re.findall(r'\[Document (\d+)\]', full_response)

        # Get source documents
        query_embedding = await self.embedding_model.embed(question)
        results = await self.vector_store.search(query_embedding, limit=top_k)

        cited_sources = []
        for citation in set(citations):
            idx = int(citation) - 1
            if idx < len(results):
                cited_sources.append({
                    'index': citation,
                    'source': results[idx]['payload'].get('source'),
                    'content_preview': results[idx]['payload'].get('content', '')[:200]
                })

        return RAGResponse(
            answer=full_response,
            sources=cited_sources,
            confidence=sum(r['score'] for r in results) / len(results) if results else 0
        )
```

### 6.4 Deliverables for Phase 5

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| Vector Store | Qdrant integration | 1M+ vectors, <100ms search |
| Document Processor | Multi-format extraction | PDF, DOCX, HTML, TXT |
| Chunking Pipeline | Semantic chunking | Configurable size/overlap |
| Embedding Service | BGE-M3 integration | Batch embedding support |
| RAG Pipeline | Full retrieval + generation | Streaming with citations |
| Hybrid Search | Vector + keyword | RRF fusion |

---

## 7. Phase 6: Compliance Framework (Months 6-8)

### 7.1 PII Detection and Anonymization

```python
# compliance-service/pii/detector.py
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
from typing import List, Dict, Tuple

class PIIDetector:
    """PII detection and anonymization using Microsoft Presidio"""

    def __init__(self):
        self.analyzer = AnalyzerEngine()
        self.anonymizer = AnonymizerEngine()

    async def detect(
        self,
        text: str,
        language: str = "en",
        score_threshold: float = 0.5
    ) -> List[Dict]:
        """Detect PII entities in text"""
        results = self.analyzer.analyze(
            text=text,
            language=language,
            score_threshold=score_threshold
        )

        return [
            {
                'entity_type': result.entity_type,
                'start': result.start,
                'end': result.end,
                'score': result.score,
                'text': text[result.start:result.end]
            }
            for result in results
        ]

    async def anonymize(
        self,
        text: str,
        mode: str = "replace"  # replace, hash, mask, redact
    ) -> Tuple[str, List[Dict]]:
        """Anonymize PII in text"""
        # Detect PII
        results = self.analyzer.analyze(text=text, language="en")

        # Configure anonymization operators
        operators = {}
        if mode == "replace":
            operators = {"DEFAULT": OperatorConfig("replace", {"new_value": "[REDACTED]"})}
        elif mode == "hash":
            operators = {"DEFAULT": OperatorConfig("hash", {"hash_type": "sha256"})}
        elif mode == "mask":
            operators = {"DEFAULT": OperatorConfig("mask", {"chars_to_mask": 4, "masking_char": "*"})}
        elif mode == "redact":
            operators = {"DEFAULT": OperatorConfig("redact")}

        # Apply anonymization
        anonymized = self.anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators=operators
        )

        return anonymized.text, [
            {'entity_type': r.entity_type, 'original': text[r.start:r.end]}
            for r in results
        ]

    async def pseudonymize(
        self,
        text: str,
        mapping_id: str
    ) -> Tuple[str, Dict]:
        """Pseudonymize with reversible mapping"""
        import hashlib
        import json

        results = self.analyzer.analyze(text=text, language="en")

        pseudonym_map = {}
        modified_text = text

        # Process in reverse order to maintain positions
        for result in sorted(results, key=lambda x: x.start, reverse=True):
            original = text[result.start:result.end]

            # Generate consistent pseudonym
            hash_input = f"{mapping_id}:{result.entity_type}:{original}"
            pseudonym = f"[{result.entity_type}_{hashlib.md5(hash_input.encode()).hexdigest()[:8]}]"

            pseudonym_map[pseudonym] = original
            modified_text = modified_text[:result.start] + pseudonym + modified_text[result.end:]

        # Store mapping securely (in production, use Vault)
        return modified_text, pseudonym_map
```

### 7.2 EU AI Act Risk Classification

```python
# compliance-service/ai_act/risk_classifier.py
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass

class RiskLevel(Enum):
    UNACCEPTABLE = "unacceptable"  # Banned
    HIGH_RISK = "high_risk"        # Full compliance required
    LIMITED_RISK = "limited_risk"  # Transparency required
    MINIMAL_RISK = "minimal_risk"  # General rules

@dataclass
class RiskAssessment:
    risk_level: RiskLevel
    categories: List[str]
    requirements: List[str]
    reasoning: str

class AIActRiskClassifier:
    """EU AI Act Annex III risk classification"""

    # Annex III high-risk categories
    HIGH_RISK_CATEGORIES = {
        'biometric': {
            'keywords': ['face recognition', 'fingerprint', 'voice recognition', 'emotion detection'],
            'description': 'Biometric identification and categorization'
        },
        'critical_infrastructure': {
            'keywords': ['power grid', 'water supply', 'traffic control', 'healthcare systems'],
            'description': 'Management of critical infrastructure'
        },
        'education': {
            'keywords': ['student assessment', 'enrollment', 'academic evaluation', 'learning adaptation'],
            'description': 'Educational and vocational training'
        },
        'employment': {
            'keywords': ['recruitment', 'hiring', 'promotion', 'termination', 'performance evaluation'],
            'description': 'Employment and worker management'
        },
        'essential_services': {
            'keywords': ['credit scoring', 'insurance pricing', 'loan approval', 'benefit eligibility'],
            'description': 'Access to essential services'
        },
        'law_enforcement': {
            'keywords': ['crime prediction', 'evidence evaluation', 'suspect identification'],
            'description': 'Law enforcement applications'
        },
        'migration': {
            'keywords': ['visa processing', 'asylum', 'border control', 'immigration'],
            'description': 'Migration, asylum, and border control'
        },
        'justice': {
            'keywords': ['sentencing', 'parole', 'custody', 'judicial decision'],
            'description': 'Administration of justice'
        }
    }

    # Unacceptable risk (banned)
    BANNED_USES = [
        'social_scoring',
        'real_time_biometric_public',
        'subliminal_manipulation',
        'exploitation_vulnerabilities'
    ]

    async def classify(
        self,
        system_description: str,
        use_cases: List[str],
        data_types: List[str]
    ) -> RiskAssessment:
        """Classify AI system risk level"""

        # Check for banned uses
        for banned in self.BANNED_USES:
            if banned.lower() in system_description.lower():
                return RiskAssessment(
                    risk_level=RiskLevel.UNACCEPTABLE,
                    categories=[banned],
                    requirements=['PROHIBITED - Must not be deployed'],
                    reasoning=f'System involves banned use case: {banned}'
                )

        # Check for high-risk categories
        matched_categories = []
        for category, config in self.HIGH_RISK_CATEGORIES.items():
            for keyword in config['keywords']:
                if keyword.lower() in system_description.lower():
                    matched_categories.append(category)
                    break

        if matched_categories:
            requirements = self._get_high_risk_requirements()
            return RiskAssessment(
                risk_level=RiskLevel.HIGH_RISK,
                categories=matched_categories,
                requirements=requirements,
                reasoning=f'System matches high-risk categories: {", ".join(matched_categories)}'
            )

        # Check for limited risk (transparency required)
        limited_risk_indicators = ['chatbot', 'content generation', 'deepfake', 'synthetic']
        for indicator in limited_risk_indicators:
            if indicator.lower() in system_description.lower():
                return RiskAssessment(
                    risk_level=RiskLevel.LIMITED_RISK,
                    categories=['transparency'],
                    requirements=[
                        'Disclose AI interaction to users',
                        'Label AI-generated content',
                        'Provide model documentation'
                    ],
                    reasoning='System requires transparency obligations'
                )

        # Default: minimal risk
        return RiskAssessment(
            risk_level=RiskLevel.MINIMAL_RISK,
            categories=[],
            requirements=['Follow general AI principles'],
            reasoning='System does not fall into high-risk or limited-risk categories'
        )

    def _get_high_risk_requirements(self) -> List[str]:
        """Get requirements for high-risk systems"""
        return [
            'Risk management system (Article 9)',
            'Data governance and quality (Article 10)',
            'Technical documentation (Annex IV)',
            'Record-keeping and logging (Article 12)',
            'Transparency to users (Article 13)',
            'Human oversight measures (Article 14)',
            'Accuracy, robustness, cybersecurity (Article 15)',
            'Conformity assessment before deployment',
            'Post-market monitoring plan'
        ]
```

### 7.3 Audit Logging Service

```python
# compliance-service/audit/logger.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
import hashlib
import json

@dataclass
class AuditEntry:
    entry_hash: str
    previous_hash: str
    timestamp: datetime
    actor_id: str
    actor_type: str
    action: str
    resource_type: str
    resource_id: str
    result: str
    details: Dict[str, Any]
    remote_address: str
    signature: str

class ImmutableAuditLog:
    """Cryptographically chained audit log for compliance"""

    def __init__(self, db_pool, signing_key: bytes):
        self.db = db_pool
        self.signing_key = signing_key
        self.previous_hash: Optional[str] = None

    async def log(
        self,
        actor_id: str,
        actor_type: str,
        action: str,
        resource_type: str,
        resource_id: str,
        result: str,
        details: Dict[str, Any] = None,
        remote_address: str = None
    ) -> str:
        """Create immutable audit log entry"""
        timestamp = datetime.utcnow()

        # Create entry content
        entry_content = {
            'timestamp': timestamp.isoformat(),
            'actor_id': actor_id,
            'actor_type': actor_type,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'result': result,
            'details': details or {}
        }

        # Calculate hash
        entry_hash = hashlib.sha256(
            json.dumps(entry_content, sort_keys=True).encode()
        ).hexdigest()

        # Get previous hash for chain
        if not self.previous_hash:
            self.previous_hash = await self._get_last_hash()

        # Create signature
        signature = self._sign_entry(entry_hash, self.previous_hash)

        # Insert into database
        async with self.db.acquire() as conn:
            await conn.execute('''
                INSERT INTO audit_logs
                (entry_hash, previous_hash, timestamp, actor_id, actor_type,
                 action, resource_type, resource_id, result, details,
                 remote_address, digital_signature)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ''', entry_hash, self.previous_hash, timestamp, actor_id, actor_type,
                action, resource_type, resource_id, result, json.dumps(details),
                remote_address, signature)

        # Update chain state
        self.previous_hash = entry_hash

        return entry_hash

    def _sign_entry(self, entry_hash: str, previous_hash: str) -> str:
        """Sign entry with HMAC-SHA256"""
        import hmac
        message = f"{entry_hash}:{previous_hash or 'genesis'}"
        return hmac.new(
            self.signing_key,
            message.encode(),
            hashlib.sha256
        ).hexdigest()

    async def verify_chain_integrity(self) -> bool:
        """Verify no tampering has occurred"""
        async with self.db.acquire() as conn:
            rows = await conn.fetch('''
                SELECT entry_hash, previous_hash, timestamp, actor_id, actor_type,
                       action, resource_type, resource_id, result, details,
                       digital_signature
                FROM audit_logs
                ORDER BY timestamp ASC
            ''')

        prev_hash = None
        for row in rows:
            # Verify chain continuity
            if row['previous_hash'] != prev_hash:
                return False

            # Verify signature
            expected_sig = self._sign_entry(row['entry_hash'], prev_hash)
            if row['digital_signature'] != expected_sig:
                return False

            prev_hash = row['entry_hash']

        return True

    async def export_for_audit(
        self,
        start_date: datetime,
        end_date: datetime,
        format: str = 'json'
    ) -> str:
        """Export logs for regulatory inspection"""
        async with self.db.acquire() as conn:
            rows = await conn.fetch('''
                SELECT * FROM audit_logs
                WHERE timestamp >= $1 AND timestamp <= $2
                ORDER BY timestamp ASC
            ''', start_date, end_date)

        entries = [dict(row) for row in rows]

        if format == 'json':
            return json.dumps(entries, default=str, indent=2)
        elif format == 'csv':
            import csv
            import io
            output = io.StringIO()
            if entries:
                writer = csv.DictWriter(output, fieldnames=entries[0].keys())
                writer.writeheader()
                writer.writerows(entries)
            return output.getvalue()

        raise ValueError(f"Unsupported format: {format}")
```

### 7.4 Deliverables for Phase 6

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| PII Detector | Presidio integration | 95%+ detection accuracy |
| Anonymization | Replace/hash/mask/redact | GDPR Article 17 compliant |
| Risk Classifier | EU AI Act Annex III | Correct classification |
| Audit Logger | Immutable chain | 6+ year retention |
| Data Lineage | OpenLineage integration | Full provenance tracking |
| Model Cards | Auto-generation | EU AI Act Article 13 |

---

## 8. Phase 7: Security Implementation (Months 7-9)

### 8.1 Prompt Injection Prevention

```python
# security-service/ai/prompt_guard.py
from typing import Tuple, List
import re

class PromptInjectionGuard:
    """Multi-layer defense against prompt injection"""

    SUSPICIOUS_PATTERNS = [
        r'ignore\s+(previous|above|all)\s+instructions',
        r'disregard\s+(previous|above|all)',
        r'forget\s+(previous|everything)',
        r'you\s+are\s+now\s+',
        r'new\s+instructions?\s*:',
        r'system\s*:\s*',
        r'<\s*(system|admin|root)\s*>',
        r'<!--.*-->',  # HTML comments
        r'\[INST\]',   # Instruction markers
    ]

    def __init__(self, llm_classifier=None):
        self.patterns = [re.compile(p, re.IGNORECASE) for p in self.SUSPICIOUS_PATTERNS]
        self.classifier = llm_classifier

    async def check_input(self, user_input: str) -> Tuple[bool, List[str]]:
        """Check user input for injection attempts"""
        warnings = []

        # Pattern-based detection
        for i, pattern in enumerate(self.patterns):
            if pattern.search(user_input):
                warnings.append(f"Suspicious pattern detected: {self.SUSPICIOUS_PATTERNS[i]}")

        # Length check
        if len(user_input) > 10000:
            warnings.append("Unusually long input")

        # Encoding detection
        if self._has_suspicious_encoding(user_input):
            warnings.append("Suspicious encoding detected")

        # LLM-based classification (if available)
        if self.classifier and warnings:
            is_malicious = await self._classify_with_llm(user_input)
            if is_malicious:
                warnings.append("LLM classifier flagged as potential injection")

        is_safe = len(warnings) == 0
        return is_safe, warnings

    def _has_suspicious_encoding(self, text: str) -> bool:
        """Check for encoded payloads"""
        import base64

        # Check for base64 encoded content
        b64_pattern = r'[A-Za-z0-9+/]{20,}={0,2}'
        matches = re.findall(b64_pattern, text)

        for match in matches:
            try:
                decoded = base64.b64decode(match).decode('utf-8', errors='ignore')
                for pattern in self.patterns:
                    if pattern.search(decoded):
                        return True
            except:
                pass

        return False

    async def _classify_with_llm(self, text: str) -> bool:
        """Use LLM to classify potential injection"""
        prompt = f"""Analyze if this text contains a prompt injection attempt:

Text: {text[:500]}

Answer only "yes" or "no"."""

        response = await self.classifier.generate(
            model="llama3.2",
            prompt=prompt,
            temperature=0,
            max_tokens=10
        )

        return 'yes' in response.lower()

    def sanitize_input(self, user_input: str) -> str:
        """Sanitize input by removing/escaping dangerous content"""
        sanitized = user_input

        # Remove HTML-like tags
        sanitized = re.sub(r'<[^>]+>', '', sanitized)

        # Escape special instruction markers
        sanitized = re.sub(r'\[INST\]', '[INS‌T]', sanitized)
        sanitized = re.sub(r'</s>', '</‌s>', sanitized)

        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized)

        return sanitized.strip()
```

### 8.2 Output Filtering

```python
# security-service/ai/output_filter.py
from typing import Dict, List, Any
import re

class OutputFilter:
    """Filter LLM outputs for sensitive data leakage"""

    def __init__(self, pii_detector):
        self.pii_detector = pii_detector

    async def filter_response(
        self,
        response: str,
        user_permissions: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """Filter response based on user permissions and context"""
        filtered = response

        # 1. Remove any PII from response
        pii_results = await self.pii_detector.detect(response)
        if pii_results:
            filtered, _ = await self.pii_detector.anonymize(filtered, mode="redact")

        # 2. Remove any leaked system prompts
        filtered = self._remove_system_prompt_leakage(filtered)

        # 3. Apply permission-based filtering
        filtered = self._apply_permission_filter(filtered, user_permissions)

        # 4. Remove any hardcoded secrets
        filtered = self._remove_secrets(filtered)

        return filtered

    def _remove_system_prompt_leakage(self, text: str) -> str:
        """Remove any accidentally leaked system prompts"""
        # Common system prompt markers
        markers = [
            r'<\|system\|>.*?<\|/system\|>',
            r'\[SYSTEM\].*?\[/SYSTEM\]',
            r'System:.*?(?=User:|Assistant:|$)',
        ]

        for marker in markers:
            text = re.sub(marker, '[FILTERED]', text, flags=re.DOTALL | re.IGNORECASE)

        return text

    def _apply_permission_filter(
        self,
        text: str,
        permissions: Dict[str, Any]
    ) -> str:
        """Filter based on user permission level"""
        # Define sensitive data patterns by permission level
        restricted_patterns = {
            'financial': r'\$[\d,]+\.?\d*|\d+\s*(USD|EUR|GBP)',
            'salary': r'salary|compensation|pay\s*:\s*\$?[\d,]+',
            'internal': r'internal\s+only|confidential|restricted',
        }

        for category, pattern in restricted_patterns.items():
            if not permissions.get(f'view_{category}', False):
                text = re.sub(pattern, '[ACCESS RESTRICTED]', text, flags=re.IGNORECASE)

        return text

    def _remove_secrets(self, text: str) -> str:
        """Remove any leaked secrets"""
        # API keys
        text = re.sub(r'[a-zA-Z0-9_-]{20,}', '[KEY REDACTED]', text)

        # Passwords in context
        text = re.sub(
            r'(password|passwd|pwd|secret)\s*[=:]\s*\S+',
            r'\1=[REDACTED]',
            text,
            flags=re.IGNORECASE
        )

        return text
```

### 8.3 Deliverables for Phase 7

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| MFA Service | TOTP + FIDO2 | WebAuthn integration |
| RBAC Engine | OPA policies | Fine-grained permissions |
| Prompt Guard | Injection prevention | Multi-layer defense |
| Output Filter | Data leakage prevention | PII, secrets filtering |
| Encryption | AES-256-GCM | At-rest and in-transit |
| Key Management | Vault integration | HSM support |

---

## 9. Phase 8: Production Deployment (Months 8-10)

### 9.1 Kubernetes Deployment

```yaml
# infrastructure/kubernetes/model-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-service
  namespace: ai-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: model-service
  template:
    metadata:
      labels:
        app: model-service
    spec:
      containers:
      - name: model-service
        image: ai-platform/model-service:v1.0.0
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: "1"
          limits:
            memory: "8Gi"
            cpu: "4"
            nvidia.com/gpu: "1"
        env:
        - name: OLLAMA_HOST
          value: "ollama-service:11434"
        - name: VAULT_ADDR
          value: "http://vault:8200"
        - name: VAULT_TOKEN
          valueFrom:
            secretKeyRef:
              name: vault-token
              key: token
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: model-service-hpa
  namespace: ai-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: model-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 9.2 Monitoring Stack

```yaml
# infrastructure/kubernetes/monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s

    scrape_configs:
      - job_name: 'ai-platform-services'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)

    alerting:
      alertmanagers:
        - static_configs:
            - targets: ['alertmanager:9093']

    rule_files:
      - /etc/prometheus/alerts/*.yml
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  ai-platform.yml: |
    groups:
    - name: ai-platform
      rules:
      - alert: HighModelLatency
        expr: histogram_quantile(0.95, rate(model_inference_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High model inference latency"
          description: "P95 latency is {{ $value }}s"

      - alert: ModelServiceDown
        expr: up{job="model-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Model service is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

### 9.3 Deliverables for Phase 8

| Deliverable | Description | Acceptance Criteria |
|-------------|-------------|---------------------|
| K8s Manifests | All services deployed | 99.9% uptime target |
| Helm Charts | Parameterized deployment | Multi-env support |
| CI/CD Pipeline | GitOps with ArgoCD | <15min deploy time |
| Monitoring | Prometheus + Grafana | Full observability |
| Alerting | PagerDuty integration | <5min MTTR |
| Documentation | Runbooks, architecture | Complete operational docs |

---

## 10. Technology Stack Details

### Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Languages** | Python 3.11+, Go 1.21+, TypeScript 5+ | Service development |
| **API Framework** | FastAPI | High-performance async APIs |
| **Web Framework** | React 18 + Vite | Modern UI |
| **Database** | PostgreSQL 16 | Primary data store |
| **Cache** | Redis 7 | Session, cache |
| **Vector DB** | Qdrant | Semantic search |
| **Message Queue** | Redis Streams / RabbitMQ | Task queue |
| **Container** | Docker | Containerization |
| **Orchestration** | Kubernetes 1.28+ | Container orchestration |
| **Service Mesh** | Istio | mTLS, observability |

### ML/AI Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **LLM Runtime** | Ollama, vLLM | Model serving |
| **Embeddings** | sentence-transformers (BGE-M3) | Vector embeddings |
| **Parsing** | Tree-sitter | Multi-language AST |
| **PII Detection** | Microsoft Presidio | GDPR compliance |

### Security Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Secrets** | HashiCorp Vault | Key management |
| **Auth** | OPA, JWT | Authorization |
| **Encryption** | AES-256-GCM | Data encryption |
| **Scanning** | Trivy, Semgrep | Vulnerability detection |

---

## 11. Team Structure

### Recommended Team (15-18 engineers)

| Role | Count | Responsibilities |
|------|-------|------------------|
| **Tech Lead** | 1 | Architecture, technical decisions |
| **Backend Engineers** | 5 | Core services, APIs |
| **ML Engineers** | 3 | LLM integration, RAG, embeddings |
| **Frontend Engineers** | 2 | React UI, UX |
| **DevOps/SRE** | 2 | K8s, CI/CD, monitoring |
| **Security Engineer** | 1 | Security architecture, compliance |
| **QA Engineer** | 1 | Testing, automation |

### Sprint Structure

- **Sprint Duration:** 2 weeks
- **Planning:** Monday of sprint start
- **Daily Standups:** 15 minutes
- **Sprint Review:** Friday of sprint end
- **Retrospective:** Following Monday

---

## 12. Risk Mitigation

### Technical Risks

| Risk | Mitigation | Owner |
|------|------------|-------|
| LLM performance issues | vLLM for inference, GPU optimization | ML Team |
| Data compliance violations | Automated PII detection, audit logging | Security |
| Security vulnerabilities | Regular pen testing, SAST/DAST | Security |
| Scalability bottlenecks | Load testing, auto-scaling | DevOps |
| Integration failures | Contract testing, circuit breakers | Backend |

### Operational Risks

| Risk | Mitigation | Owner |
|------|------------|-------|
| Production incidents | Runbooks, on-call rotation | DevOps |
| Data loss | Multi-region backups, point-in-time recovery | DevOps |
| Key person dependency | Knowledge sharing, documentation | Tech Lead |

---

## Appendix A: API Reference

### Model Service API

```yaml
openapi: 3.0.0
info:
  title: Model Service API
  version: 1.0.0

paths:
  /api/v1/models:
    get:
      summary: List available models
      responses:
        200:
          description: List of models
    post:
      summary: Deploy a new model
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeployModelRequest'

  /api/v1/chat/completions:
    post:
      summary: Chat completion (OpenAI-compatible)
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatRequest'
      responses:
        200:
          description: Chat completion response

components:
  schemas:
    DeployModelRequest:
      type: object
      properties:
        model_id:
          type: string
        source:
          type: string
          enum: [ollama, huggingface]
        config:
          type: object

    ChatRequest:
      type: object
      properties:
        model:
          type: string
        messages:
          type: array
          items:
            $ref: '#/components/schemas/ChatMessage'
        temperature:
          type: number
        max_tokens:
          type: integer
        stream:
          type: boolean
```

---

## Appendix B: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_platform
REDIS_URL=redis://localhost:6379

# Vault
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=s.xxxxxxxx

# LLM
OLLAMA_HOST=http://ollama:11434
HF_TOKEN=hf_xxxxxxxx

# Vector DB
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Security
JWT_SECRET=xxxxxxxx
ENCRYPTION_KEY=xxxxxxxx

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
```

---

**Document Version:** 1.0
**Last Updated:** January 31, 2026
**Authors:** AI Platform Team

