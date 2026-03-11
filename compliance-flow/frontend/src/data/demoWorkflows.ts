import type { Node, Edge } from '@xyflow/react'

export interface DemoWorkflow {
  id: string
  name: string
  description: string
  category: 'fraud' | 'writing' | 'governance' | 'tools' | 'analysis'
  icon: string
  nodes: Node[]
  edges: Edge[]
}

// ---------------------------------------------------------------------------
// 1. Fraud Detection & Anti-Money Laundering
// ---------------------------------------------------------------------------

const fraudNodes: Node[] = [
  {
    id: 'fraud-trigger',
    type: 'triggerNode',
    position: { x: 100, y: 300 },
    data: {
      label: 'Start Analysis',
      type: 'triggerNode',
      config: { triggerType: 'manual' },
    },
  },
  {
    id: 'fraud-database',
    type: 'databaseNode',
    position: { x: 380, y: 300 },
    data: {
      label: 'Transaction Data',
      type: 'databaseNode',
      config: {
        dbType: 'postgresql',
        host: 'localhost',
        port: 5433,
        database: 'compliance_db',
        username: 'compliance',
        password: 'compliance123',
        query:
          'SELECT t.id, t.amount, t.currency, t.sender, t.receiver, t.timestamp, t.country_origin, t.country_destination FROM transactions t WHERE t.amount > 10000 ORDER BY t.timestamp DESC LIMIT 50',
      },
    },
  },
  {
    id: 'fraud-pii',
    type: 'piiFilterNode',
    position: { x: 660, y: 300 },
    data: {
      label: 'Redact PII',
      type: 'piiFilterNode',
      config: {
        mode: 'redact',
        patterns: ['email', 'phone', 'ssn', 'person'],
        replacement_char: '*',
      },
    },
  },
  {
    id: 'fraud-llm',
    type: 'llmNode',
    position: { x: 940, y: 300 },
    data: {
      label: 'Fraud Analysis AI',
      type: 'llmNode',
      config: {
        model: 'llama3.2',
        prompt:
          'You are a financial crime analyst. Analyze these transactions for potential money laundering indicators:\n\n1. Structuring (splitting transactions to avoid reporting thresholds)\n2. Layering (complex chains of transfers)\n3. Unusual geographic patterns\n4. Round-number transactions\n5. Rapid movement of funds\n\nData:\n{{data}}\n\nProvide a risk assessment for each suspicious pattern found, with severity (Low/Medium/High/Critical) and recommended actions.',
        temperature: 0.3,
      },
    },
  },
  {
    id: 'fraud-conditional',
    type: 'conditionalNode',
    position: { x: 1220, y: 300 },
    data: {
      label: 'Risk Threshold',
      type: 'conditionalNode',
      config: { field: 'risk_level', operator: 'equals', value: 'High' },
    },
  },
  {
    id: 'fraud-output',
    type: 'outputNode',
    position: { x: 1500, y: 300 },
    data: {
      label: 'Investigation Report',
      type: 'outputNode',
      config: { outputType: 'chat' },
    },
  },
]

const fraudEdges: Edge[] = [
  { id: 'e-1-fraud-trigger-fraud-database', source: 'fraud-trigger', target: 'fraud-database', animated: true },
  { id: 'e-1-fraud-database-fraud-pii', source: 'fraud-database', target: 'fraud-pii', animated: true },
  { id: 'e-1-fraud-pii-fraud-llm', source: 'fraud-pii', target: 'fraud-llm', animated: true },
  { id: 'e-1-fraud-llm-fraud-conditional', source: 'fraud-llm', target: 'fraud-conditional', animated: true },
  { id: 'e-1-fraud-conditional-fraud-output', source: 'fraud-conditional', target: 'fraud-output', animated: true },
]

// ---------------------------------------------------------------------------
// 2. AI Report & Email Writer
// ---------------------------------------------------------------------------

const writerNodes: Node[] = [
  {
    id: 'writer-trigger',
    type: 'triggerNode',
    position: { x: 100, y: 300 },
    data: {
      label: 'New Report Request',
      type: 'triggerNode',
      config: { triggerType: 'manual' },
    },
  },
  {
    id: 'writer-personality',
    type: 'personalityNode',
    position: { x: 380, y: 300 },
    data: {
      label: 'Professional Writer',
      type: 'personalityNode',
      config: {
        model: 'llama3.2',
        personality:
          'You are a senior compliance officer at a regulated financial institution. You write with authority, precision, and clarity. Your communications are professional, well-structured, and cite relevant regulations (GDPR, EU AI Act, DORA) when applicable. You format reports with clear headings, bullet points, and action items.',
      },
    },
  },
  {
    id: 'writer-llm',
    type: 'llmNode',
    position: { x: 660, y: 300 },
    data: {
      label: 'Generate Content',
      type: 'llmNode',
      config: {
        model: 'llama3.2',
        prompt:
          'Based on the writing style and context provided, generate a professional compliance document.\n\nContext: {{data}}\n\nFormat the output as a well-structured document with:\n- Executive Summary\n- Key Findings\n- Regulatory References\n- Recommended Actions\n- Timeline for Implementation',
        temperature: 0.5,
      },
    },
  },
  {
    id: 'writer-output',
    type: 'outputNode',
    position: { x: 940, y: 300 },
    data: {
      label: 'Final Document',
      type: 'outputNode',
      config: { outputType: 'chat' },
    },
  },
]

const writerEdges: Edge[] = [
  { id: 'e-2-writer-trigger-writer-personality', source: 'writer-trigger', target: 'writer-personality', animated: true },
  { id: 'e-2-writer-personality-writer-llm', source: 'writer-personality', target: 'writer-llm', animated: true },
  { id: 'e-2-writer-llm-writer-output', source: 'writer-llm', target: 'writer-output', animated: true },
]

// ---------------------------------------------------------------------------
// 3. Shadow AI Detection
// ---------------------------------------------------------------------------

const shadowNodes: Node[] = [
  {
    id: 'shadow-trigger',
    type: 'triggerNode',
    position: { x: 100, y: 300 },
    data: {
      label: 'Start Scan',
      type: 'triggerNode',
      config: { triggerType: 'manual' },
    },
  },
  {
    id: 'shadow-database',
    type: 'databaseNode',
    position: { x: 380, y: 300 },
    data: {
      label: 'IT Asset Inventory',
      type: 'databaseNode',
      config: {
        dbType: 'postgresql',
        host: 'localhost',
        port: 5433,
        database: 'compliance_db',
        username: 'compliance',
        password: 'compliance123',
        query:
          "SELECT s.name, s.vendor, s.category, s.deployment_type, s.data_access_level, s.approved_status, s.last_audit_date, s.user_count FROM software_inventory s WHERE s.category LIKE '%AI%' OR s.category LIKE '%ML%' OR s.vendor IN ('OpenAI', 'Anthropic', 'Google AI', 'Hugging Face', 'Stability AI') ORDER BY s.approved_status, s.user_count DESC",
      },
    },
  },
  {
    id: 'shadow-llm',
    type: 'llmNode',
    position: { x: 660, y: 300 },
    data: {
      label: 'Shadow AI Analyzer',
      type: 'llmNode',
      config: {
        model: 'llama3.2',
        prompt:
          "You are an AI governance specialist. Analyze this IT asset inventory for shadow AI risks:\n\n{{data}}\n\nIdentify:\n1. Unapproved AI tools (approved_status != 'approved')\n2. AI services accessing sensitive data without proper classification\n3. Tools lacking recent audit dates (>6 months)\n4. High-risk AI usage patterns under EU AI Act Article 6\n5. Data sovereignty concerns (cloud-based AI processing personal data)\n\nFor each finding, provide:\n- Risk Level (Critical/High/Medium/Low)\n- EU AI Act implications\n- Recommended remediation action\n- Compliance deadline suggestion",
        temperature: 0.3,
      },
    },
  },
  {
    id: 'shadow-dashboard',
    type: 'complianceDashboardNode',
    position: { x: 940, y: 300 },
    data: {
      label: 'Compliance Assessment',
      type: 'complianceDashboardNode',
      config: { frameworks: ['GDPR', 'EU_AI_ACT'] },
    },
  },
  {
    id: 'shadow-notification',
    type: 'notificationNode',
    position: { x: 1220, y: 300 },
    data: {
      label: 'Alert Security Team',
      type: 'notificationNode',
      config: {
        channel: 'log',
        messageTemplate: 'Shadow AI scan complete: {{summary}}',
      },
    },
  },
  {
    id: 'shadow-output',
    type: 'outputNode',
    position: { x: 1500, y: 300 },
    data: {
      label: 'Shadow AI Report',
      type: 'outputNode',
      config: { outputType: 'chat' },
    },
  },
]

const shadowEdges: Edge[] = [
  { id: 'e-3-shadow-trigger-shadow-database', source: 'shadow-trigger', target: 'shadow-database', animated: true },
  { id: 'e-3-shadow-database-shadow-llm', source: 'shadow-database', target: 'shadow-llm', animated: true },
  { id: 'e-3-shadow-llm-shadow-dashboard', source: 'shadow-llm', target: 'shadow-dashboard', animated: true },
  { id: 'e-3-shadow-dashboard-shadow-notification', source: 'shadow-dashboard', target: 'shadow-notification', animated: true },
  { id: 'e-3-shadow-notification-shadow-output', source: 'shadow-notification', target: 'shadow-output', animated: true },
]

// ---------------------------------------------------------------------------
// 4. AI Diagram Generator
// ---------------------------------------------------------------------------

const diagramNodes: Node[] = [
  {
    id: 'diagram-trigger',
    type: 'triggerNode',
    position: { x: 100, y: 300 },
    data: {
      label: 'Describe Diagram',
      type: 'triggerNode',
      config: { triggerType: 'manual' },
    },
  },
  {
    id: 'diagram-llm',
    type: 'llmNode',
    position: { x: 380, y: 300 },
    data: {
      label: 'Diagram Generator',
      type: 'llmNode',
      config: {
        model: 'llama3.2',
        prompt:
          'You are a technical diagram specialist. Generate a Mermaid diagram based on this description:\n\n{{data}}\n\nRules:\n1. Use valid Mermaid.js syntax\n2. Include clear labels on all nodes and connections\n3. Use appropriate diagram type (flowchart, sequence, class, entity-relationship, state, gantt)\n4. Use meaningful node IDs\n5. Add styling where helpful\n\nReturn ONLY the Mermaid code block, wrapped in ```mermaid and ``` markers.\n\nExample output:\n```mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n```',
        temperature: 0.4,
      },
    },
  },
  {
    id: 'diagram-output',
    type: 'outputNode',
    position: { x: 660, y: 300 },
    data: {
      label: 'Rendered Diagram',
      type: 'outputNode',
      config: { outputType: 'chat' },
    },
  },
]

const diagramEdges: Edge[] = [
  { id: 'e-4-diagram-trigger-diagram-llm', source: 'diagram-trigger', target: 'diagram-llm', animated: true },
  { id: 'e-4-diagram-llm-diagram-output', source: 'diagram-llm', target: 'diagram-output', animated: true },
]

// ---------------------------------------------------------------------------
// 5. Document Upload & Analysis
// ---------------------------------------------------------------------------

const docAnalysisNodes: Node[] = [
  {
    id: 'docanalysis-trigger',
    type: 'triggerNode',
    position: { x: 100, y: 300 },
    data: {
      label: 'Upload Document',
      type: 'triggerNode',
      config: { triggerType: 'manual' },
    },
  },
  {
    id: 'docanalysis-document',
    type: 'documentNode',
    position: { x: 380, y: 300 },
    data: {
      label: 'Document Input',
      type: 'documentNode',
      config: {},
    },
  },
  {
    id: 'docanalysis-pii',
    type: 'piiFilterNode',
    position: { x: 660, y: 300 },
    data: {
      label: 'PII Scanner',
      type: 'piiFilterNode',
      config: {
        mode: 'detect',
        patterns: ['email', 'phone', 'ssn', 'credit_card', 'person'],
        replacement_char: '*',
      },
    },
  },
  {
    id: 'docanalysis-llm',
    type: 'llmNode',
    position: { x: 940, y: 300 },
    data: {
      label: 'Document Analyzer',
      type: 'llmNode',
      config: {
        model: 'llama3.2',
        prompt:
          'You are a compliance document analyst. Analyze this document:\n\n{{data}}\n\nProvide:\n1. **Document Summary** - Key points and purpose\n2. **Compliance Relevance** - Which regulations apply (GDPR, EU AI Act, DORA, etc.)\n3. **Risk Assessment** - Any compliance risks identified\n4. **PII Findings** - Personal data elements found\n5. **Recommendations** - Actions needed for compliance\n6. **Classification** - Document sensitivity level (Public/Internal/Confidential/Restricted)',
        temperature: 0.3,
      },
    },
  },
  {
    id: 'docanalysis-audit',
    type: 'auditNode',
    position: { x: 1220, y: 300 },
    data: {
      label: 'Audit Trail',
      type: 'auditNode',
      config: { auditType: 'compliance_check' },
    },
  },
  {
    id: 'docanalysis-output',
    type: 'outputNode',
    position: { x: 1500, y: 300 },
    data: {
      label: 'Analysis Results',
      type: 'outputNode',
      config: { outputType: 'chat' },
    },
  },
]

const docAnalysisEdges: Edge[] = [
  { id: 'e-5-docanalysis-trigger-docanalysis-document', source: 'docanalysis-trigger', target: 'docanalysis-document', animated: true },
  { id: 'e-5-docanalysis-document-docanalysis-pii', source: 'docanalysis-document', target: 'docanalysis-pii', animated: true },
  { id: 'e-5-docanalysis-pii-docanalysis-llm', source: 'docanalysis-pii', target: 'docanalysis-llm', animated: true },
  { id: 'e-5-docanalysis-llm-docanalysis-audit', source: 'docanalysis-llm', target: 'docanalysis-audit', animated: true },
  { id: 'e-5-docanalysis-audit-docanalysis-output', source: 'docanalysis-audit', target: 'docanalysis-output', animated: true },
]

// ---------------------------------------------------------------------------
// Exported collection
// ---------------------------------------------------------------------------

export const demoWorkflows: DemoWorkflow[] = [
  {
    id: 'demo-fraud-detection',
    name: 'Fraud Detection & Anti-Money Laundering',
    description:
      'Detect suspicious transactions and money laundering patterns using local AI analysis with PII protection.',
    category: 'fraud',
    icon: 'ShieldAlert',
    nodes: fraudNodes,
    edges: fraudEdges,
  },
  {
    id: 'demo-report-writer',
    name: 'AI Report & Email Writer',
    description:
      'Generate professional compliance reports, emails, and letters using local AI with customizable tone and format.',
    category: 'writing',
    icon: 'FileText',
    nodes: writerNodes,
    edges: writerEdges,
  },
  {
    id: 'demo-shadow-ai',
    name: 'Shadow AI Detection',
    description:
      'Identify unauthorized AI tools and services being used within the organization to ensure compliance with EU AI Act requirements.',
    category: 'governance',
    icon: 'Eye',
    nodes: shadowNodes,
    edges: shadowEdges,
  },
  {
    id: 'demo-diagram-generator',
    name: 'AI Diagram Generator',
    description:
      'Generate professional Mermaid diagrams from natural language descriptions for documentation and presentations.',
    category: 'tools',
    icon: 'GitFork',
    nodes: diagramNodes,
    edges: diagramEdges,
  },
  {
    id: 'demo-document-analysis',
    name: 'Document Upload & Analysis',
    description:
      'Upload documents (PDF, Word, text) for AI-powered analysis with automatic PII detection and compliance review.',
    category: 'analysis',
    icon: 'FileSearch',
    nodes: docAnalysisNodes,
    edges: docAnalysisEdges,
  },
]
