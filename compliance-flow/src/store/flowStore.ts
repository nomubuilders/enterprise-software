import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react'
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react'

export interface NodeData extends Record<string, unknown> {
  label: string
  type: string
  config?: Record<string, unknown>
}

interface FlowState {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
  setSelectedNode: (node: Node | null) => void
  deleteNode: (nodeId: string) => void
  clearFlow: () => void
}

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'triggerNode',
    position: { x: 100, y: 200 },
    data: { label: 'Manual Trigger', type: 'trigger', config: { triggerType: 'manual' } },
  },
  {
    id: 'db-1',
    type: 'databaseNode',
    position: { x: 350, y: 100 },
    data: { label: 'PostgreSQL', type: 'database', config: { dbType: 'postgresql' } },
  },
  {
    id: 'llm-1',
    type: 'llmNode',
    position: { x: 600, y: 200 },
    data: { label: 'AI Agent', type: 'llm', config: { model: 'llama3.2', temperature: 0.7, maxTokens: 2048 } },
  },
  {
    id: 'pii-1',
    type: 'piiFilterNode',
    position: { x: 350, y: 300 },
    data: { label: 'PII Filter', type: 'pii', config: { mode: 'redact' } },
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 850, y: 200 },
    data: { label: 'Chat Output', type: 'output', config: { outputType: 'chat' } },
  },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'trigger-1', target: 'db-1', animated: true },
  { id: 'e1-4', source: 'trigger-1', target: 'pii-1', animated: true },
  { id: 'e2-3', source: 'db-1', target: 'llm-1', animated: true },
  { id: 'e4-3', source: 'pii-1', target: 'llm-1', animated: true },
  { id: 'e3-5', source: 'llm-1', target: 'output-1', animated: true },
]

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      selectedNode: null,

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) })
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) })
      },

      onConnect: (connection) => {
        set({ edges: addEdge({ ...connection, animated: true }, get().edges) })
      },

      addNode: (node) => {
        set({ nodes: [...get().nodes, node] })
      },

      updateNodeData: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
          ),
        })
      },

      setSelectedNode: (node) => {
        set({ selectedNode: node })
      },

      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((node) => node.id !== nodeId),
          edges: get().edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
          selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode,
        })
      },

      clearFlow: () => {
        set({ nodes: [], edges: [], selectedNode: null })
      },
    }),
    {
      name: 'compliance-flow-storage',
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
    }
  )
)
