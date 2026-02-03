import { useCallback, useRef, useMemo } from 'react'
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
      const bounds = reactFlowWrapper.current.getBoundingClientRect()

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
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
      setSelectedNode(node)
    },
    [setSelectedNode]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

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

  // Enhance edges with visual feedback based on node configuration
  const enhancedEdges = useMemo(() => {
    return edges.map((edge): Edge => {
      const sourceConfigured = isNodeConfigured(edge.source)
      const targetConfigured = isNodeConfigured(edge.target)
      const bothConfigured = sourceConfigured && targetConfigured

      return {
        ...edge,
        animated: bothConfigured,
        style: {
          stroke: bothConfigured ? '#06b6d4' : '#64748b',
          strokeWidth: bothConfigured ? 3 : 2,
          opacity: bothConfigured ? 1 : 0.5,
        },
      }
    })
  }, [edges, isNodeConfigured])

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
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
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
        className="bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#334155"
        />
        <Controls
          className="!bg-slate-800 !border-slate-700 !rounded-lg !shadow-lg"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'llmNode':
                return '#9333ea'
              case 'databaseNode':
                return '#2563eb'
              case 'triggerNode':
                return '#16a34a'
              case 'piiFilterNode':
                return '#d97706'
              case 'outputNode':
                return '#0891b2'
              default:
                return '#64748b'
            }
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-slate-800 !border-slate-700 !rounded-lg"
          position="bottom-left"
          style={{ left: 60, bottom: 10 }}
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-slate-500">Drag nodes from the sidebar</p>
            <p className="text-sm text-slate-600">to start building your workflow</p>
          </div>
        </div>
      )}
    </div>
  )
}
