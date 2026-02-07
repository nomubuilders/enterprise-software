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

## Key Features

### Floating Draggable Windows
- **Chat Interface** (`ChatInterfacePanel.tsx`) - Floating, resizable, minimizable chat window for data queries
- **AI Assistant** (`AIAssistantPanel.tsx`) - Floating, resizable, minimizable AI helper for workflow building
- Both support 8-directional resizing (N, S, E, W, NE, NW, SE, SW)
- Minimum size: 320×400px
- Include resize handles with hover effects
- Draggable via header with `drag-handle` class and `cursor-move`

### Smart AI Assistant
- **Intent Detection** (`aiAssistantIntentDetector.ts`) - Automatically detects user intent:
  - `build_workflow` - Creates/modifies workflows
  - `explain_workflow` - Explains current workflow
  - `get_help` - Provides tips and guidance
  - `analyze_workflow` - Analyzes and suggests improvements
  - `general_question` - Answers general questions
- Shows contextual loading messages based on detected intent
- Only builds workflows when user actually wants them (not for questions)

### Database Integration
- **Recursive Node Detection** - Chat interface finds database nodes anywhere in upstream workflow chain
- **Enhanced Logging** - Console logs with ✅⚠️❌ emojis for easy debugging
- Supports PostgreSQL, MySQL, MongoDB
- Auto-loads table schema and sample data
- Saves `dbType` in configuration for proper connection handling

### Visual Feedback
- **Smart Edge Styling** (`Canvas.tsx`) - Edges change appearance based on node configuration:
  - Properly configured: Cyan (#06b6d4), 3px width, animated, 100% opacity
  - Not configured: Gray (#64748b), 2px width, no animation, 50% opacity
- Provides instant visual feedback for workflow validity

### Node Configuration
- Chat Output nodes auto-open floating chat interface (no sidebar panel)
- Database nodes save connection details and query configuration
- All nodes follow consistent configuration patterns

## Testing

Always run tests before committing:
- `npm test` or equivalent for your stack
- Check browser console for `[ChatInterface]` logs when debugging database connections
- Verify edge colors change when nodes are properly configured

## Code Style

- Follow existing patterns in the codebase
- TypeScript strict mode
- Functional components with hooks
- Tailwind for all styling
- Use console.log with prefixes like `[ChatInterface]` or `[AI Assistant]` for debugging

## Common Patterns

### Floating Window Implementation
```typescript
// State
const [position, setPosition] = useState({ x: 20, y: 100 })
const [size, setSize] = useState({ width: 420, height: 600 })
const [isMinimized, setIsMinimized] = useState(false)
const isDragging = useRef(false)
const isResizing = useRef(false)
const resizeHandle = useRef<ResizeHandle>(null)

// Include resize handles (8 directions)
<div data-resize-handle="n" className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-purple-500/50 transition-colors" />
// ... 7 more handles

// Draggable header
<div className="drag-handle ... cursor-move">
  <GripHorizontal size={16} className="text-slate-500" />
  // ... header content
</div>
```

### Intent Detection Pattern
```typescript
const intentAnalysis = aiIntentDetector.detectIntentQuick(userMessage, hasWorkflow)

if (!intentAnalysis.shouldBuildWorkflow) {
  // Provide helpful response without building
  const response = await aiIntentDetector.generateHelpfulResponse(...)
} else {
  // Build the workflow
  await aiWorkflowBuilder.buildWorkflow(...)
}
```

### Recursive Node Traversal
```typescript
const findUpstreamNodes = (nodeId: string, visited = new Set<string>()): Node[] => {
  if (visited.has(nodeId)) return []
  visited.add(nodeId)

  const upstreamEdges = edges.filter((e) => e.target === nodeId)
  const upstreamNodes: Node[] = []

  for (const edge of upstreamEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    if (sourceNode) {
      upstreamNodes.push(sourceNode)
      upstreamNodes.push(...findUpstreamNodes(sourceNode.id, visited))
    }
  }

  return upstreamNodes
}
```
