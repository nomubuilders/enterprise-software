---
name: brand-guidelines-implementation
status: completed
created: 2026-02-05T20:50:57Z
progress: 100%
updated: 2026-02-08T07:46:36Z
prd: .claude/prds/brand-guidelines-implementation.md
github: https://github.com/nomubuilders/enterprise-software/issues/1
---

# Epic: Nomu Brand Guidelines Implementation

## Overview

Full rebrand of the compliance-flow app to align with Nomu's brand identity. This involves replacing all generic slate/purple Tailwind colors with Nomu's brand palette (#4004DA purple, #FF6C1D orange, #000000/#36312E dark, #FEFCFD light), integrating Barlow + Work Sans typography, adding the Nomu logo to the top bar, and implementing a dark/light theme system with persistence.

The app has 19 component files across 6 directories (nodes, common, modals, panels, sidebar, canvas) plus App.tsx, index.css, and index.html — all need color/font updates.

## Architecture Decisions

1. **CSS Custom Properties for theming** — Define brand colors as CSS custom properties in `index.css` and toggle them via a `.dark`/`.light` class on `<html>`. This allows instant theme switching without re-rendering React components. Tailwind 4's `@theme` directive can reference these variables.

2. **Zustand for theme state** — Consistent with existing state management (flowStore, workflowStore). Store manages current theme + persistence to localStorage + system preference detection.

3. **Google Fonts via `<link>` in index.html** — Simplest approach, leverages browser caching, no build step needed. Use `font-display: swap` to avoid blocking render.

4. **SVG logo as React component** — Inline SVG that reads `currentColor` for theme-adaptive coloring. One component, no separate dark/light asset files.

5. **Tailwind `class` strategy for dark mode** — Use Tailwind's dark variant (`dark:`) triggered by class on root element. All components use `bg-nomu-surface dark:bg-nomu-surface-dark` pattern.

## Technical Approach

### Theme Infrastructure
- CSS custom properties in `index.css` for all brand colors
- Zustand store (`src/store/themeStore.ts`) managing dark/light state
- Theme class applied to `<html>` element
- localStorage persistence with `prefers-color-scheme` fallback

### Color Token Mapping
```
--nomu-primary: #4004DA     (purple - buttons, focus, AI)
--nomu-accent: #FF6C1D      (orange - CTAs, triggers, highlights)
--nomu-bg: #000000/#FEFCFD  (main background per theme)
--nomu-surface: #36312E/white (elevated surfaces per theme)
--nomu-text: #FEFCFD/#000000 (primary text per theme)
--nomu-text-muted: #4D4D4D  (secondary text both themes)
```

### Component Update Strategy
All 19 components + App.tsx need color class replacements:
- Replace `bg-slate-*` → theme-aware brand colors
- Replace `text-slate-*` → theme-aware brand text
- Replace `border-slate-*` → theme-aware brand borders
- Replace `bg-purple-*` → `bg-[var(--nomu-primary)]` or custom Tailwind class
- Replace `focus:ring-purple-*` → brand purple focus ring
- Node-specific colors get brand-harmonized palette

### Files Changed (Summary)
**New (3 files):**
- `src/store/themeStore.ts` — Theme state + persistence
- `src/components/common/NomuLogo.tsx` — SVG logo component
- `src/components/common/ThemeToggle.tsx` — Sun/moon toggle button

**Modified (22 files):**
- `index.html` — Font imports, theme-color meta, body class
- `src/index.css` — CSS custom properties, font-face, scrollbar theme
- `src/App.tsx` — Logo, theme toggle, theme class application
- `src/components/common/Button.tsx` — Brand colors
- `src/components/common/Input.tsx` — Brand colors
- `src/components/common/Modal.tsx` — Brand colors
- `src/components/common/Select.tsx` — Brand colors
- `src/components/sidebar/Sidebar.tsx` — Brand colors
- `src/components/canvas/Canvas.tsx` — Brand colors
- `src/components/nodes/BaseNode.tsx` — Brand node styling
- `src/components/nodes/TriggerNode.tsx` — Orange brand color
- `src/components/nodes/DatabaseNode.tsx` — Purple brand color
- `src/components/nodes/LLMNode.tsx` — Purple brand color
- `src/components/nodes/PIIFilterNode.tsx` — Dark gray + orange border
- `src/components/nodes/OutputNode.tsx` — Brand accent colors
- `src/components/panels/AIAssistantPanel.tsx` — Brand colors
- `src/components/panels/ChatInterfacePanel.tsx` — Brand colors
- `src/components/panels/NodeConfigPanel.tsx` — Brand colors
- `src/components/modals/WorkflowListModal.tsx` — Brand colors
- `src/components/modals/SaveWorkflowModal.tsx` — Brand colors
- `src/components/modals/ExecutionPanel.tsx` — Brand colors
- `src/components/modals/DatabaseConfigModal.tsx` — Brand colors

## Implementation Strategy

**Phase 1 — Foundation (Tasks 1-2):** Set up theme infrastructure, fonts, CSS variables, logo. This unblocks all other work.

**Phase 2 — Core UI (Tasks 3-6):** Update App shell, common components, sidebar, canvas, nodes. These are the most visible changes.

**Phase 3 — Panels & Modals (Tasks 7-8):** Update floating panels and modal dialogs. These follow the same pattern established in Phase 2.

**Phase 4 — Polish (Tasks 9-10):** PWA updates, accessibility audit, final QA.

### Risk Mitigation
- Node colors must stay visually distinct — test with real workflows after color changes
- React Flow internal styles may need `!important` overrides in index.css
- Font loading CLS — use `font-display: swap` and size-adjust fallbacks

## Task Breakdown Preview

- [ ] Task 1: Set up theme infrastructure (CSS variables, Zustand store, Tailwind config, font imports in index.html)
- [ ] Task 2: Create Nomu logo SVG component and theme toggle component
- [ ] Task 3: Rebrand App.tsx shell (top bar, status bar, layout, logo placement, theme toggle)
- [ ] Task 4: Rebrand common components (Button, Input, Modal, Select)
- [ ] Task 5: Rebrand sidebar and canvas with theme support
- [ ] Task 6: Rebrand all node components (BaseNode, TriggerNode, DatabaseNode, LLMNode, PIIFilterNode, OutputNode)
- [ ] Task 7: Rebrand all panel components (AIAssistantPanel, ChatInterfacePanel, NodeConfigPanel)
- [ ] Task 8: Rebrand all modal components (WorkflowListModal, SaveWorkflowModal, ExecutionPanel, DatabaseConfigModal)
- [ ] Task 9: Update PWA manifest, favicon, index.html meta tags, and index.css (scrollbar, React Flow overrides)
- [ ] Task 10: Visual QA and accessibility audit across both themes

## Dependencies

### External
- Google Fonts CDN (Barlow, Work Sans) — no build-time dependency
- Tailwind CSS 4 dark mode support — already available

### Internal
- No backend changes required
- No API changes required
- Logo SVG will be created as inline React component based on brand guide visuals

### Task Dependencies
- Task 1 must complete before Tasks 3-9 (they depend on CSS variables and theme store)
- Task 2 must complete before Task 3 (App.tsx needs logo + toggle components)
- Tasks 4-8 can run in parallel once Task 1 is done
- Task 10 runs after all others

## Success Criteria (Technical)

- Zero remaining `slate-` color classes in any component file
- Zero remaining `purple-` color classes (replaced with brand tokens)
- `prefers-color-scheme` respected on first load
- Theme toggle switches all surfaces, text, borders instantly (no flash)
- All text passes WCAG AA contrast (4.5:1 minimum)
- Lighthouse accessibility score >= 90
- Font load does not cause visible layout shift
- PWA install and splash screen show brand colors

## Tasks Created

- [ ] #2 - Set up theme infrastructure (parallel: false)
- [ ] #4 - Create Nomu logo and theme toggle components (parallel: false, depends: #2)
- [ ] #6 - Rebrand App.tsx shell (parallel: false, depends: #2, #4)
- [ ] #8 - Rebrand common components (parallel: true, depends: #2)
- [ ] #10 - Rebrand sidebar and canvas (parallel: true, depends: #2)
- [ ] #3 - Rebrand node components (parallel: true, depends: #2)
- [ ] #5 - Rebrand panel components (parallel: true, depends: #2)
- [ ] #7 - Rebrand modal components (parallel: true, depends: #2, #8)
- [ ] #9 - Update PWA manifest and meta tags (parallel: true, depends: #2)
- [ ] #11 - Visual QA and accessibility audit (parallel: false, depends: all)

Total tasks: 10
Parallel tasks: 6 (can run concurrently after foundation)
Sequential tasks: 4 (#2 → #4 → #6, then #11 after all)
Estimated total effort: 28-38 hours

## Estimated Effort

- **Total tasks**: 10
- **Parallelizable**: Tasks 4-9 (6 tasks can run concurrently after foundation)
- **Critical path**: Task 1 → Task 2 → Task 3 → Task 10
- **Risk items**: React Flow internal style overrides, node color distinctiveness
