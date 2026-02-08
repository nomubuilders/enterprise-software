import { useCallback, useRef, useMemo, useEffect } from 'react'
import type { DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from '@xyflow/react'
import type { ReactFlowInstance, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useFlowStore } from '../../store/flowStore'
import { nodeTypes } from '../nodes'

// Generate unique IDs that won't clash with persisted nodes
const getId = () => `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNode,
    isEditMode,
    selectedEdgeId,
    setSelectedEdge,
    deleteEdge,
    deleteNode,
    updateNodeData,
  } = useFlowStore()

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance
  }, [])

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const data = event.dataTransfer.getData('application/reactflow')
      if (!data || !reactFlowInstance.current || !reactFlowWrapper.current) return

      const template = JSON.parse(data)

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode = {
        id: getId(),
        type: template.type,
        position,
        data: {
          label: template.label,
          type: template.type,
          config: template.config,
        },
      }

      addNode(newNode)
    },
    [addNode]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (isEditMode) {
        setSelectedEdge(edge.id)
      }
    },
    [isEditMode, setSelectedEdge]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [setSelectedNode, setSelectedEdge])

  // Check if a node is properly configured
  const isNodeConfigured = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return false

    const config = (node.data as Record<string, unknown>).config as Record<string, unknown> | undefined
    if (!config) return false

    switch (node.type) {
      case 'databaseNode':
        return !!(config.host && config.database && config.username)
      case 'llmNode':
        return !!(config.model)
      case 'outputNode':
        return !!(config.outputType)
      case 'triggerNode':
        return !!(config.triggerType)
      case 'piiFilterNode':
        return !!(config.mode)
      default:
        return true
    }
  }, [nodes])

  // Keyboard shortcuts: Delete, D (disable), Ctrl+D (duplicate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const { selectedNodeId, nodes: currentNodes, selectedEdgeId: currentEdgeId } = useFlowStore.getState()

      // Delete / Backspace — remove selected node or edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault()
          deleteNode(selectedNodeId)
        } else if (isEditMode && currentEdgeId) {
          e.preventDefault()
          deleteEdge(currentEdgeId)
        }
      }

      // D — toggle node disabled
      if (e.key === 'd' || e.key === 'D') {
        if (selectedNodeId && !e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          const node = currentNodes.find((n) => n.id === selectedNodeId)
          if (node) {
            const nodeData = node.data as Record<string, unknown>
            updateNodeData(selectedNodeId, { disabled: !nodeData.disabled })
          }
        }
      }

      // Ctrl/Cmd+D — duplicate selected node
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedNodeId) {
          e.preventDefault()
          const node = currentNodes.find((n) => n.id === selectedNodeId)
          if (node) {
            const newNode = {
              id: getId(),
              type: node.type,
              position: { x: node.position.x + 30, y: node.position.y + 30 },
              data: { ...node.data },
            }
            addNode(newNode)
            setSelectedNode(newNode.id)
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditMode, deleteEdge, deleteNode, addNode, setSelectedNode, updateNodeData])

  // Enhance edges with visual feedback based on node configuration
  const enhancedEdges = useMemo(() => {
    return edges.map((edge): Edge => {
      const sourceConfigured = isNodeConfigured(edge.source)
      const targetConfigured = isNodeConfigured(edge.target)
      const bothConfigured = sourceConfigured && targetConfigured
      const isSelected = isEditMode && edge.id === selectedEdgeId

      return {
        ...edge,
        animated: bothConfigured && !isSelected,
        style: {
          stroke: isSelected ? '#ef4444' : bothConfigured ? 'var(--nomu-primary)' : 'var(--nomu-text-muted)',
          strokeWidth: isSelected ? 4 : bothConfigured ? 3 : 2,
          opacity: bothConfigured || isSelected ? 1 : 0.5,
          strokeDasharray: isSelected ? '8 4' : undefined,
        },
      }
    })
  }, [edges, isNodeConfigured, isEditMode, selectedEdgeId])

  return (
    <div ref={reactFlowWrapper} className="h-full w-full" data-tutorial="canvas">
      <ReactFlow
        nodes={nodes}
        edges={enhancedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgesFocusable={isEditMode}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'var(--nomu-text-muted)', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: 'var(--nomu-text-muted)', strokeWidth: 2 }}
        className="bg-[var(--nomu-bg)]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--nomu-dots)"
        />
        <Controls
          className="!bg-[var(--nomu-surface)] !border-[var(--nomu-border)] !rounded-lg !shadow-lg"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'llmNode':
              case 'databaseNode':
              case 'dockerContainerNode':
              case 'documentNode':
              case 'outputNode':
                return '#4004DA'
              case 'triggerNode':
              case 'piiFilterNode':
                return '#FF6C1D'
              default:
                return '#4D4D4D'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-[var(--nomu-surface)] !border-[var(--nomu-border)] !rounded-lg"
          position="bottom-left"
          style={{ left: 10, bottom: 50 }}
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-[var(--nomu-text-muted)]">Drag nodes from the sidebar</p>
            <p className="text-sm text-[var(--nomu-text-muted)]">to start building your workflow</p>
          </div>
        </div>
      )}
    </div>
  )
}
