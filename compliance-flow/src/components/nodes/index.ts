export { LLMNode } from './LLMNode'
export { DatabaseNode } from './DatabaseNode'
export { TriggerNode } from './TriggerNode'
export { PIIFilterNode } from './PIIFilterNode'
export { OutputNode } from './OutputNode'

import { LLMNode } from './LLMNode'
import { DatabaseNode } from './DatabaseNode'
import { TriggerNode } from './TriggerNode'
import { PIIFilterNode } from './PIIFilterNode'
import { OutputNode } from './OutputNode'

export const nodeTypes = {
  llmNode: LLMNode,
  databaseNode: DatabaseNode,
  triggerNode: TriggerNode,
  piiFilterNode: PIIFilterNode,
  outputNode: OutputNode,
}
