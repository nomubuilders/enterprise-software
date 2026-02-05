/**
 * Container Watchdog Service
 * Monitors active containers and enforces timeout limits
 */

import { useDockerStore } from '../store/dockerStore'
import { dockerApi } from './dockerApi'
import { auditLogger } from './auditLogger'

const WATCHDOG_INTERVAL_MS = 5000 // Check every 5 seconds

let watchdogInterval: ReturnType<typeof setInterval> | null = null

/**
 * Start the watchdog timer. Should be called when the app initializes.
 */
export function startWatchdog(): void {
  if (watchdogInterval) return // Already running

  watchdogInterval = setInterval(() => {
    checkContainerTimeouts()
  }, WATCHDOG_INTERVAL_MS)
}

/**
 * Stop the watchdog timer. Should be called on app cleanup.
 */
export function stopWatchdog(): void {
  if (watchdogInterval) {
    clearInterval(watchdogInterval)
    watchdogInterval = null
  }
}

/**
 * Check all active containers against their configured timeouts.
 * Kills any container that has exceeded its timeout.
 */
async function checkContainerTimeouts(): Promise<void> {
  const store = useDockerStore.getState()
  const activeContainers = store.activeContainers
  const now = Date.now()

  for (const [id, execution] of Object.entries(activeContainers)) {
    if (execution.status !== 'running') continue

    const startedAt = new Date(execution.startedAt).getTime()
    const elapsedMs = now - startedAt

    // Default timeout: 300 seconds (5 minutes)
    const timeoutMs = 300_000 // Will be made configurable per-container

    if (elapsedMs > timeoutMs) {
      console.warn(`[Watchdog] Container ${id} exceeded timeout (${Math.round(elapsedMs / 1000)}s). Killing...`)

      try {
        await dockerApi.stopContainer(id)
        store.completeExecution(id, 137) // 137 = SIGKILL exit code

        // Log timeout as audit event
        await auditLogger.logExecution({
          eventType: 'container_execution',
          workflowId: '',
          workflowRunId: execution.workflowRunId,
          nodeId: execution.nodeId,
          userId: 'system',
          timestamp: new Date().toISOString(),
          image: execution.image,
          imageSha256: execution.imageSha256,
          command: execution.command,
          resourceLimits: { cpu: 0, memory: '0' },
          networkMode: 'none',
          exitCode: 137,
          duration: `${Math.round(elapsedMs / 1000)}s`,
        })
      } catch (error) {
        console.error(`[Watchdog] Failed to kill container ${id}:`, error)
      }
    }
  }
}

export function isWatchdogRunning(): boolean {
  return watchdogInterval !== null
}
