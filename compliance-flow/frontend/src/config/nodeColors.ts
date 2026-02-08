type NodeCategory = 'primary' | 'accent' | 'compliance' | 'security' | 'integration' | 'testing'

const categoryClasses: Record<NodeCategory, string> = {
  primary: 'bg-[var(--nomu-primary)]',
  accent: 'bg-[var(--nomu-accent)]',
  compliance: 'bg-[var(--nomu-cat-compliance)]',
  security: 'bg-[var(--nomu-cat-security)]',
  integration: 'bg-[var(--nomu-cat-integration)]',
  testing: 'bg-[var(--nomu-cat-testing)]',
}

const nodeCategories: Record<string, NodeCategory> = {
  // Primary — Core AI & Data nodes
  llmNode: 'primary',
  personalityNode: 'primary',
  codeReviewNode: 'primary',
  mcpContextNode: 'primary',
  databaseNode: 'primary',
  documentNode: 'primary',
  spreadsheetNode: 'primary',
  webSearchNode: 'primary',
  dockerContainerNode: 'primary',

  // Accent — Triggers, Actions, Workflow Control
  triggerNode: 'accent',
  piiFilterNode: 'accent',
  conditionalNode: 'accent',
  approvalGateNode: 'accent',
  outputNode: 'accent',
  emailInboxNode: 'accent',

  // Compliance — Audit, Governance, Frameworks
  auditNode: 'compliance',
  jiraComplianceNode: 'compliance',
  complianceDashboardNode: 'compliance',
  modelRegistryNode: 'compliance',
  evidenceCollectionNode: 'compliance',

  // Security — Encryption, Healthcare, Safety
  encryptionNode: 'security',
  phiClassificationNode: 'security',
  consentManagementNode: 'security',
  fairLendingNode: 'security',
  claimsAuditNode: 'security',

  // Integration — Communication, Connectors, Enterprise
  notificationNode: 'integration',
  webhookGatewayNode: 'integration',
  subWorkflowNode: 'integration',
  slackComplianceNode: 'integration',
  microsoftTeamsDORANode: 'integration',
  databaseCreatorNode: 'integration',
  localFolderStorageNode: 'integration',
  cloudDocumentNode: 'integration',
  sapERPNode: 'integration',
  voiceAssistantNode: 'integration',

  // Testing — AI Quality, Bias, Red Teaming
  biasTestingNode: 'testing',
  explainabilityNode: 'testing',
  redTeamingNode: 'testing',
  driftDetectionNode: 'testing',
}

export function getNodeColorClass(nodeType: string): string {
  const category = nodeCategories[nodeType]
  return category ? categoryClasses[category] : categoryClasses.primary
}
