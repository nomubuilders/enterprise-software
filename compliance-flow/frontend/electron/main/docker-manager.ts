import { execFile, spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { createServer } from 'net'

const execFileAsync = promisify(execFile)

export interface ServiceHealth {
  name: string
  port: number
  status: 'running' | 'starting' | 'stopped' | 'error'
  containerId?: string
}

export interface HealthReport {
  services: ServiceHealth[]
  allHealthy: boolean
}

const SERVICE_PORTS: Record<string, number> = {
  backend: 8000,
  postgres: 5432,
  redis: 6379,
  mongo: 27017,
  ollama: 11434,
}

export class DockerManager {
  private healthInterval: ReturnType<typeof setInterval> | null = null
  private logProcess: ChildProcess | null = null

  private getComposePath(): string {
    if (is.dev) {
      return join(__dirname, '../../electron/resources/docker-compose.prod.yml')
    }
    return join(process.resourcesPath, 'docker-compose.prod.yml')
  }

  private getComposeArgs(): string[] {
    return ['-f', this.getComposePath()]
  }

  async checkDockerInstalled(): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execFileAsync('docker', ['--version'])
      return { installed: true, version: stdout.trim() }
    } catch {
      return { installed: false, error: 'Docker not found. Please install Docker Desktop.' }
    }
  }

  async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close(() => resolve(true))
      })
      server.listen(port, '127.0.0.1')
    })
  }

  async checkPortConflicts(): Promise<{ port: number; service: string }[]> {
    const conflicts: { port: number; service: string }[] = []
    for (const [service, port] of Object.entries(SERVICE_PORTS)) {
      const available = await this.checkPortAvailable(port)
      if (!available) {
        conflicts.push({ port, service })
      }
    }
    return conflicts
  }

  async pullImages(): Promise<void> {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    const args = [...this.getComposeArgs(), 'pull']
    const proc = spawn('docker', ['compose', ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

    let totalLines = 0
    const handleOutput = (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      totalLines += lines.length
      for (const line of lines) {
        win.webContents.send('docker:pull-progress', {
          progress: Math.min(totalLines * 2, 95),
          message: line.trim(),
        })
      }
    }

    proc.stdout?.on('data', handleOutput)
    proc.stderr?.on('data', handleOutput)

    return new Promise((resolve, reject) => {
      proc.on('close', (code) => {
        if (code === 0) {
          win.webContents.send('docker:pull-progress', { progress: 100, message: 'Pull complete' })
          resolve()
        } else {
          reject(new Error(`docker compose pull exited with code ${code}`))
        }
      })
    })
  }

  async startServices(): Promise<void> {
    const args = [...this.getComposeArgs(), 'up', '-d']
    await execFileAsync('docker', ['compose', ...args], { timeout: 120_000 })
    this.startHealthPolling()
  }

  async stopServices(): Promise<void> {
    this.stopHealthPolling()
    this.stopLogStream()
    try {
      const args = [...this.getComposeArgs(), 'down']
      await execFileAsync('docker', ['compose', ...args], { timeout: 60_000 })
    } catch {
      // Ignore errors on shutdown
    }
  }

  async getServiceHealth(): Promise<HealthReport> {
    const services: ServiceHealth[] = []

    try {
      const args = [...this.getComposeArgs(), 'ps', '--format', 'json']
      const { stdout } = await execFileAsync('docker', ['compose', ...args])

      // docker compose ps --format json outputs one JSON object per line
      const containers = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      for (const [name, port] of Object.entries(SERVICE_PORTS)) {
        const container = containers.find(
          (c: Record<string, string>) =>
            c.Service === name || c.Name?.includes(name)
        )

        if (container) {
          const state = (container.State || '').toLowerCase()
          services.push({
            name,
            port,
            status: state === 'running' ? 'running' : state.includes('start') ? 'starting' : 'error',
            containerId: container.ID,
          })
        } else {
          services.push({ name, port, status: 'stopped' })
        }
      }
    } catch {
      // Docker not running or compose file not found
      for (const [name, port] of Object.entries(SERVICE_PORTS)) {
        services.push({ name, port, status: 'stopped' })
      }
    }

    return {
      services,
      allHealthy: services.every((s) => s.status === 'running'),
    }
  }

  async getServiceLogs(service: string): Promise<string> {
    try {
      const args = [...this.getComposeArgs(), 'logs', '--tail', '100', service]
      const { stdout } = await execFileAsync('docker', ['compose', ...args])
      return stdout
    } catch {
      return ''
    }
  }

  streamLogs(service: string): void {
    this.stopLogStream()
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    const args = [...this.getComposeArgs(), 'logs', '-f', '--tail', '50', service]
    this.logProcess = spawn('docker', ['compose', ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

    const handleData = (data: Buffer) => {
      win.webContents.send('docker:log-output', { service, log: data.toString() })
    }

    this.logProcess.stdout?.on('data', handleData)
    this.logProcess.stderr?.on('data', handleData)
  }

  stopLogStream(): void {
    if (this.logProcess) {
      this.logProcess.kill()
      this.logProcess = null
    }
  }

  private startHealthPolling(): void {
    this.stopHealthPolling()
    this.healthInterval = setInterval(async () => {
      const health = await this.getServiceHealth()
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        win.webContents.send('docker:health-update', health)
      }
    }, 10_000)
  }

  private stopHealthPolling(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval)
      this.healthInterval = null
    }
  }
}
