export interface TutorialStep {
  id: string
  target: string // data-tutorial attribute value
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  interactive?: boolean // Wait for user action before advancing
  action?: string // Description of expected action
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'sidebar',
    target: 'sidebar',
    title: 'Node Palette',
    description: 'This sidebar contains all available nodes. Drag any node onto the canvas to add it to your workflow.',
    position: 'right',
  },
  {
    id: 'triggers',
    target: 'category-triggers',
    title: 'Trigger Nodes',
    description: 'Every workflow starts with a trigger. Use Manual Trigger for testing, Schedule for automation, or Webhook for API-driven workflows.',
    position: 'right',
  },
  {
    id: 'data-sources',
    target: 'category-data-sources',
    title: 'Data Sources',
    description: 'Connect to PostgreSQL, MySQL, or MongoDB databases to query and process your data.',
    position: 'right',
  },
  {
    id: 'ai-models',
    target: 'category-ai-models',
    title: 'AI Models',
    description: 'Add AI Agents powered by local Ollama models. Your data never leaves your machine.',
    position: 'right',
  },
  {
    id: 'compliance',
    target: 'category-compliance',
    title: 'Compliance Nodes',
    description: 'PII Redact removes personal data. PII Mask replaces it with placeholders. Essential for GDPR compliance.',
    position: 'right',
  },
  {
    id: 'outputs',
    target: 'category-outputs',
    title: 'Output Nodes',
    description: 'Send results to Chat, Spreadsheets, Email, or Telegram. Chat Interface lets you query results interactively.',
    position: 'right',
  },
  {
    id: 'canvas',
    target: 'canvas',
    title: 'Workflow Canvas',
    description: 'This is your workspace. Drag nodes here, connect them by dragging from output handles to input handles.',
    position: 'left',
  },
  {
    id: 'drag-node',
    target: 'category-triggers',
    title: 'Try It: Drag a Node',
    description: 'Drag a "Manual Trigger" node from the sidebar onto the canvas.',
    position: 'right',
    interactive: true,
    action: 'drag-node',
  },
  {
    id: 'connect-nodes',
    target: 'canvas',
    title: 'Connect Nodes',
    description: 'Drag from the bottom handle of one node to the top handle of another to create a connection.',
    position: 'left',
  },
  {
    id: 'configure',
    target: 'canvas',
    title: 'Configure Nodes',
    description: 'Click any node to open its configuration panel on the right. Set database connections, AI prompts, and more.',
    position: 'left',
  },
  {
    id: 'ai-assistant',
    target: 'btn-ai-assistant',
    title: 'AI Assistant',
    description: 'Ask the AI to build workflows for you! Try: "Create a workflow that queries a database and filters PII".',
    position: 'bottom',
  },
  {
    id: 'run-workflow',
    target: 'btn-run',
    title: 'Run Your Workflow',
    description: 'Click Run to execute your workflow. Watch the execution panel for real-time progress and results.',
    position: 'bottom',
  },
]
