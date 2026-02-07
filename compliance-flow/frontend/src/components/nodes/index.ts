import { LLMNode } from './LLMNode'
import { DatabaseNode } from './DatabaseNode'
import { TriggerNode } from './TriggerNode'
import { PIIFilterNode } from './PIIFilterNode'
import { OutputNode } from './OutputNode'
import { DockerContainerNode } from './DockerContainerNode'
import { DocumentNode } from './DocumentNode'
import { SpreadsheetNode } from './SpreadsheetNode'
import { EmailInboxNode } from './EmailInboxNode'
import { WebSearchNode } from './WebSearchNode'
import { PersonalityNode } from './PersonalityNode'
import { AuditNode } from './AuditNode'
import { CodeReviewNode } from './CodeReviewNode'
import { MCPContextNode } from './MCPContextNode'
import { ConditionalNode } from './ConditionalNode'
import { ApprovalGateNode } from './ApprovalGateNode'
import { ComplianceDashboardNode } from './ComplianceDashboardNode'
import { ModelRegistryNode } from './ModelRegistryNode'
import { EvidenceCollectionNode } from './EvidenceCollectionNode'
import { BiasTestingNode } from './BiasTestingNode'
import { ExplainabilityNode } from './ExplainabilityNode'
import { RedTeamingNode } from './RedTeamingNode'
import { DriftDetectionNode } from './DriftDetectionNode'
import { NotificationNode } from './NotificationNode'
import { EncryptionNode } from './EncryptionNode'
import { WebhookGatewayNode } from './WebhookGatewayNode'
import { SubWorkflowNode } from './SubWorkflowNode'
import { PHIClassificationNode } from './PHIClassificationNode'
import { FairLendingNode } from './FairLendingNode'
import { ClaimsAuditNode } from './ClaimsAuditNode'
import { ConsentManagementNode } from './ConsentManagementNode'
import { SlackComplianceNode } from './SlackComplianceNode'
import { MicrosoftTeamsDORANode } from './MicrosoftTeamsDORANode'
import { DatabaseCreatorNode } from './DatabaseCreatorNode'
import { LocalFolderStorageNode } from './LocalFolderStorageNode'
import { CloudDocumentNode } from './CloudDocumentNode'
import { JiraComplianceNode } from './JiraComplianceNode'
import { SAPERPNode } from './SAPERPNode'

export {
  LLMNode,
  DatabaseNode,
  TriggerNode,
  PIIFilterNode,
  OutputNode,
  DockerContainerNode,
  DocumentNode,
  SpreadsheetNode,
  EmailInboxNode,
  WebSearchNode,
  PersonalityNode,
  AuditNode,
  CodeReviewNode,
  MCPContextNode,
  ConditionalNode,
  ApprovalGateNode,
  ComplianceDashboardNode,
  ModelRegistryNode,
  EvidenceCollectionNode,
  BiasTestingNode,
  ExplainabilityNode,
  RedTeamingNode,
  DriftDetectionNode,
  NotificationNode,
  EncryptionNode,
  WebhookGatewayNode,
  SubWorkflowNode,
  PHIClassificationNode,
  FairLendingNode,
  ClaimsAuditNode,
  ConsentManagementNode,
  SlackComplianceNode,
  MicrosoftTeamsDORANode,
  DatabaseCreatorNode,
  LocalFolderStorageNode,
  CloudDocumentNode,
  JiraComplianceNode,
  SAPERPNode,
}

export const nodeTypes = {
  llmNode: LLMNode,
  databaseNode: DatabaseNode,
  triggerNode: TriggerNode,
  piiFilterNode: PIIFilterNode,
  outputNode: OutputNode,
  dockerContainerNode: DockerContainerNode,
  documentNode: DocumentNode,
  spreadsheetNode: SpreadsheetNode,
  emailInboxNode: EmailInboxNode,
  webSearchNode: WebSearchNode,
  personalityNode: PersonalityNode,
  auditNode: AuditNode,
  codeReviewNode: CodeReviewNode,
  mcpContextNode: MCPContextNode,
  conditionalNode: ConditionalNode,
  approvalGateNode: ApprovalGateNode,
  complianceDashboardNode: ComplianceDashboardNode,
  modelRegistryNode: ModelRegistryNode,
  evidenceCollectionNode: EvidenceCollectionNode,
  biasTestingNode: BiasTestingNode,
  explainabilityNode: ExplainabilityNode,
  redTeamingNode: RedTeamingNode,
  driftDetectionNode: DriftDetectionNode,
  notificationNode: NotificationNode,
  encryptionNode: EncryptionNode,
  webhookGatewayNode: WebhookGatewayNode,
  subWorkflowNode: SubWorkflowNode,
  phiClassificationNode: PHIClassificationNode,
  fairLendingNode: FairLendingNode,
  claimsAuditNode: ClaimsAuditNode,
  consentManagementNode: ConsentManagementNode,
  slackComplianceNode: SlackComplianceNode,
  microsoftTeamsDORANode: MicrosoftTeamsDORANode,
  databaseCreatorNode: DatabaseCreatorNode,
  localFolderStorageNode: LocalFolderStorageNode,
  cloudDocumentNode: CloudDocumentNode,
  jiraComplianceNode: JiraComplianceNode,
  sapERPNode: SAPERPNode,
}
