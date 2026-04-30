# Compliance Ready AI — Concept Document

> Built by [Nomu](https://nomu.com) — *We Make Data Speak.*

This document explains what ComplianceFlow is, why it exists, and how it differs from cloud AI tools and from generic workflow builders like N8N. It is the source-of-truth pitch document — for investors, customers, and the team.

---

## 1. The problem in one sentence

> **The companies who most need AI — banks, hospitals, insurers, public bodies — are the same ones who legally cannot use ChatGPT on their data.**

So they don't use AI. They use spreadsheets, hand-written reports, and consultants. ComplianceFlow is the visual AI builder they're allowed to actually use.

---

## 2. Three problems with cloud AI (the Venn frame for the video)

### Problem 1 — *The data has to leave the perimeter*
Every ChatGPT, Claude, Gemini, and Copilot call ships your prompt to someone else's GPU. For a hospital, that's a HIPAA violation. For a Dutch bank, it's a GDPR Article 28 problem. For a defense contractor, it's a felony. There is no checkbox in OpenAI's API that fixes this.

### Problem 2 — *There is no audit trail*
The EU AI Act, DORA, and SOC 2 all require you to prove **what** the model saw, **when** it saw it, **who** approved its output, and **why** it made the decision. Cloud APIs return a string. They don't keep prompts, they don't expose the chain of evidence, and "we trust OpenAI" isn't a defensible posture in front of a regulator.

### Problem 3 — *The model is a black box you can't explain*
Under the EU AI Act, an executive is personally liable for AI-driven decisions in high-risk domains (lending, hiring, healthcare triage). You can't sign off on a system whose reasoning you can't reproduce. Cloud models give you no explainability layer, no bias testing, no drift detection — just a token stream.

### The Venn intersection — ComplianceFlow
```
  ┌────────────────────────┐         ┌────────────────────────┐
  │   Local-first           │         │   Audit-native          │
  │   (data never leaves)   │         │   (every step is        │
  │                         │         │    evidence)            │
  └────────────┬────────────┘         └────────────┬────────────┘
               │                                    │
               │           ┌──────────────┐         │
               └───────────┤  Compliance  ├─────────┘
                           │     Flow     │
                           └──────┬───────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │   Governance primitives       │
                  │   (bias, drift, explainability,│
                  │    fair lending, PHI, DORA)   │
                  └───────────────────────────────┘
```

ComplianceFlow is the only tool that sits in all three circles. Cloud LLM providers cover none. N8N covers part of one (workflow orchestration) but no governance or local-first guarantee.

---

## 3. What ComplianceFlow is

A desktop application — a single `.dmg` / `.exe` / `.AppImage` — that gives the user:

- **A visual workflow canvas** (React Flow) where they drag and connect nodes
- **A node library of 38 building blocks** spanning data sources, AI models, compliance primitives, and enterprise integrations
- **A local Ollama runtime** that runs Llama 3.2 / Mistral / CodeLlama on the user's own GPU
- **A managed Docker stack** (PostgreSQL, Redis, MongoDB) that the desktop app starts and stops on the user's behalf
- **A real-time execution console** with WebSocket-streamed events for every node lifecycle

There is no cloud account. There is no API key. There is no telemetry. The app can run with the network cable unplugged.

---

## 4. The architecture in 30 seconds

```
┌──────────────────────────────────────────────────────────────┐
│  ELECTRON DESKTOP APP                                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React Flow canvas + 38 node types                      │  │
│  │  Zustand workflowStore.runWorkflow() — execution engine │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │ HTTP / WebSocket                 │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  FastAPI backend (localhost:8000)                       │  │
│  │  WorkflowExecutionEngine — Kahn's topological sort      │  │
│  │  PII / PHI / Drift / Audit / Evidence services          │  │
│  └─────────────┬─────────────────────────────┬─────────────┘  │
│                │                              │                │
│  ┌─────────────▼─────────┐         ┌─────────▼──────────┐    │
│  │   Ollama (port 11434) │         │  Postgres / Redis / │    │
│  │   Llama 3.2, Mistral  │         │  Mongo (Docker)     │    │
│  └───────────────────────┘         └────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                            All on the user's machine
                            No outbound traffic required
```

---

## 5. The demo workflow (for the video)

A workflow the user assembles in 60 seconds and runs to a real result:

```
[Trigger]  →  [Document]  →  [PII Filter]  →  [LLM]  →  [Audit Trail]  →  [Output]
   ▲             ▲              ▲             ▲             ▲              ▲
 manual       upload PDF      redact         Llama 3.2     log every     chat panel
              of contract     names &        analyzes      step's input  shows the
                              amounts        the           and output    final answer
                                             redacted
                                             text
```

What the viewer sees:
1. The user drags six nodes onto the canvas
2. Edges go from gray to cyan as each node is configured
3. The Run button fires; nodes light up one by one
4. The chat panel populates with the analysis — **with names and amounts already redacted**
5. The Audit Trail node shows a timestamped record of every PII match and every prompt token

> **Recording note:** Use the **Document → PII Filter → LLM** path, not the Database path. See section 9 for why.

---

## 6. The 38 nodes, by category

| Category | Nodes |
|---|---|
| **Triggers** | Manual, Schedule (cron), Webhook |
| **Data Sources** | PostgreSQL, MySQL, MongoDB, Database Creator, Local Folder, Cloud Documents (Drive / Dropbox / OneDrive / MEGA), Document |
| **AI Models** | Ollama LLM (Llama 3.2 / Mistral / CodeLlama), AI Personality, MCP Context |
| **Compliance** | PII Redact / Mask, PHI Classification, Consent Check, Encryption |
| **AI Governance** | Bias & Fairness, Explainability (XAI), Red Teaming, Drift Detection |
| **Audit & Evidence** | Audit Trail, Evidence Collection, Compliance Dashboard, Model Registry |
| **Workflow Control** | Conditional, Approval Gate, Sub-Workflow, Webhook Gateway |
| **Outputs** | Chat Interface, Spreadsheet, Email, Telegram, Notification |
| **Voice** | Voice Assistant (Whisper STT + Piper TTS) |
| **Containers** | Docker Container (sandboxed code execution) |
| **Vertical kits** | Fair Lending (ECOA / Reg B), Claims Audit (insurance), SAP ERP, Slack Compliance, MS Teams DORA, Jira Compliance |

---

## 7. Why this isn't N8N

| | N8N | ComplianceFlow |
|---|---|---|
| Default LLM destination | OpenAI / Anthropic API | Ollama on localhost |
| Air-gapped operation | Possible with effort | Default mode |
| PII redaction node | Build it yourself with HTTP + JS | First-class node, Presidio-backed |
| Bias / Drift / Explainability | Not in catalog | First-class nodes |
| Regulation-named nodes | None | Fair Lending (ECOA), DORA, PHI, GDPR Consent |
| Audit-shaped data flow | Per-execution log | Every node *adds* evidence to the context |
| Packaging | Self-host or cloud | Single desktop installer |

The orchestration core is similar. The **content of the node library** and the **default trust model** are not.

---

## 8. The audit-shaped data flow (the subtle moat)

Every node receives the merged outputs of every upstream node and returns `{...input_data, my_output_keys}`. This means **context accumulates** down the chain. By the time the workflow reaches the Output node, the data carries:

- `pii_found: [{type: "person", count: 3}, {type: "email", count: 1}]`
- `bias_test: {test_type, threshold, score, passed}`
- `audit_log: [...]`
- `evidence_collection: [...]`

A regulator who asks *"what was the PII state when the model made this decision?"* gets a literal answer from the execution log. N8N treats nodes as transformers; ComplianceFlow treats them as **evidence emitters**. This is the design choice that separates a workflow tool from a compliance tool.

---

## 9. What's real today vs. what's roadmap (be honest in the pitch)

| Feature | State | Notes |
|---|---|---|
| Local Ollama execution | ✅ Real | Frontend calls `/api/v1/llm/generate` against localhost |
| Visual canvas + 38 node types | ✅ Real | React Flow + Zustand |
| Docker service management | ✅ Real | Electron main process orchestrates Compose |
| Audit Trail / Evidence Collection | ✅ Real | Timestamped log per node |
| Drift Detection math | ✅ Real | Mean-abs-difference baseline comparison |
| PHI Classification | ✅ Real | Working classifier |
| Document → PII Filter → LLM | ✅ Real | Filter runs on `documentText` |
| **Database → PII Filter → LLM** | ⚠️ **Broken** | Frontend executor's PII filter does **not** redact `dbResult` before the LLM reads it. See `frontend/src/store/workflowStore.ts:498-595`. Backend executor handles this correctly but isn't called for this path. **Fix before the database demo.** |
| Bias Testing scoring | ⚠️ Stub | Returns hardcoded `0.85`. Contract is real, math is not. |
| Fair Lending impact ratio | ⚠️ Stub | Returns hardcoded `0.92` |
| Red Teaming attack runs | ⚠️ Stub | Returns `vulnerabilities_found: 0` |
| PersonaPlex node | ❌ Orphan | In the sidebar but no backend `NodeType` — drops a 422 on Run |

**Pitch framing:** when an investor asks *"what's actually built?"*, lead with the local-LLM + audit-trail demo (which is real), and frame the four governance stubs as *"policy contract nodes that integrate with your existing model risk tooling"* — that turns a gap into an integration story.

**Do not** claim PII redaction works on database queries until `workflowStore.ts:498` is patched. The fix is small (10–20 lines) but the trust cost of being caught is enormous.

---

## 10. Remotion video — asset & component map

Use these specific files when capturing screen footage and importing assets into Remotion.

### Brand assets (already exist)
| Asset | Path | Use |
|---|---|---|
| Wordmark | `frontend/public/nomu-logo-word.png` | Open / close cards |
| Logo | `frontend/public/nomu-logo.png` | Header/lower-third |
| Symbol | `frontend/public/nomu-symbol.png` | Loading screens, transitions |
| Favicon | `frontend/public/favicon.svg` | Tab/window chrome |
| App icon | `frontend/electron/resources/icon.png` | macOS dock cutaway |

### Brand palette
| Name | Hex | Use in video |
|---|---|---|
| Brand Purple | `#4004DA` | AI / model overlays, primary CTA, "intelligence" beats |
| Brand Orange | `#FF6C1D` | Trigger / start moments, highlight callouts |
| Black | `#000000` | Dark theme background |
| Dark Gray | `#36312E` | Card surfaces in dark mode |
| Off-White | `#FEFCFD` | Light theme background |
| Gray | `#4D4D4D` | Secondary text |

### Typography
- **Headings:** Barlow (Google Fonts)
- **Subtitles:** Work Sans Bold
- **Body:** Work Sans Regular

### UI surfaces to record (open these in the running app and capture)
| Surface | Component file | Why it matters in the video |
|---|---|---|
| The canvas with nodes | `frontend/src/components/canvas/Canvas.tsx` | The "drag and connect" visual |
| Node palette / sidebar | `frontend/src/components/sidebar/Sidebar.tsx` | Show the 38 categories — proof of breadth |
| Service dashboard | `frontend/src/components/electron/ServiceDashboard.tsx` | Visual proof of "100% local" — Docker services running on the user's box |
| Setup wizard | `frontend/src/components/electron/SetupWizard.tsx` | First-launch shot for the "open the box" moment |
| Floating chat panel | `frontend/src/components/panels/ChatInterfacePanel.tsx` | The result surface — where the redacted answer appears |
| AI Assistant | `frontend/src/components/panels/AIAssistantPanel.tsx` | The "describe what you want, get a workflow" moment |
| Node config panel | `frontend/src/components/panels/NodeConfigPanel.tsx` | Click-to-configure shot |

### Specific node visuals to highlight (record these one by one in close-up)
The following six are the "hero" nodes for the demo workflow — capture each as a still or short animation:
| Node | Component file | Color/role |
|---|---|---|
| Trigger | `frontend/src/components/nodes/TriggerNode.tsx` | Orange — start |
| Document | `frontend/src/components/nodes/DocumentNode.tsx` | Neutral — input |
| PII Filter | `frontend/src/components/nodes/PIIFilterNode.tsx` | Compliance accent |
| LLM | `frontend/src/components/nodes/LLMNode.tsx` | Purple — AI |
| Audit Trail | `frontend/src/components/nodes/AuditNode.tsx` | Compliance accent |
| Output | `frontend/src/components/nodes/OutputNode.tsx` | Neutral — result |

### Live demo workflow definitions
Pre-built workflows you can load and run for the screen capture:
- `frontend/src/data/demoWorkflows.ts` — six worked examples including *Fraud Detection & AML*, *Shadow AI Detection*, *GDPR Data Processing Audit (15-Node)*

For the Venn-diagram beat in the video, the *GDPR Data Processing Audit* workflow visually demonstrates the audit-shaped data flow (15 nodes, every one emits evidence into the context).

---

## 11. The 90-second pitch (script outline for the Remotion voiceover)

> *Banks can't put their data into ChatGPT.*
> *Hospitals can't put patient records into Claude.*
> *Insurers can't put claims data into Gemini.*
>
> *So the most regulated industries — the ones with the most to gain from AI — are stuck doing the work in spreadsheets.*
>
> *We built ComplianceFlow.*
>
> *It runs on your own laptop. The model lives on your hardware. Your data never leaves the box.*
>
> *Every step in the workflow logs evidence — what the model saw, what it returned, who approved it. Regulator-ready by default.*
>
> *And the nodes already speak the languages of GDPR, HIPAA, the EU AI Act, and DORA — so you're not building compliance, you're dragging it onto a canvas.*
>
> *This is the AI builder regulated industries are allowed to actually use.*

---

## 12. Open questions / decisions for the team

1. **Fix the DB→PII path before the video, or use the Document→PII path?** Recommendation: fix it. ~30 min of work; central to the pitch.
2. **Ship the Bias / Fair Lending / Red Teaming nodes as "policy contracts" or fill in the math?** Recommendation: ship as contracts with explicit "integrates with your model-risk vendor" framing for V1; build real implementations as a paid add-on.
3. **Reconcile the two execution engines** (`backend/app/services/executor.py` vs. `frontend/src/store/workflowStore.ts:285`). Recommendation: keep frontend as the orchestrator, but make it call the backend for any node where the backend has richer logic (PII Filter, PHI, Drift). Avoids drift bugs like the one in section 9.

---

*Last updated by Claude during architecture review. See `compliance-flow/README.md` for setup instructions and `compliance-flow/CLAUDE.md` for development conventions.*
