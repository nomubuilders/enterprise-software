import { useState, useCallback } from 'react'
import { Database, CheckCircle2, XCircle } from 'lucide-react'
import { Modal, Button, Input, Select } from '../common'
import { useWorkflowStore } from '../../store/workflowStore'
import { api } from '../../services/api'
import type { DatabaseConfig } from '../../types'

interface DatabaseConfigModalProps {
  isOpen: boolean
  onClose: () => void
  editConfig?: DatabaseConfig
}

const defaultPorts: Record<string, number> = {
  postgresql: 5432,
  mysql: 3306,
  mongodb: 27017,
}

export function DatabaseConfigModal({ isOpen, onClose, editConfig }: DatabaseConfigModalProps) {
  const { addDatabaseConfig, updateDatabaseConfig } = useWorkflowStore()

  const [formData, setFormData] = useState({
    name: editConfig?.name || '',
    type: editConfig?.type || 'postgresql',
    host: editConfig?.host || 'localhost',
    port: editConfig?.port || 5432,
    database: editConfig?.database || '',
    username: editConfig?.username || '',
    password: editConfig?.password || '',
    ssl: editConfig?.ssl || false,
  })

  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null)

  const handleTypeChange = useCallback((type: string) => {
    setFormData((prev) => ({
      ...prev,
      type: type as 'postgresql' | 'mysql' | 'mongodb',
      port: defaultPorts[type] || prev.port,
    }))
  }, [])

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      // Use real API to test connection
      const result = await api.testDatabaseConnection({
        type: formData.type as 'postgresql' | 'mysql' | 'mongodb',
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        password: formData.password,
        ssl: formData.ssl,
      })

      setTestResult({
        success: result.success,
        message: result.message,
        version: result.version,
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    setIsTesting(false)
  }, [formData])

  const handleSave = useCallback(() => {
    if (editConfig) {
      updateDatabaseConfig(editConfig.id, formData)
    } else {
      addDatabaseConfig(formData as Omit<DatabaseConfig, 'id' | 'status'>)
    }
    onClose()
  }, [editConfig, formData, addDatabaseConfig, updateDatabaseConfig, onClose])

  const dbTypeOptions = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'mongodb', label: 'MongoDB' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Database Connection" size="lg">
      <div className="space-y-4">
        {/* Connection Name */}
        <Input
          label="Connection Name"
          placeholder="My Production Database"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        {/* Database Type */}
        <Select
          label="Database Type"
          options={dbTypeOptions}
          value={formData.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        />

        {/* Host & Port */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Host"
              placeholder="localhost"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            />
          </div>
          <Input
            label="Port"
            type="number"
            value={formData.port}
            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Database Name */}
        <Input
          label="Database Name"
          placeholder="my_database"
          value={formData.database}
          onChange={(e) => setFormData({ ...formData, database: e.target.value })}
        />

        {/* Username & Password */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Username"
            placeholder="db_user"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        {/* SSL Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.ssl}
            onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm text-slate-300">Use SSL/TLS connection</span>
        </label>

        {/* Connection String Preview */}
        <div className="rounded-lg bg-slate-900 p-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Connection String Preview</p>
          <code className="text-xs text-slate-400 break-all">
            {formData.type === 'mongodb'
              ? `mongodb://${formData.username}:****@${formData.host}:${formData.port}/${formData.database}`
              : `${formData.type}://${formData.username}:****@${formData.host}:${formData.port}/${formData.database}`}
          </code>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg p-3 ${
              testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
            }`}
          >
            {testResult.success ? (
              <>
                <CheckCircle2 size={18} />
                <div className="flex-1">
                  <span className="text-sm">Connection successful!</span>
                  {testResult.version && (
                    <p className="text-xs text-green-500/70 mt-0.5">Version: {testResult.version}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle size={18} />
                <span className="text-sm">{testResult.message || 'Connection failed. Please check your credentials.'}</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <Button
            variant="ghost"
            onClick={handleTestConnection}
            disabled={isTesting || !formData.host || !formData.database}
            isLoading={isTesting}
            leftIcon={<Database size={16} />}
          >
            Test Connection
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!formData.name || !formData.host || !formData.database}
            >
              {editConfig ? 'Update' : 'Save'} Connection
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
