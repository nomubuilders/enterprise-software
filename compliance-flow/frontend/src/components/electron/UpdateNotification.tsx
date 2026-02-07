import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { getElectronBridge } from '../../services/electronBridge'

export function UpdateNotification() {
  const bridge = getElectronBridge()
  const [updateInfo, setUpdateInfo] = useState<{ version: string } | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!bridge) return
    const unsub1 = bridge.updater.onUpdateAvailable((info) => {
      setUpdateInfo(info as { version: string })
    })
    const unsub2 = bridge.updater.onUpdateDownloaded(() => {
      setDownloaded(true)
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [bridge])

  if (!updateInfo || dismissed) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-3 rounded-lg bg-[var(--nomu-surface)] px-4 py-3 shadow-2xl">
      <Download size={16} className="text-[var(--nomu-primary)]" />
      <div className="text-sm">
        <span className="text-[var(--nomu-text)]">v{updateInfo.version} available</span>
        {downloaded ? (
          <button
            onClick={() => bridge?.updater.installUpdate()}
            className="ml-3 rounded bg-[var(--nomu-primary)] px-2 py-0.5 text-xs text-white hover:bg-[var(--nomu-primary-hover)]"
          >
            Restart to update
          </button>
        ) : (
          <button
            onClick={() => bridge?.updater.downloadUpdate()}
            className="ml-3 rounded bg-[var(--nomu-primary)] px-2 py-0.5 text-xs text-white hover:bg-[var(--nomu-primary-hover)]"
          >
            Download
          </button>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]">
        <X size={14} />
      </button>
    </div>
  )
}
