---
name: brand-guidelines-implementation
description: Full rebrand of compliance-flow app with Nomu brand guidelines including colors, typography, logo, and dark/light theme support
status: backlog
created: 2026-02-05T20:49:19Z
updated: 2026-02-05T20:49:19Z
---

# PRD: Nomu Brand Guidelines Implementation

## Executive Summary

Implement Nomu's brand guidelines across the entire compliance-flow application. This includes replacing all existing colors with the Nomu brand palette, integrating brand typography (Barlow + Work Sans), adding the Nomu logo to the top bar, and building a dark/light theme toggle. The goal is a cohesive, professional UI that reflects Nomu's identity as a privacy-first AI implementation consultancy.

## Problem Statement

The current application uses generic Tailwind slate/purple colors with no brand identity. As Nomu grows, the compliance-flow product needs to visually represent the brand to build trust, recognition, and professionalism with enterprise clients who are evaluating AI solutions for sensitive data environments.

## User Stories

### US-1: Brand-Consistent Experience
**As a** Nomu client or prospect,
**I want** the application to reflect Nomu's professional brand identity,
**So that** I have confidence in the company's attention to detail and professionalism.

**Acceptance Criteria:**
- All UI elements use Nomu brand colors
- Typography matches brand guidelines (Barlow headings, Work Sans body)
- Nomu logo appears in the application header
- Visual consistency across all panels, modals, and components

### US-2: Dark/Light Theme Toggle
**As a** user of the compliance-flow app,
**I want** to switch between dark and light themes,
**So that** I can work comfortably in different lighting conditions.

**Acceptance Criteria:**
- Theme toggle button accessible from the top bar or settings
- Dark mode uses brand blacks (#000000, #36312E) as backgrounds
- Light mode uses brand off-white (#FEFCFD) as background
- Theme preference persists across sessions (localStorage)
- All components render correctly in both themes
- Smooth transition between themes

### US-3: Consistent Node Styling
**As a** workflow builder,
**I want** nodes to be visually distinct and on-brand,
**So that** I can quickly identify node types while the app feels cohesive.

**Acceptance Criteria:**
- Node colors updated to use brand-derived palette
- Purple (#4004DA) used as primary accent for AI/brand elements
- Orange (#FF6C1D) used for key interactive accents and CTAs
- Functional node colors remain distinguishable but harmonize with brand

## Requirements

### Functional Requirements

#### FR-1: Color System Overhaul
Replace all existing colors with Nomu brand palette:

| Role | Dark Theme | Light Theme | Hex |
|------|-----------|-------------|-----|
| Primary (brand purple) | Buttons, active states, focus rings | Same | `#4004DA` |
| Accent (brand orange) | CTAs, highlights, hover accents | Same | `#FF6C1D` |
| Background (dark) | Main canvas, panels | N/A | `#000000` |
| Background (dark secondary) | Cards, elevated surfaces | N/A | `#36312E` |
| Background (light) | N/A | Main canvas, panels | `#FEFCFD` |
| Text (dark theme) | Primary text | N/A | `#FEFCFD` |
| Text (light theme) | N/A | Primary text | `#000000` |
| Text secondary | Muted/secondary text | Muted/secondary text | `#4D4D4D` |

#### FR-2: Typography Integration
- Import **Barlow** (Regular, Medium, Bold) from Google Fonts
- Import **Work Sans** (Regular, Bold) from Google Fonts
- Apply Barlow to all headings (h1-h6), titles, navigation
- Apply Work Sans to all body text, labels, descriptions
- Apply Work Sans Bold to subtitles and emphasis text

#### FR-3: Logo Integration
- Add Nomu horizontal logo (wordmark + logomark) to the top bar
- Replace the current "Compliance Flow" or app title with Nomu branding
- Logo should adapt to dark/light theme (white on dark, dark on light)
- Ensure logo SVG is crisp at all sizes

#### FR-4: Theme System
- Create a theme context/store using Zustand (consistent with existing state management)
- Support `dark` and `light` modes
- Provide CSS custom properties or Tailwind dark mode classes
- Theme toggle in the top bar (sun/moon icon)
- Persist theme choice in localStorage
- Default to dark theme
- Respect system preference on first visit (`prefers-color-scheme`)

#### FR-5: Component Updates
Update all existing components to use brand tokens:
- **Button.tsx**: Primary uses `#4004DA`, hover states, ghost variants
- **Input.tsx**: Focus ring `#4004DA`, border colors per theme
- **Modal.tsx**: Background per theme, border accents
- **Select.tsx**: Dropdown styling per theme
- **BaseNode.tsx**: Border and shadow colors, selected state glow with brand purple
- **Sidebar.tsx**: Background, text, search input per theme
- **Canvas.tsx**: Background grid per theme
- **All panels**: AIAssistantPanel, ChatInterfacePanel, NodeConfigPanel
- **All modals**: WorkflowListModal, SaveWorkflowModal, ExecutionPanel, DatabaseConfigModal
- **App.tsx**: Top bar, status bar, overall layout

#### FR-6: Node Color Palette (Brand-Harmonized)
Maintain visual distinction while harmonizing with brand:

| Node Type | Color | Notes |
|-----------|-------|-------|
| Trigger nodes | `#FF6C1D` (brand orange) | Start/trigger actions - high visibility |
| Database nodes | `#4004DA` (brand purple) | Data layer - brand primary |
| AI Agent | Brand purple gradient | Core AI feature - premium feel |
| PII Filter | `#36312E` with orange border | Compliance - muted with accent |
| Output nodes | Per-output accent | Chat=purple, Email=orange, etc. |

### Non-Functional Requirements

#### NFR-1: Performance
- Font loading should not block first paint (use `font-display: swap`)
- Theme toggle should be instant (<16ms, CSS variable swap)
- No layout shift when fonts load
- Bundle size increase < 50KB for font files

#### NFR-2: Accessibility
- All color combinations must meet WCAG 2.1 AA contrast ratios (4.5:1 for text)
- Focus indicators visible in both themes
- Theme toggle properly labeled for screen readers
- No information conveyed by color alone

#### NFR-3: Browser Compatibility
- Support latest 2 versions of Chrome, Firefox, Safari, Edge
- PWA appearance consistent with theme choice
- Theme meta tag updates with toggle

## Success Criteria

- All UI elements use exclusively Nomu brand colors (no leftover slate/generic colors)
- Both dark and light themes render correctly across all components
- Typography consistently uses Barlow (headings) and Work Sans (body)
- Nomu logo visible and correctly sized in top bar
- Theme preference persists across browser sessions
- No accessibility regressions (contrast ratios pass AA)
- App loads without visible font swap flash

## Constraints & Assumptions

### Constraints
- Must maintain all existing functionality (no feature changes)
- Node types must remain visually distinguishable from each other
- React Flow (@xyflow/react) theming must be compatible
- PWA manifest colors need updating

### Assumptions
- Google Fonts for Barlow and Work Sans are acceptable (no self-hosting requirement)
- The brand guidelines PDF represents the final approved brand direction
- SVG logo assets will be created/provided (or we create based on the brand guide visual)
- Tailwind CSS dark mode (`class` strategy) is the preferred approach

## Out of Scope

- Responsive/mobile layout changes (separate effort)
- Marketing pages or landing pages
- Email templates
- Documentation site styling
- Animation/motion design overhaul
- Icon library replacement (lucide-react stays)
- Backend/API changes

## Dependencies

### Internal
- Nomu logo as SVG files (horizontal wordmark + standalone logomark, for dark and light backgrounds)
- Final brand color approval (using PDF specs as source of truth)

### External
- Google Fonts CDN for Barlow and Work Sans
- Tailwind CSS dark mode support (already available)

## Technical Approach

### File Changes Overview

1. **New files:**
   - `src/theme/themeStore.ts` - Zustand theme state
   - `src/theme/colors.ts` - Brand color tokens
   - `src/assets/nomu-logo-dark.svg` - Logo for dark backgrounds
   - `src/assets/nomu-logo-light.svg` - Logo for light backgrounds

2. **Modified files (all existing components):**
   - `index.html` - Font imports, theme meta
   - `src/index.css` - CSS custom properties, font declarations
   - `src/App.tsx` - Theme provider, logo, toggle
   - `src/components/**/*.tsx` - All components updated to use brand tokens
   - `vite.config.ts` - PWA theme colors
   - `public/manifest.json` - Theme colors

### Implementation Order
1. Set up theme infrastructure (store, CSS variables, Tailwind config)
2. Import brand fonts
3. Update base layout (App.tsx, index.css)
4. Update common components (Button, Input, Modal, Select)
5. Update sidebar and canvas
6. Update all node types
7. Update all panels and modals
8. Add logo
9. Add theme toggle
10. Update PWA manifest
11. QA and accessibility audit
