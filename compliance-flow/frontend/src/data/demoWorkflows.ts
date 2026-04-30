import type { Node, Edge } from '@xyflow/react'

export interface DemoWorkflow {
  id: string
  name: string
  description: string
  category: 'fraud' | 'writing' | 'governance' | 'tools' | 'analysis' | 'compliance'
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
        password: '',
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
        password: '',
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
// 6. GDPR Data Processing Audit (15-node full system test)
// ---------------------------------------------------------------------------

const gdprAuditNodes: Node[] = [
  // Row 1: Trigger + Data Ingestion
  {
    id: 'gdpr-trigger',
    type: 'triggerNode',
    position: { x: 80, y: 100 },
    data: {
      label: '1. Start Audit',
      type: 'triggerNode',
      config: { triggerType: 'manual' },
    },
  },
  {
    id: 'gdpr-database',
    type: 'databaseNode',
    position: { x: 360, y: 100 },
    data: {
      label: '2. Customer Records',
      type: 'databaseNode',
      config: {
        dbType: 'postgresql',
        host: 'postgres',
        port: 5432,
        database: 'compliance_flow',
        username: 'postgres',
        password: 'postgres',
        query: 'SELECT * FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 20',
      },
    },
  },
  {
    id: 'gdpr-document',
    type: 'documentNode',
    position: { x: 640, y: 100 },
    data: {
      label: '3. Privacy Policy',
      type: 'documentNode',
      config: { mode: 'summarize', templateId: null, chunkSize: 20000, documents: [] },
    },
  },
  // Row 2: PII + AI Analysis
  {
    id: 'gdpr-pii-detect',
    type: 'piiFilterNode',
    position: { x: 920, y: 100 },
    data: {
      label: '4. Detect PII',
      type: 'piiFilterNode',
      config: {
        mode: 'redact',
        entities: ['EMAIL', 'PHONE', 'NAME', 'ADDRESS', 'SSN'],
      },
    },
  },
  {
    id: 'gdpr-personality',
    type: 'personalityNode',
    position: { x: 80, y: 300 },
    data: {
      label: '5. DPO Persona',
      type: 'personalityNode',
      config: {
        persona: 'Data Protection Officer',
        tone: 'formal',
        language: 'en',
        customPrompt: 'You are a certified EU Data Protection Officer (DPO) with expertise in GDPR Articles 5, 6, 13-22, and 30. You cite specific GDPR articles in your analysis. You are thorough but concise.',
      },
    },
  },
  {
    id: 'gdpr-llm-analysis',
    type: 'llmNode',
    position: { x: 360, y: 300 },
    data: {
      label: '6. GDPR Gap Analysis',
      type: 'llmNode',
      config: {
        model: 'gemma4:latest',
        prompt: 'Analyze the data processing activities and documents provided. For each data category found, assess:\n\n1. **Legal Basis** (Art. 6) — Is there a valid legal basis for processing?\n2. **Data Minimization** (Art. 5(1)(c)) — Is only necessary data collected?\n3. **Storage Limitation** (Art. 5(1)(e)) — Are retention periods defined?\n4. **Subject Rights** (Art. 13-22) — Are data subject rights facilitated?\n5. **Breach Readiness** (Art. 33-34) — Is there a 72-hour notification process?\n\nProvide a compliance score (0-100) and list specific gaps with remediation actions.',
        temperature: 0.3,
        maxTokens: 4096,
      },
    },
  },
  // Row 3: Risk Assessment Branch
  {
    id: 'gdpr-conditional',
    type: 'conditionalNode',
    position: { x: 640, y: 300 },
    data: {
      label: '7. Risk Threshold',
      type: 'conditionalNode',
      config: { field: 'compliance_score', operator: 'less_than', value: '70' },
    },
  },
  {
    id: 'gdpr-bias-test',
    type: 'biasTestingNode',
    position: { x: 920, y: 300 },
    data: {
      label: '8. Bias Check',
      type: 'biasTestingNode',
      config: {
        testType: 'disparate_impact',
        protectedAttributes: ['nationality', 'gender', 'age'],
        threshold: 0.8,
      },
    },
  },
  // Row 4: Compliance + Explainability
  {
    id: 'gdpr-explainability',
    type: 'explainabilityNode',
    position: { x: 80, y: 500 },
    data: {
      label: '9. AI Explainability',
      type: 'explainabilityNode',
      config: {
        method: 'feature_importance',
        model: 'gemma4:latest',
        detailLevel: 'detailed',
      },
    },
  },
  {
    id: 'gdpr-model-registry',
    type: 'modelRegistryNode',
    position: { x: 360, y: 500 },
    data: {
      label: '10. Register AI Model',
      type: 'modelRegistryNode',
      config: {
        modelName: 'gemma4-gdpr-auditor',
        riskLevel: 'high',
        modelVersion: '1.0',
      },
    },
  },
  {
    id: 'gdpr-compliance-report',
    type: 'complianceDashboardNode',
    position: { x: 640, y: 500 },
    data: {
      label: '11. Compliance Report',
      type: 'complianceDashboardNode',
      config: {
        frameworks: ['GDPR', 'EU_AI_ACT'],
        reportFormat: 'pdf',
        autoGenerate: true,
      },
    },
  },
  // Row 5: Evidence + Approval + Delivery
  {
    id: 'gdpr-evidence',
    type: 'evidenceCollectionNode',
    position: { x: 920, y: 500 },
    data: {
      label: '12. Evidence Package',
      type: 'evidenceCollectionNode',
      config: {
        artifactTypes: ['logs', 'configs', 'reports'],
        targetFramework: 'gdpr',
        autoPackage: true,
      },
    },
  },
  {
    id: 'gdpr-approval',
    type: 'approvalGateNode',
    position: { x: 80, y: 700 },
    data: {
      label: '13. DPO Approval',
      type: 'approvalGateNode',
      config: {
        approvalType: 'single',
        approvers: ['dpo@company.eu'],
        requireAll: true,
        approvalStatus: 'pending',
      },
    },
  },
  {
    id: 'gdpr-audit-trail',
    type: 'auditNode',
    position: { x: 360, y: 700 },
    data: {
      label: '14. Audit Trail',
      type: 'auditNode',
      config: {
        auditLevel: 'full',
        retentionDays: 365,
        logFormat: 'json',
        enabled: true,
      },
    },
  },
  {
    id: 'gdpr-output',
    type: 'outputNode',
    position: { x: 640, y: 700 },
    data: {
      label: '15. Final Report',
      type: 'outputNode',
      config: { outputType: 'chat' },
    },
  },
]

const gdprAuditEdges: Edge[] = [
  // Row 1: Linear data ingestion
  { id: 'e-gdpr-1-2', source: 'gdpr-trigger', target: 'gdpr-database', animated: true },
  { id: 'e-gdpr-2-3', source: 'gdpr-database', target: 'gdpr-document', animated: true },
  { id: 'e-gdpr-3-4', source: 'gdpr-document', target: 'gdpr-pii-detect', animated: true },
  // Row 1 → Row 2: PII feeds into personality + analysis
  { id: 'e-gdpr-4-5', source: 'gdpr-pii-detect', target: 'gdpr-personality', animated: true },
  { id: 'e-gdpr-5-6', source: 'gdpr-personality', target: 'gdpr-llm-analysis', animated: true },
  // Row 2: Analysis → Risk check → Bias
  { id: 'e-gdpr-6-7', source: 'gdpr-llm-analysis', target: 'gdpr-conditional', animated: true },
  { id: 'e-gdpr-7-8', source: 'gdpr-conditional', target: 'gdpr-bias-test', animated: true },
  // Row 2 → Row 3: Explainability + Model Registry + Report
  { id: 'e-gdpr-8-9', source: 'gdpr-bias-test', target: 'gdpr-explainability', animated: true },
  { id: 'e-gdpr-9-10', source: 'gdpr-explainability', target: 'gdpr-model-registry', animated: true },
  { id: 'e-gdpr-10-11', source: 'gdpr-model-registry', target: 'gdpr-compliance-report', animated: true },
  // Row 3 → Row 4: Evidence → Approval → Audit → Output
  { id: 'e-gdpr-11-12', source: 'gdpr-compliance-report', target: 'gdpr-evidence', animated: true },
  { id: 'e-gdpr-12-13', source: 'gdpr-evidence', target: 'gdpr-approval', animated: true },
  { id: 'e-gdpr-13-14', source: 'gdpr-approval', target: 'gdpr-audit-trail', animated: true },
  { id: 'e-gdpr-14-15', source: 'gdpr-audit-trail', target: 'gdpr-output', animated: true },
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
  {
    id: 'demo-gdpr-audit',
    name: 'GDPR Data Processing Audit (15-Node)',
    description:
      'Full end-to-end GDPR compliance audit: ingest customer data, detect PII, run AI gap analysis with Gemma 4, check for bias, generate compliance reports, collect evidence, and route through DPO approval — all locally.',
    category: 'compliance',
    icon: 'Shield',
    nodes: gdprAuditNodes,
    edges: gdprAuditEdges,
  },
]

// Append real-test workflow (defined below export for readability)
demoWorkflows.push({
  id: 'demo-real-test',
  name: '🧪 Real Test: Data Compliance Check',
  description:
    'REAL end-to-end test: queries actual employee data from PostgreSQL, redacts PII, sends to Gemma 4 to identify compliance violations, and outputs a real report.',
  category: 'compliance' as const,
  icon: 'Shield',
  nodes: [
    { id: 'rt-trigger', type: 'triggerNode', position: { x: 100, y: 250 }, data: { label: 'Start Compliance Check', type: 'triggerNode', config: { triggerType: 'manual' } } },
    { id: 'rt-database', type: 'databaseNode', position: { x: 400, y: 250 }, data: { label: 'Query Employee Data Access', type: 'databaseNode', config: { dbType: 'postgresql', host: 'postgres', port: 5432, database: 'compliance_flow', username: 'postgres', password: 'postgres', query: "SELECT e.name, e.email, e.department, e.role, e.data_access_level, e.gdpr_training_completed, e.last_training_date, dpa.activity_type, dpa.data_category, dpa.legal_basis, dpa.consent_recorded, dpa.retention_period_days, dpa.last_review_date, dpa.notes FROM employees e JOIN data_processing_activities dpa ON e.id = dpa.employee_id ORDER BY dpa.consent_recorded ASC, e.name" } } },
    { id: 'rt-pii', type: 'piiFilterNode', position: { x: 700, y: 250 }, data: { label: 'Redact Employee PII', type: 'piiFilterNode', config: { mode: 'redact', entities: ['EMAIL', 'PHONE'] } } },
    { id: 'rt-llm', type: 'llmNode', position: { x: 1000, y: 250 }, data: { label: 'Gemma 4 GDPR Analyzer', type: 'llmNode', config: { model: 'gemma4:latest', prompt: 'You are a GDPR compliance auditor. Analyze the employee data processing records provided and answer this question:\n\n**Which employees are handling sensitive personal data WITHOUT proper consent or legal basis?**\n\nFor each violation found, provide:\n1. Employee name and department\n2. What data they are accessing\n3. What is missing (consent, legal basis, training, etc.)\n4. Risk level (Critical/High/Medium/Low)\n5. Recommended action\n\nAlso flag anyone whose GDPR training is expired (>12 months old) or never completed.\n\nEnd with a summary table of all findings.', temperature: 0.2, maxTokens: 4096 } } },
    { id: 'rt-output', type: 'outputNode', position: { x: 1300, y: 250 }, data: { label: 'Compliance Report', type: 'outputNode', config: { outputType: 'chat' } } },
  ],
  edges: [
    { id: 'e-rt-1', source: 'rt-trigger', target: 'rt-database', animated: true },
    { id: 'e-rt-2', source: 'rt-database', target: 'rt-pii', animated: true },
    { id: 'e-rt-3', source: 'rt-pii', target: 'rt-llm', animated: true },
    { id: 'e-rt-4', source: 'rt-llm', target: 'rt-output', animated: true },
  ],
})

