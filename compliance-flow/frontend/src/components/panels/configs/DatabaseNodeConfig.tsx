import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { CheckCircle2, XCircle, RefreshCw, Save } from 'lucide-react'
import { Button, Input } from '../../common'
import { api } from '../../../services/api'

export function DatabaseNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const dbType = (config.dbType as string) || 'postgresql'

  const [connection, setConnection] = useState({
    host: (config.host as string) ?? 'localhost',
    port: (config.port as number) ?? (dbType === 'postgresql' ? 5432 : dbType === 'mysql' ? 3306 : 27017),
    database: (config.database as string) ?? '',
    username: (config.username as string) ?? '',
    password: (config.password as string) ?? '',
    ssl: (config.ssl as boolean) ?? false,
  })

  const [query, setQuery] = useState((config.query as string) ?? '')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null)
  const [tables, setTables] = useState<string[]>([])
  const [showSaved, setShowSaved] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await api.testDatabaseConnection({
        type: dbType as 'postgresql' | 'mysql' | 'mongodb',
        ...connection,
      })

      setTestResult({
        success: result.success,
        message: result.message,
        version: result.version,
      })

      // If connected, fetch tables
      if (result.success) {
        try {
          const tablesResult = await api.listTables({
            type: dbType as 'postgresql' | 'mysql' | 'mongodb',
            ...connection,
          })
          if (tablesResult.success) {
            setTables(tablesResult.tables.map((t) => t.name))
          }
        } catch {
          // Ignore table fetch errors
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    setIsTesting(false)
  }

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        dbType,
        ...connection,
        query,
        isConnected: testResult?.success || false,
      },
    })
    // Show saved confirmation
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Saved confirmation */}
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* Connection Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Connection</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                label="Host"
                value={connection.host}
                onChange={(e) => setConnection({ ...connection, host: e.target.value })}
                placeholder="localhost"
              />
            </div>
            <Input
              label="Port"
              type="number"
              value={connection.port}
              onChange={(e) => setConnection({ ...connection, port: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Input
            label="Database"
            value={connection.database}
            onChange={(e) => setConnection({ ...connection, database: e.target.value })}
            placeholder="my_database"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Username"
              value={connection.username}
              onChange={(e) => setConnection({ ...connection, username: e.target.value })}
              placeholder="user"
            />
            <Input
              label="Password"
              type="password"
              value={connection.password}
              onChange={(e) => setConnection({ ...connection, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={connection.ssl}
              onChange={(e) => setConnection({ ...connection, ssl: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]"
            />
            <span className="text-sm text-[var(--nomu-text-muted)]">Use SSL/TLS</span>
          </label>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTestConnection}
          disabled={isTesting || !connection.host || !connection.database}
          isLoading={isTesting}
          leftIcon={<RefreshCw size={14} />}
        >
          Test Connection
        </Button>
        {testResult && (
          <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{testResult.success ? 'Connected' : 'Failed'}</span>
            {testResult.version && <span className="text-xs text-[var(--nomu-text-muted)]">({testResult.version})</span>}
          </div>
        )}
      </div>

      {/* Query */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Query</h3>
        {tables.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-[var(--nomu-text-muted)] mb-1">Available tables:</p>
            <div className="flex flex-wrap gap-1">
              {tables.slice(0, 8).map((table) => (
                <span key={table} className="rounded bg-[var(--nomu-surface)] px-2 py-0.5 text-xs text-[var(--nomu-text-muted)]">
                  {table}
                </span>
              ))}
              {tables.length > 8 && (
                <span className="text-xs text-[var(--nomu-text-muted)]">+{tables.length - 8} more</span>
              )}
            </div>
          </div>
        )}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
          rows={4}
          placeholder="SELECT * FROM table_name LIMIT 10"
        />
      </div>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
