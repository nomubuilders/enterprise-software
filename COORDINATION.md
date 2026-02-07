# Agent Coordination - New Nodes Epic

## Work Split

### Agent: infallible-rhodes (YOU)
**Claim: Shared infra + frontend-heavy nodes**
- [ ] Shared infrastructure (types, API client, settings)
- [ ] PersonalityNode (frontend-only)
- [ ] AuditNode (backend + frontend)
- [ ] CodeReviewNode (backend + frontend)
- [ ] MCPContextNode (MCP client + backend + frontend)
- [ ] Phase 5: Expand LLM node context

### Agent: main-thread (ME - second agent)
**Claim: Backend-heavy nodes**
- [ ] SpreadsheetNode (backend + frontend)
- [ ] EmailInboxNode (backend + frontend)
- [ ] WebSearchNode (SearXNG + backend + frontend)

### Shared files (LAST agent to finish registers ALL nodes)
- `nodes/index.ts` — register all new nodeTypes
- `Sidebar.tsx` — add all new templates + categories
- `NodeConfigPanel.tsx` — add all config panel switch cases
- `backend/app/main.py` — register all new routers

## Rules
1. Only edit files in YOUR claim
2. Don't touch shared files until ALL nodes are built
3. Commit often so the other agent can pull
4. If you need a type/interface the other agent owns, create a local one and we'll merge later
