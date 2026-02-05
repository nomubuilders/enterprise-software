/**
 * Audit Logger Service
 * Sends container execution audit events to backend for immutable storage
 */

import type { ContainerAuditLog } from '../types/docker'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

class AuditLoggerService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async logExecution(entry: ContainerAuditLog): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/docker/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch {
      // Audit logging should never block execution
      console.error('[Audit] Failed to log container execution:', entry.eventType)
    }
  }

  async logSecurityEvent(
    entry: Omit<ContainerAuditLog, 'exitCode' | 'duration' | 'outputSizeBytes'> & {
      blocked: true
      blockReason: string
    }
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/docker/audit/security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch {
      console.error('[Audit] Failed to log security event:', entry.blockReason)
    }
  }

  async getAuditLogs(filters?: {
    workflowId?: string
    nodeId?: string
    limit?: number
  }): Promise<ContainerAuditLog[]> {
    const params = new URLSearchParams()
    if (filters?.workflowId) params.set('workflowId', filters.workflowId)
    if (filters?.nodeId) params.set('nodeId', filters.nodeId)
    if (filters?.limit) params.set('limit', String(filters.limit))

    try {
      const response = await fetch(`${this.baseUrl}/docker/audit?${params}`)
      if (!response.ok) return []
      return response.json()
    } catch {
      console.error('[Audit] Failed to fetch audit logs')
      return []
    }
  }
}

export const auditLogger = new AuditLoggerService()
export { AuditLoggerService }
