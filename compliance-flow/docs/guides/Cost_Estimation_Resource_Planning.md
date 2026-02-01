# Enterprise AI Infrastructure Platform
## Cost Estimation & Resource Planning

**Version:** 1.0
**Date:** January 31, 2026

---

## Executive Summary

| Category | Year 1 Cost | Ongoing (Year 2+) |
|----------|------------|-------------------|
| **Personnel** | $2,400,000 - $3,200,000 | $2,640,000 - $3,520,000 |
| **Infrastructure** | $180,000 - $350,000 | $120,000 - $250,000 |
| **Software/Licenses** | $85,000 - $150,000 | $70,000 - $130,000 |
| **External Services** | $150,000 - $300,000 | $50,000 - $100,000 |
| **Contingency (15%)** | $420,000 - $600,000 | $430,000 - $600,000 |
| **Total** | **$3,235,000 - $4,600,000** | **$3,310,000 - $4,600,000** |

---

## 1. Personnel Costs

### 1.1 Core Team (15-18 FTEs)

| Role | Count | Annual Salary (USD) | Total Annual | Loaded Cost (1.3x) |
|------|-------|-------------------|--------------|-------------------|
| **Tech Lead / Architect** | 1 | $200,000 - $250,000 | $200,000 - $250,000 | $260,000 - $325,000 |
| **Senior Backend Engineer** | 3 | $160,000 - $200,000 | $480,000 - $600,000 | $624,000 - $780,000 |
| **Backend Engineer** | 2 | $130,000 - $160,000 | $260,000 - $320,000 | $338,000 - $416,000 |
| **Senior ML Engineer** | 2 | $180,000 - $220,000 | $360,000 - $440,000 | $468,000 - $572,000 |
| **ML Engineer** | 1 | $140,000 - $170,000 | $140,000 - $170,000 | $182,000 - $221,000 |
| **Senior Frontend Engineer** | 1 | $150,000 - $180,000 | $150,000 - $180,000 | $195,000 - $234,000 |
| **Frontend Engineer** | 1 | $120,000 - $150,000 | $120,000 - $150,000 | $156,000 - $195,000 |
| **DevOps/SRE** | 2 | $150,000 - $180,000 | $300,000 - $360,000 | $390,000 - $468,000 |
| **Security Engineer** | 1 | $160,000 - $200,000 | $160,000 - $200,000 | $208,000 - $260,000 |
| **QA Engineer** | 1 | $100,000 - $130,000 | $100,000 - $130,000 | $130,000 - $169,000 |

**Personnel Subtotal:** $2,400,000 - $3,200,000 (Year 1)

*Note: Loaded cost includes benefits, payroll taxes, equipment, and overhead (30%)*

### 1.2 Optional/Scaling Team

| Role | When Needed | Annual Cost (Loaded) |
|------|-------------|---------------------|
| Product Manager | Phase 2+ | $195,000 - $260,000 |
| Technical Writer | Phase 6+ | $117,000 - $156,000 |
| Data Engineer | Phase 5+ | $182,000 - $234,000 |
| Additional ML Engineer | Scale-up | $182,000 - $234,000 |

### 1.3 Hiring Timeline

```
Month:  1    2    3    4    5    6    7    8    9    10
        |----|----|----|----|----|----|----|----|----|----|
Hire    5    3    2    2    2    1    0    0    0    0    (15 total)
        └─Core─┘  └Backend┘ └─ML─┘  Sec
```

| Month | Hires | Roles |
|-------|-------|-------|
| 1 | 5 | Tech Lead, 2 Backend, 1 DevOps, 1 Frontend |
| 2 | 3 | 2 Backend, 1 DevOps |
| 3 | 2 | 1 ML Engineer, 1 Frontend |
| 4 | 2 | 2 ML Engineers |
| 5 | 2 | 1 Backend, 1 QA |
| 6 | 1 | 1 Security Engineer |

---

## 2. Infrastructure Costs

### 2.1 On-Premises Hardware (One-Time)

#### Production Environment

| Component | Specifications | Qty | Unit Cost | Total |
|-----------|---------------|-----|-----------|-------|
| **GPU Servers** | Dell R750xa, 2x NVIDIA A100 80GB, 1TB RAM | 3 | $85,000 | $255,000 |
| **Application Servers** | Dell R660, 64-core Xeon, 256GB RAM | 4 | $15,000 | $60,000 |
| **Database Server** | Dell R760, 96-core, 512GB RAM, NVMe RAID | 2 | $25,000 | $50,000 |
| **Storage Array** | Dell PowerScale, 100TB NVMe | 1 | $80,000 | $80,000 |
| **Network Switch** | Cisco Nexus 9300, 100GbE | 2 | $15,000 | $30,000 |
| **Load Balancer** | F5 BIG-IP i4800 | 1 | $25,000 | $25,000 |

**Production Hardware Total:** $500,000

#### Development/Staging Environment

| Component | Specifications | Qty | Unit Cost | Total |
|-----------|---------------|-----|-----------|-------|
| **GPU Server** | RTX 4090 x4, 128GB RAM | 1 | $15,000 | $15,000 |
| **App Server** | 32-core, 128GB RAM | 2 | $8,000 | $16,000 |
| **Storage** | 20TB NVMe NAS | 1 | $10,000 | $10,000 |

**Dev/Staging Hardware Total:** $41,000

#### Total Hardware (On-Prem)

| Environment | One-Time Cost | Annual Maintenance (15%) |
|-------------|--------------|-------------------------|
| Production | $500,000 | $75,000 |
| Dev/Staging | $41,000 | $6,150 |
| **Total** | **$541,000** | **$81,150** |

### 2.2 Cloud/Hybrid Alternative (Monthly)

*For customers preferring cloud infrastructure:*

| Service | Provider | Configuration | Monthly Cost |
|---------|----------|--------------|--------------|
| **GPU Compute** | AWS p4d.24xlarge | 2 instances, reserved | $24,000 |
| **Kubernetes** | EKS | 10 m6i.4xlarge nodes | $4,500 |
| **Database** | RDS PostgreSQL | db.r6g.2xlarge, Multi-AZ | $2,400 |
| **Redis** | ElastiCache | r6g.xlarge, cluster | $800 |
| **Storage** | S3 + EBS | 50TB | $1,500 |
| **Networking** | VPC, NAT, LB | Standard | $500 |

**Cloud Monthly Total:** ~$33,700/month = **$404,400/year**

### 2.3 Infrastructure Cost Comparison

| Model | Year 1 | Year 2 | Year 3 | 3-Year TCO |
|-------|--------|--------|--------|------------|
| **On-Premises** | $622,000 | $81,000 | $81,000 | $784,000 |
| **Cloud** | $404,400 | $404,400 | $404,400 | $1,213,200 |
| **Hybrid** | $300,000 | $200,000 | $200,000 | $700,000 |

**Recommendation:** On-premises for cost efficiency, Hybrid for flexibility

---

## 3. Software & Licensing

### 3.1 Open Source (No Cost)

| Software | Purpose | License |
|----------|---------|---------|
| PostgreSQL 16 | Primary database | PostgreSQL License |
| Redis 7 | Cache/Queue | BSD-3 |
| Qdrant | Vector database | Apache 2.0 |
| Ollama | LLM runtime | MIT |
| vLLM | Inference engine | Apache 2.0 |
| FastAPI | API framework | MIT |
| React | Frontend | MIT |
| Kong OSS | API Gateway | Apache 2.0 |
| Prometheus/Grafana | Monitoring | Apache 2.0 |
| Kubernetes | Orchestration | Apache 2.0 |

### 3.2 Commercial Licenses

| Software | Purpose | Annual Cost |
|----------|---------|-------------|
| **HashiCorp Vault Enterprise** | Secret management + HSM | $50,000 - $100,000 |
| **Semgrep Team** | SAST (optional, OSS available) | $15,000 - $30,000 |
| **Datadog** | Monitoring (optional) | $20,000 - $50,000 |
| **JetBrains All Products** | IDE licenses (15 devs) | $4,500 |
| **GitHub Enterprise** | Source control | $5,000 - $10,000 |
| **Figma Enterprise** | Design collaboration | $1,200 |
| **Confluence/Jira** | Project management | $5,000 - $10,000 |
| **Snyk** | Dependency scanning | $10,000 - $20,000 |

**Software/Licensing Range:** $85,000 - $150,000/year

### 3.3 Cost-Optimized Stack (All OSS)

| Paid Software | OSS Alternative | Savings |
|---------------|----------------|---------|
| Vault Enterprise | Vault OSS | $50,000+ |
| Semgrep Team | Semgrep OSS | $15,000+ |
| Datadog | Prometheus/Grafana | $20,000+ |
| Snyk | Trivy + Grype | $10,000+ |

**Minimum Software Cost (All OSS):** ~$15,000/year (IDE + PM tools only)

---

## 4. External Services

### 4.1 Security & Compliance

| Service | Purpose | Cost |
|---------|---------|------|
| **Penetration Testing** | Annual security audit | $30,000 - $50,000 |
| **SOC 2 Audit** | Compliance certification | $30,000 - $60,000 |
| **ISO 27001 Certification** | Security certification | $20,000 - $40,000 |
| **Legal Review** | GDPR/AI Act compliance | $20,000 - $40,000 |

**Security/Compliance Total:** $100,000 - $190,000 (Year 1)
**Ongoing (Year 2+):** $30,000 - $50,000

### 4.2 External Consultants

| Service | When | Cost |
|---------|------|------|
| **AI/ML Architecture Review** | Month 2 | $15,000 - $30,000 |
| **Security Architecture Review** | Month 6 | $15,000 - $25,000 |
| **Performance Optimization** | Month 9 | $10,000 - $20,000 |
| **Kubernetes Expert** | As needed | $200/hour |

**Consulting Total:** $50,000 - $100,000 (Year 1)

### 4.3 Training & Development

| Item | Cost |
|------|------|
| **Conference Attendance** (5 engineers) | $15,000 |
| **Online Training** (Pluralsight, Coursera) | $5,000 |
| **Books & Resources** | $2,000 |
| **Certifications** (K8s, AWS, etc.) | $8,000 |

**Training Total:** $30,000/year

---

## 5. Detailed Budget by Phase

### Phase 1: Core Platform (Months 1-3)

| Category | Cost |
|----------|------|
| Personnel (8 FTEs x 3 months) | $520,000 |
| Infrastructure Setup | $100,000 |
| Software Licenses | $20,000 |
| **Phase 1 Total** | **$640,000** |

### Phase 2: LLM Integration (Months 2-4)

| Category | Cost |
|----------|------|
| Personnel (12 FTEs x 3 months) | $680,000 |
| GPU Hardware | $255,000 |
| ML Compute (cloud burst) | $30,000 |
| **Phase 2 Total** | **$965,000** |

### Phase 3: Data Integration (Months 3-5)

| Category | Cost |
|----------|------|
| Personnel (14 FTEs x 3 months) | $720,000 |
| Database Licenses | $15,000 |
| Connector Development | $20,000 |
| **Phase 3 Total** | **$755,000** |

### Phase 4-5: Code Analysis + Vector Search (Months 4-7)

| Category | Cost |
|----------|------|
| Personnel (15 FTEs x 4 months) | $1,000,000 |
| Vector DB Infrastructure | $30,000 |
| **Phase 4-5 Total** | **$1,030,000** |

### Phase 6-7: Compliance + Security (Months 6-9)

| Category | Cost |
|----------|------|
| Personnel (15 FTEs x 4 months) | $1,000,000 |
| Security Audit | $50,000 |
| Compliance Certification | $80,000 |
| Vault Enterprise | $50,000 |
| **Phase 6-7 Total** | **$1,180,000** |

### Phase 8: Production (Months 8-10)

| Category | Cost |
|----------|------|
| Personnel (15 FTEs x 3 months) | $750,000 |
| Production Infrastructure | $200,000 |
| Load Testing | $20,000 |
| **Phase 8 Total** | **$970,000** |

---

## 6. Resource Utilization

### 6.1 GPU Resource Planning

| Model | VRAM Required | Concurrent Users | GPUs Needed |
|-------|--------------|------------------|-------------|
| Llama 3.2 7B (4-bit) | 6 GB | 50 | 1 |
| Llama 3.2 70B (4-bit) | 40 GB | 20 | 1 A100 |
| Mistral 7B | 6 GB | 50 | 1 |
| CodeLlama 34B (4-bit) | 20 GB | 30 | 1 |
| Embedding (BGE-M3) | 4 GB | 100 | 1 |

**Recommended GPU Configuration:**
- Production: 3x A100 80GB (redundancy + capacity)
- Development: 2x RTX 4090

### 6.2 Storage Planning

| Data Type | Year 1 | Year 2 | Year 3 |
|-----------|--------|--------|--------|
| Models | 2 TB | 4 TB | 6 TB |
| Vector Embeddings | 500 GB | 2 TB | 5 TB |
| Documents | 5 TB | 15 TB | 30 TB |
| Audit Logs | 1 TB | 3 TB | 6 TB |
| Backups | 8 TB | 24 TB | 47 TB |
| **Total** | **16.5 TB** | **48 TB** | **94 TB** |

### 6.3 Network Bandwidth

| Use Case | Bandwidth Requirement |
|----------|----------------------|
| LLM Inference (50 users) | 100 Mbps |
| Document Ingestion | 500 Mbps burst |
| Model Downloads | 1 Gbps burst |
| Inter-service | 10 Gbps |

**Recommendation:** 10 Gbps backbone, 1 Gbps edge

---

## 7. Cost Optimization Strategies

### 7.1 Quick Wins

| Strategy | Savings | Impact |
|----------|---------|--------|
| Use OSS stack | $100,000+/year | Medium - requires more DevOps |
| Spot instances for batch | 70% GPU costs | Low - batch workloads only |
| Reserved instances | 30-40% compute | Low - commit to 1-3 years |
| Right-size VMs | 20-30% | Low - ongoing optimization |

### 7.2 Quantization Savings

| Model | Full Precision | 4-bit Quantized | Memory Savings |
|-------|---------------|-----------------|----------------|
| Llama 70B | 140 GB | 35 GB | 75% |
| Mistral 7B | 14 GB | 4 GB | 71% |

**Impact:** Run larger models on fewer/smaller GPUs

### 7.3 Phased GPU Investment

| Phase | GPU Investment | Use Case |
|-------|---------------|----------|
| Month 1-3 | Cloud GPU ($5K/mo) | Development |
| Month 4-6 | 1x A100 ($30K) | Production MVP |
| Month 7-10 | 2x A100 ($60K) | Full production |
| Year 2 | Scale as needed | Growth |

**Savings vs. Day 1 purchase:** $50,000+

---

## 8. ROI Analysis

### 8.1 Cost per User

| Users | Year 1 Cost | Cost/User/Month |
|-------|------------|-----------------|
| 100 | $3,500,000 | $2,917 |
| 500 | $3,700,000 | $617 |
| 1,000 | $4,000,000 | $333 |
| 5,000 | $5,000,000 | $83 |

*Economies of scale significantly reduce per-user costs*

### 8.2 Break-Even Analysis

**Assumptions:**
- Typical SaaS AI platform: $50-200/user/month
- Self-hosted eliminates ongoing SaaS fees
- Data sovereignty eliminates compliance risk costs

| Comparison | SaaS (500 users) | Self-Hosted |
|------------|-----------------|-------------|
| Year 1 | $600,000 | $3,700,000 |
| Year 2 | $1,200,000 | $1,200,000 |
| Year 3 | $1,800,000 | $1,200,000 |
| **3-Year Total** | **$3,600,000** | **$6,100,000** |
| Year 5 | $3,000,000 | $1,200,000 |
| **5-Year Total** | **$6,000,000** | **$7,500,000** |

**Break-even:** ~7 years at 500 users

**Note:** ROI improves significantly with:
- Higher user counts (5,000+ users = 3-year break-even)
- Regulated industries (avoided compliance penalties)
- Data sovereignty requirements (priceless)

---

## 9. Budget Summary

### Year 1 Budget

| Category | Low Estimate | High Estimate |
|----------|-------------|---------------|
| Personnel | $2,400,000 | $3,200,000 |
| Infrastructure | $180,000 | $350,000 |
| Software/Licenses | $85,000 | $150,000 |
| External Services | $150,000 | $300,000 |
| **Subtotal** | $2,815,000 | $4,000,000 |
| Contingency (15%) | $420,000 | $600,000 |
| **Total Year 1** | **$3,235,000** | **$4,600,000** |

### Ongoing Annual (Year 2+)

| Category | Low Estimate | High Estimate |
|----------|-------------|---------------|
| Personnel (with raises) | $2,640,000 | $3,520,000 |
| Infrastructure Maintenance | $120,000 | $250,000 |
| Software/Licenses | $70,000 | $130,000 |
| External Services | $50,000 | $100,000 |
| **Subtotal** | $2,880,000 | $4,000,000 |
| Contingency (15%) | $430,000 | $600,000 |
| **Total Ongoing** | **$3,310,000** | **$4,600,000** |

---

## 10. Funding Phases

### Seed/Series A Requirements

| Phase | Duration | Funding Needed |
|-------|----------|----------------|
| Phase 1 (MVP) | 3 months | $700,000 |
| Phase 2-3 | 3 months | $1,200,000 |
| **Seed Total** | 6 months | **$1,900,000** |

### Series B Requirements

| Phase | Duration | Funding Needed |
|-------|----------|----------------|
| Phase 4-6 | 4 months | $1,500,000 |
| Phase 7-8 | 4 months | $1,200,000 |
| **Series B Total** | 8 months | **$2,700,000** |

---

**Document Version:** 1.0
**Last Updated:** January 31, 2026
