export { LLMNode } from './LLMNode'
export { DatabaseNode } from './DatabaseNode'
export { TriggerNode } from './TriggerNode'
export { PIIFilterNode } from './PIIFilterNode'
export { OutputNode } from './OutputNode'
export { DockerContainerNode } from './DockerContainerNode'
export { DocumentNode } from './DocumentNode'

import { LLMNode } from './LLMNode'
import { DatabaseNode } from './DatabaseNode'
import { TriggerNode } from './TriggerNode'
import { PIIFilterNode } from './PIIFilterNode'
import { OutputNode } from './OutputNode'
import { DockerContainerNode } from './DockerContainerNode'
import { DocumentNode } from './DocumentNode'

export const nodeTypes = {
  llmNode: LLMNode,
  databaseNode: DatabaseNode,
  triggerNode: TriggerNode,
  piiFilterNode: PIIFilterNode,
  outputNode: OutputNode,
  dockerContainerNode: DockerContainerNode,
  documentNode: DocumentNode,
}
