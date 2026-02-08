import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Lock } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const EncryptionNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const algorithm = (nodeData.config?.algorithm as string) ?? 'aes-256-gcm'
  const operation = (nodeData.config?.operation as string) ?? 'encrypt'
  const keyManaged = !!(nodeData.config?.keyId)

  const algLabels: Record<string, string> = {
    'aes-256-gcm': 'AES-256-GCM',
    'aes-256-cbc': 'AES-256-CBC',
    'rsa-oaep': 'RSA-OAEP',
    'chacha20': 'ChaCha20-Poly1305',
  }

  return (
    <BaseNode {...props} icon={<Lock size={16} />} color={getNodeColorClass('encryptionNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Algorithm:</span>
          <span className="text-emerald-400">{algLabels[algorithm] || algorithm}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Operation:</span>
          <span className="text-[var(--nomu-text)] capitalize">{operation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Key:</span>
          <span className={keyManaged ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {keyManaged ? '● Managed' : '○ Not set'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

EncryptionNode.displayName = 'EncryptionNode'
