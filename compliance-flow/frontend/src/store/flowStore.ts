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
  selectedNodeId: string | null
  isEditMode: boolean
  selectedEdgeId: string | null
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
  setSelectedNode: (id: string | null) => void
  deleteNode: (nodeId: string) => void
  toggleEditMode: () => void
  setSelectedEdge: (id: string | null) => void
  deleteEdge: (edgeId: string) => void
  clearFlow: () => void
}

const initialNodes: Node[] = []

const initialEdges: Edge[] = []

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      selectedNodeId: null,
      isEditMode: false,
      selectedEdgeId: null,

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

      setSelectedNode: (id) => {
        set({ selectedNodeId: id })
      },

      toggleEditMode: () => {
        const newMode = !get().isEditMode
        set({ isEditMode: newMode, selectedEdgeId: newMode ? get().selectedEdgeId : null })
      },

      setSelectedEdge: (id) => {
        set({ selectedEdgeId: id })
      },

      deleteEdge: (edgeId) => {
        set({
          edges: get().edges.filter((edge) => edge.id !== edgeId),
          selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
        })
      },

      deleteNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((node) => node.id !== nodeId),
          edges: get().edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
          selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        })
      },

      clearFlow: () => {
        set({ nodes: [], edges: [], selectedNodeId: null })
      },
    }),
    {
      name: 'compliance-flow-storage',
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
    }
  )
)

/** Derives selectedNode from nodes + selectedNodeId. Always fresh. */
export const useSelectedNode = (): Node | null => {
  return useFlowStore((state) =>
    state.selectedNodeId ? state.nodes.find((n) => n.id === state.selectedNodeId) ?? null : null
  )
}
