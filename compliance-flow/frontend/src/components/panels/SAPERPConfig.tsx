import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { CheckCircle2, Save } from 'lucide-react'
import { Button, Input, Select } from '../common'

interface SAPERPConfigProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}

export function SAPERPConfig({ node, onUpdate }: SAPERPConfigProps) {
  const config = ((node.data as Record<string, unknown>).config as Record<string, unknown>) || {}

  const [sapUrl, setSapUrl] = useState((config.sapUrl as string) || '')
  const [clientNumber, setClientNumber] = useState((config.clientNumber as string) || '100')
  const [authType, setAuthType] = useState((config.authType as string) || 'oauth')
  const [username, setUsername] = useState((config.username as string) || '')
  const [password, setPassword] = useState((config.password as string) || '')
  const [reportType, setReportType] = useState((config.reportType as string) || 'balance_sheet')
  const [fiscalYear, setFiscalYear] = useState((config.fiscalYear as string) || new Date().getFullYear().toString())
  const [companyCode, setCompanyCode] = useState((config.companyCode as string) || '1000')
  const [costCenters, setCostCenters] = useState((config.costCenters as string) || '')
  const [includeActuals, setIncludeActuals] = useState((config.includeActuals as boolean) ?? true)
  const [includeBudget, setIncludeBudget] = useState((config.includeBudget as boolean) ?? false)
  const [customQuery, setCustomQuery] = useState((config.customQuery as string) || '')
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        sapUrl,
        clientNumber,
        authType,
        username,
        password,
        reportType,
        fiscalYear,
        companyCode,
        costCenters,
        includeActuals,
        includeBudget,
        customQuery,
      },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* SAP Connection */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--nomu-text)] uppercase tracking-wider">SAP Connection</h3>
        <div className="space-y-3">
          <Input label="SAP URL" value={sapUrl} onChange={setSapUrl} placeholder="https://sap-system.company.com" />
          <Input label="Client Number" value={clientNumber} onChange={setClientNumber} placeholder="100" />
          <Select
            label="Authentication"
            value={authType}
            onChange={setAuthType}
            options={[
              { value: 'oauth', label: 'OAuth 2.0' },
              { value: 'basic', label: 'Basic Auth' },
              { value: 'x509', label: 'X.509 Certificate' },
            ]}
          />
          {authType === 'basic' && (
            <>
              <Input label="Username" value={username} onChange={setUsername} placeholder="SAP username" />
              <Input label="Password" value={password} onChange={setPassword} placeholder="SAP password" type="password" />
            </>
          )}
        </div>
      </div>

      {/* Report Generation */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--nomu-text)] uppercase tracking-wider">Report Generation</h3>
        <div className="space-y-3">
          <Select
            label="Report Type"
            value={reportType}
            onChange={setReportType}
            options={[
              { value: 'balance_sheet', label: 'Balance Sheet' },
              { value: 'profit_loss', label: 'Profit & Loss' },
              { value: 'cost_center', label: 'Cost Center Analysis' },
              { value: 'general_ledger', label: 'General Ledger' },
              { value: 'custom_odata', label: 'Custom OData Query' },
            ]}
          />
          <Input label="Fiscal Year" value={fiscalYear} onChange={setFiscalYear} placeholder="2025" />
          <Input label="Company Code" value={companyCode} onChange={setCompanyCode} placeholder="1000" />
          {reportType === 'cost_center' && (
            <Input label="Cost Centers" value={costCenters} onChange={setCostCenters} placeholder="CC100, CC200, CC300" />
          )}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--nomu-text)]">
              <input
                type="checkbox"
                checked={includeActuals}
                onChange={(e) => setIncludeActuals(e.target.checked)}
                className="rounded border-[var(--nomu-border)]"
              />
              Include Actuals
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--nomu-text)]">
              <input
                type="checkbox"
                checked={includeBudget}
                onChange={(e) => setIncludeBudget(e.target.checked)}
                className="rounded border-[var(--nomu-border)]"
              />
              Include Budget
            </label>
          </div>
        </div>
      </div>

      {/* Advanced */}
      {reportType === 'custom_odata' && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--nomu-text)] uppercase tracking-wider">Advanced</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--nomu-text)]">Custom OData Query</label>
              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="$filter=CompanyCode eq '1000' and FiscalYear eq '2025'"
                rows={3}
                className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
              />
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
