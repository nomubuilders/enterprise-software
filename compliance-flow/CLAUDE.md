# CLAUDE.md

> Think carefully and implement the most concise solution that changes as little code as possible.

## Project Overview

**Nomu Compliance Flow** - A visual workflow builder for AI compliance pipelines. Built for enterprise clients who need to process sensitive data on-premises using local AI models.

- **Company**: Nomu - AI implementation consulting for privacy-sensitive organizations
- **Tagline**: "We Make Data Speak."
- **Product**: Drag-and-drop workflow builder with compliance nodes (PII filtering, local LLM, database connectors)

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS 4.1 (utility-first, no CSS modules)
- **State**: Zustand 5
- **Canvas**: @xyflow/react 12 (React Flow)
- **Icons**: lucide-react
- **PWA**: vite-plugin-pwa

## Nomu Brand Guidelines

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Brand Purple | `#4004DA` | Primary brand color, buttons, focus rings, AI elements |
| Brand Orange | `#FF6C1D` | Accent, CTAs, highlights, trigger nodes |
| Black | `#000000` | Dark theme background |
| Dark Gray | `#36312E` | Dark theme surfaces/cards |
| Off-White | `#FEFCFD` | Light theme background, dark theme text |
| Gray | `#4D4D4D` | Secondary text, muted elements |

### Typography
- **Headings/Titles**: Barlow (Google Fonts)
- **Subtitles**: Work Sans Bold
- **Body Text**: Work Sans Regular

### Logo
- Horizontal: "NOMU" wordmark + circular logomark (mountain/wave icon)
- Standalone: Circular logomark only
- White version for dark backgrounds, dark version for light backgrounds

## Project-Specific Instructions

- Use Tailwind utility classes for all styling (no inline styles, no CSS modules)
- Use Zustand for any new state management needs
- All components are in `src/components/` organized by type (nodes, panels, modals, common, sidebar, canvas)
- Reusable UI components (Button, Input, Modal, Select) are in `src/components/common/`
- Follow the existing pattern of TypeScript interfaces in `src/types/`
- Keep node types visually distinct from each other

## Testing

Always run tests before committing:
- `npm test` or equivalent for your stack

## Code Style

- Follow existing patterns in the codebase
- TypeScript strict mode
- Functional components with hooks
- Tailwind for all styling
