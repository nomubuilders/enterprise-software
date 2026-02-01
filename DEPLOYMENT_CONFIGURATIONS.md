# Production Deployment Configurations and Infrastructure Patterns

## Quick Reference: Database Selection Guide

### Scale-Based Selection

```
<10M vectors:        pgvector (PostgreSQL) or ChromaDB
10-100M vectors:     Qdrant or Weaviate
100M-1B vectors:     Qdrant with sharding or Milvus
1B+ vectors:         Milvus (with data engineering team)
```

### Feature-Based Selection

| Need | Recommended |
|------|---|
| Fastest time-to-value | ChromaDB |
| Hybrid search (vector + keyword) | Weaviate |
| Lowest operational overhead | Qdrant |
| Billion-scale performance | Milvus |
| Integrated with PostgreSQL | pgvector |
| Graph relationships | Weaviate |

---

## 1. DOCKER DEPLOYMENT CONFIGURATIONS

### 1.1 Docker Compose - Development Setup

```yaml
version: '3.8'

services:
  # Qdrant Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
      - ./qdrant_config.yaml:/qdrant/config.yaml
    environment:
      QDRANT_API_KEY: ${QDRANT_API_KEY:-default_key}
    networks:
      - rag_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg15
    container_name: postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: rag_db
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
    volumes:
      - postgres_storage:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - rag_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO S3-Compatible Storage
  minio:
    image: minio/minio:latest
    container_name: minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-minioadmin}
    volumes:
      - minio_storage:/data
    command: server /data --console-address ":9001"
    networks:
      - rag_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # Embedding Service (FastEmbed for speed)
  embedding-service:
    build:
      context: .
      dockerfile: ./docker/Dockerfile.embedding
    container_name: embedding-service
    ports:
      - "8001:8001"
    environment:
      MODEL_NAME: BAAI/bge-m3
      DEVICE: cpu  # Use 'cuda' if GPU available
      PORT: 8001
      LOG_LEVEL: INFO
    volumes:
      - embedding_cache:/root/.cache
    networks:
      - rag_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis for Caching
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_storage:/data
    command: redis-server --appendonly yes
    networks:
      - rag_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # RAG API Service
  rag-api:
    build:
      context: .
      dockerfile: ./docker/Dockerfile.api
    container_name: rag-api
    ports:
      - "8000:8000"
    environment:
      QDRANT_HOST: qdrant
      QDRANT_PORT: 6333
      QDRANT_API_KEY: ${QDRANT_API_KEY:-default_key}
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: rag_db
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      MINIO_HOST: minio
      MINIO_PORT: 9000
      MINIO_USER: ${MINIO_USER:-minioadmin}
      MINIO_PASSWORD: ${MINIO_PASSWORD:-minioadmin}
      EMBEDDING_SERVICE_URL: http://embedding-service:8001
      REDIS_URL: redis://redis:6379
      LOG_LEVEL: INFO
      WORKERS: 4
    depends_on:
      qdrant:
        condition: service_healthy
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
      embedding-service:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - rag_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Load Balancer & Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - rag-api
    networks:
      - rag_network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  qdrant_storage:
  postgres_storage:
  minio_storage:
  redis_storage:
  embedding_cache:

networks:
  rag_network:
    driver: bridge
```

### 1.2 Environment Variables (.env)

```env
# Qdrant Configuration
QDRANT_API_KEY=your_secure_api_key_here

# PostgreSQL Configuration
DB_USER=postgres
DB_PASSWORD=secure_postgres_password

# MinIO Configuration
MINIO_USER=minioadmin
MINIO_PASSWORD=secure_minio_password

# API Configuration
API_WORKERS=4
LOG_LEVEL=INFO

# Model Configuration
EMBEDDING_MODEL=BAAI/bge-m3
LLM_MODEL=claude-3-5-sonnet-20241022

# Performance
CACHE_TTL=3600
MAX_QUERY_TOKENS=8000
```

---

## 2. KUBERNETES DEPLOYMENT

### 2.1 Qdrant StatefulSet

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: qdrant-config
spec:
  qdrant.yaml: |
    server:
      http_port: 6333
      grpc_port: 6334
      max_request_size_mb: 200
    storage:
      snapshots_path: ./snapshots
      wal:
        wal_capacity_mb: 200
        wal_segments_ahead: 0
    cluster:
      enabled: true
      consensus:
        tick_period_ms: 100
      tick_period_ms: 100

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: qdrant
spec:
  serviceName: qdrant
  replicas: 3
  selector:
    matchLabels:
      app: qdrant
  template:
    metadata:
      labels:
        app: qdrant
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: qdrant
        image: qdrant/qdrant:latest
        ports:
        - name: http
          containerPort: 6333
        - name: grpc
          containerPort: 6334
        resources:
          requests:
            cpu: "4"
            memory: "16Gi"
          limits:
            cpu: "8"
            memory: "32Gi"
        volumeMounts:
        - name: storage
          mountPath: /qdrant/storage
        - name: config
          mountPath: /qdrant/config.yaml
          subPath: qdrant.yaml
        livenessProbe:
          httpGet:
            path: /health
            port: 6333
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readiness
            port: 6333
          initialDelaySeconds: 10
          periodSeconds: 5
        env:
        - name: QDRANT_API_KEY
          valueFrom:
            secretKeyRef:
              name: qdrant-secrets
              key: api-key
      volumes:
      - name: config
        configMap:
          name: qdrant-config
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd

---
apiVersion: v1
kind: Service
metadata:
  name: qdrant
spec:
  clusterIP: None
  selector:
    app: qdrant
  ports:
  - name: http
    port: 6333
  - name: grpc
    port: 6334

---
apiVersion: v1
kind: Service
metadata:
  name: qdrant-lb
spec:
  type: LoadBalancer
  selector:
    app: qdrant
  ports:
  - name: http
    port: 6333
    targetPort: 6333
  - name: grpc
    port: 6334
    targetPort: 6334
```

### 2.2 RAG API Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rag-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: rag-api
  template:
    metadata:
      labels:
        app: rag-api
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - rag-api
              topologyKey: kubernetes.io/hostname
      containers:
      - name: rag-api
        image: rag-api:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 8000
        resources:
          requests:
            cpu: "2"
            memory: "8Gi"
            nvidia.com/gpu: "1"
          limits:
            cpu: "4"
            memory: "16Gi"
            nvidia.com/gpu: "1"
        env:
        - name: QDRANT_HOST
          value: "qdrant-lb"
        - name: QDRANT_PORT
          value: "6333"
        - name: POSTGRES_HOST
          value: "postgres"
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: LOG_LEVEL
          value: "INFO"
        - name: WORKERS
          value: "4"
        volumeMounts:
        - name: logs
          mountPath: /app/logs
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
      volumes:
      - name: logs
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: rag-api
spec:
  type: LoadBalancer
  selector:
    app: rag-api
  ports:
  - name: http
    port: 80
    targetPort: 8000
    protocol: TCP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rag-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rag-api
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

---

## 3. NGINX CONFIGURATION

### 3.1 nginx.conf - Load Balancing and Reverse Proxy

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 10000;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50m;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=embedding_limit:10m rate=50r/s;

    # Upstream backends with load balancing
    upstream rag_api_backend {
        least_conn;
        server rag-api:8000 weight=1 max_fails=3 fail_timeout=30s;
        server rag-api-2:8000 weight=1 max_fails=3 fail_timeout=30s;
        server rag-api-3:8000 weight=1 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream embedding_backend {
        least_conn;
        server embedding-service:8001 weight=1 max_fails=3 fail_timeout=30s;
        keepalive 16;
    }

    # HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main API server
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://rag_api_backend;
            proxy_connect_timeout 5s;
            proxy_read_timeout 5s;
        }

        # API endpoints
        location /api/v1/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://rag_api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }

        # Embedding endpoint
        location /api/v1/embed {
            limit_req zone=embedding_limit burst=10 nodelay;

            proxy_pass http://embedding_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            proxy_connect_timeout 10s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Vector DB endpoint (Qdrant)
        location /qdrant/ {
            proxy_pass http://qdrant-lb:6333/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

---

## 4. MONITORING AND LOGGING

### 4.1 Prometheus Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
  - static_configs:
    - targets: ['alertmanager:9093']

scrape_configs:
  # RAG API metrics
  - job_name: 'rag-api'
    static_configs:
      - targets: ['rag-api:8000']
    metrics_path: '/metrics'

  # Vector DB metrics
  - job_name: 'qdrant'
    static_configs:
      - targets: ['qdrant:6333']
    metrics_path: '/metrics'

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### 4.2 Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "RAG Pipeline Monitoring",
    "panels": [
      {
        "title": "Query Latency (p50, p95, p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(rag_query_duration_seconds_bucket[5m]))"
          },
          {
            "expr": "histogram_quantile(0.95, rate(rag_query_duration_seconds_bucket[5m]))"
          },
          {
            "expr": "histogram_quantile(0.99, rate(rag_query_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Queries Per Second",
        "targets": [
          {
            "expr": "rate(rag_queries_total[1m])"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(rag_cache_hits_total[5m]) / (rate(rag_cache_hits_total[5m]) + rate(rag_cache_misses_total[5m]))"
          }
        ]
      },
      {
        "title": "Vector DB Memory Usage",
        "targets": [
          {
            "expr": "qdrant_memory_usage_bytes"
          }
        ]
      },
      {
        "title": "Indexing Progress",
        "targets": [
          {
            "expr": "qdrant_indexed_vectors_total"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(rag_errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### 4.3 Alert Rules (alert.rules.yml)

```yaml
groups:
  - name: rag_alerts
    rules:
      - alert: HighQueryLatency
        expr: histogram_quantile(0.99, rate(rag_query_duration_seconds_bucket[5m])) > 2
        for: 5m
        annotations:
          summary: "High query latency (p99 > 2s)"

      - alert: VectorDBDown
        expr: up{job="qdrant"} == 0
        for: 1m
        annotations:
          summary: "Qdrant vector database is down"

      - alert: HighErrorRate
        expr: rate(rag_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Error rate > 5%"

      - alert: LowCacheHitRate
        expr: |
          rate(rag_cache_hits_total[5m]) /
          (rate(rag_cache_hits_total[5m]) + rate(rag_cache_misses_total[5m])) < 0.2
        for: 10m
        annotations:
          summary: "Cache hit rate < 20%"

      - alert: IndexingBacklog
        expr: qdrant_pending_indexed_vectors > 1000000
        for: 15m
        annotations:
          summary: "Large indexing backlog (>1M vectors)"
```

---

## 5. PERFORMANCE TUNING PARAMETERS

### 5.1 Qdrant Optimization

```yaml
# For query-heavy workloads
qdrant_config:
  vector_size: 1024
  distance: "Cosine"
  hnsw_config:
    m: 16
    ef_construct: 200
    ef_search: 40
    max_indexing_threads: 8
  quantization:
    scalar:
      type: int8
      quantile: 0.99

# For write-heavy workloads
  wal_config:
    wal_capacity_mb: 500
    wal_segments_ahead: 10

# For large datasets
  storage:
    snapshots_path: /mnt/fast_ssd/snapshots
    wal_path: /mnt/fast_nvme/wal
```

### 5.2 PostgreSQL Tuning

```sql
-- For RAG workload optimization
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET shared_buffers = '16GB';
ALTER SYSTEM SET effective_cache_size = '48GB';
ALTER SYSTEM SET maintenance_work_mem = '4GB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- pgvector specific
ALTER SYSTEM SET hnsw.ef_construction = 200;
ALTER SYSTEM SET hnsw.ef_search = 40;

-- Connection pooling (use PgBouncer)
CREATE USER pgbouncer;
```

### 5.3 PgBouncer Configuration

```ini
[databases]
rag_db = host=postgres port=5432 dbname=rag_db

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
```

---

## 6. SCALING CHECKLIST

### Phase 1: Development (<10M vectors)
- [ ] Single Qdrant instance
- [ ] PostgreSQL local instance
- [ ] MinIO single node
- [ ] Single RAG API instance
- [ ] Redis for caching

### Phase 2: Pre-Production (10M-100M vectors)
- [ ] Qdrant cluster (3 nodes)
- [ ] PostgreSQL with streaming replication
- [ ] MinIO cluster (3 nodes)
- [ ] RAG API with load balancing (3 instances)
- [ ] Redis with Sentinel for HA

### Phase 3: Production (100M-1B vectors)
- [ ] Qdrant distributed (5+ nodes with sharding)
- [ ] PostgreSQL with streaming + hot standby
- [ ] MinIO multi-datacenter replication
- [ ] RAG API auto-scaling (5-20 instances)
- [ ] Redis cluster mode
- [ ] Dedicated GPU nodes for embeddings

### Phase 4: Enterprise (1B+ vectors)
- [ ] Milvus distributed deployment
- [ ] PostgreSQL per-region replication
- [ ] MinIO geo-replication
- [ ] Regional RAG API deployments
- [ ] Multi-region caching (Redis + CDN)
- [ ] Dedicated hardware for search optimization

---

## 7. COST OPTIMIZATION

### On-Premises (Fixed Cost)
```
Hardware:
  Server nodes (3x):        $5,000 each = $15,000
  Storage (50TB):           $10,000
  Networking:               $5,000
  Total 1st year:           $30,000 + operating costs

Annual operating:
  Power & cooling:          $5,000
  Network:                  $3,000
  Staff (2 FTE):            $200,000
```

### Cloud (Variable Cost)
```
Storage (1TB vectors):      $30/month
Compute (5 instances):      $1,000/month
Data transfer:              $200/month
Total monthly:              ~$1,200
Annual:                     ~$14,400
```

### Cost Optimization Strategies

1. **Dimension Reduction**: 1024 → 384D = 4x memory savings
2. **Quantization**: 8-bit vs 32-bit = 4x storage reduction
3. **Caching**: Redis cache = 60-80% hit rate, 10x cost reduction
4. **Batch Processing**: Off-peak indexing saves compute
5. **Data Tiering**: Hot data (RAM), warm (SSD), cold (HDD)

---

## References

- [Qdrant Kubernetes Deployment](https://qdrant.tech/documentation/deployment/)
- [Milvus Kubernetes Installation](https://milvus.io/docs/install_cluster-milvusoperator.md)
- [PostgreSQL HA Best Practices](https://www.postgresql.org/docs/current/warm-standby-failover.html)
- [Nginx Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
