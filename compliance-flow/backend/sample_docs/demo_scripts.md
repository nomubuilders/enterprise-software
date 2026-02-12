# ComplianceFlow Demo Scripts (v2)

Two demos that show **what AI does that dashboards can't**: cross-source reasoning, natural language investigation, and deliverable generation — all running locally.

---

## Demo 1: "Contract vs. Database Cross-Check" (~3 min)

**The pitch**: *"A dashboard shows you what you already know. This AI reads a contract, checks it against your regulatory database, and tells you what's MISSING."*

### Workflow Shape
```
Manual Trigger → Legal Document → PII Redact → PostgreSQL → AI Agent → Chat Interface
```

### Script

| # | You Do | You Say |
|---|--------|---------|
| 1 | Open app, show empty canvas | *"This is ComplianceFlow — everything runs on your machine, no cloud"* |
| 2 | Point at "Local Mode" / "Ollama Connected" badges | *"Ollama running locally, GDPR and AI Act ready out of the box"* |
| 3 | **Open AI Assistant** → type: `"Build me a workflow to cross-check legal documents against our compliance database"` | *"I describe what I need in plain English..."* |
| 4 | Watch AI auto-build workflow on canvas | *"...and the AI builds the pipeline"* |
| 5 | **Drag PII Redact** from sidebar, insert before AI Agent | *"But I want to strip personal data first — drag, drop, connect. That's modularity."* |
| 6 | Click **Legal Document** node → upload `sample_nda.txt` | *"This is a real NDA between a Dutch and Spanish company"* |
| 7 | Click **PostgreSQL** node → enter: `localhost` / `5433` / `compliance_db` / `compliance` / `compliance123` / SSL off | *"Now I connect to our regulatory database"* |
| 8 | Click **Test Connection** → show ✅ | *"Connected"* |
| 9 | Set the query to the one below | *"I'm pulling our regulatory frameworks"* |
| 10 | **Save** both nodes, click **Run** | *"The AI now reads the contract, strips PII, queries the database, and cross-references them"* |
| 11 | Show the Chat Interface output | *"It found that this NDA references GDPR and AI Act — but we're also audited on DORA, which the contract completely misses. No dashboard tells you that."* |

### PostgreSQL Query
```sql
SELECT rf.name, rf.jurisdiction, rf.description,
       co.article, co.obligation_title, co.penalty_max_eur
FROM regulatory_frameworks rf
JOIN compliance_obligations co ON rf.code = co.framework_code
WHERE rf.jurisdiction IN ('EU', 'Netherlands', 'Spain')
ORDER BY co.penalty_max_eur DESC NULLS LAST
LIMIT 20
```

> [!IMPORTANT]
> The magic moment is step 11: the AI reasons across two completely different data sources (unstructured document + structured database) and surfaces a gap. That's impossible with a dashboard.

---

## Demo 2: "Natural Language Compliance Investigator" (~3 min)

**The pitch**: *"Instead of building 20 dashboard views for every possible question, ask the AI anything in plain language."*

### Workflow Shape
```
Manual Trigger → PostgreSQL → AI Agent → Chat Interface
```

### Script

| # | You Do | You Say |
|---|--------|---------|
| 1 | Click **New** (fresh canvas) | *"For the second demo, I want to interrogate our compliance data directly"* |
| 2 | **Drag from sidebar**: PostgreSQL → AI Agent → Chat Interface | *"Three nodes — database, AI, output. That's the whole pipeline."* |
| 3 | **Connect** them with edges | *"Drag to connect"* |
| 4 | Click PostgreSQL → enter credentials → **Test Connection** ✅ | *"Same database, same local connection"* |
| 5 | Set query below (the critical AI systems query) | *"I want to find AI systems that haven't passed conformity assessment"* |
| 6 | **Save**, click **Run** | *"The AI gets the raw data and reasons about it"* |
| 7 | Show Chat Interface output | *"It identified 3 high-risk AI systems without conformity assessment — and explains WHY that's a problem under the EU AI Act. Try getting that from a dashboard."* |
| 8 | Open **AI Assistant** → type: `"Analyze this workflow and suggest improvements"` | *"And the built-in AI Assistant can analyze the workflow itself"* |
| 9 | Show AI's suggestions | *"It suggests adding a PII filter and a spreadsheet export for audit trails — modular improvements I can add with drag and drop"* |

### PostgreSQL Query
```sql
SELECT ais.system_name, ais.risk_level, ais.conformity_status,
       o.name AS deploying_org, ais.purpose,
       o.country, o.compliance_score
FROM ai_systems ais
JOIN organizations o ON ais.organization_id = o.id
WHERE ais.risk_level = 'High'
ORDER BY ais.conformity_status, ais.system_name
```

> [!TIP]
> **Power move**: After step 7, you can **change the query** to something totally different — like the incident query below — and re-run to show how the same 3-node pipeline answers completely different questions. No new dashboard needed.

### Bonus Query: Incident Investigation
```sql
SELECT ci.incident_type, ci.severity, ci.affected_records, ci.root_cause,
       o.name, o.country, rf.name AS regulation
FROM compliance_incidents ci
JOIN organizations o ON ci.organization_id = o.id
JOIN regulatory_frameworks rf ON ci.framework_code = rf.code
WHERE ci.severity IN ('Critical', 'High')
ORDER BY ci.incident_date DESC
```

---

## Quick Reference

| What | Where |
|------|-------|
| **App** | [http://localhost:5173](http://localhost:5173) |
| **DB Credentials** | `localhost` / `5433` / `compliance_db` / `compliance` / `compliance123` / SSL off |
| **Sample NDA** | `backend/sample_docs/sample_nda.txt` |
| **AI Model** | `qwen3:8b` (local, via Ollama — best for cross-referencing) |

### AI Assistant Trigger Phrases
| What you type | What happens |
|---------------|-------------|
| `"Build me a workflow to..."` | Auto-builds workflow on canvas |
| `"Analyze this workflow and suggest improvements"` | Smart suggestions for current workflow |
| `"What compliance risks does this workflow address?"` | Informational AI response |
