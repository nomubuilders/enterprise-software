import { useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Check,
  Download,
  Server,
  Rocket,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { NomuLogo } from '../common/NomuLogo'
import { getElectronBridge } from '../../services/electronBridge'
import { useElectronStore } from '../../store/electronStore'

const STEPS = ['Welcome', 'Docker', 'Pull Images', 'Start Services', 'Ready']

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const bridge = getElectronBridge()
  const {
    setupStep,
    setSetupStep,
    dockerInstalled,
    dockerVersion,
    setDockerInstalled,
    pullProgress,
    pullMessage,
    setPullProgress,
    servicesHealth,
    allServicesHealthy,
    updateHealth,
  } = useElectronStore()

  // Subscribe to IPC events
  useEffect(() => {
    if (!bridge) return
    const unsub1 = bridge.docker.onPullProgress((data) => {
      setPullProgress(data.progress, data.message)
    })
    const unsub2 = bridge.docker.onHealthUpdate((health) => {
      updateHealth(health)
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [bridge, setPullProgress, updateHealth])

  const checkDocker = useCallback(async () => {
    if (!bridge) return
    const result = await bridge.docker.checkInstalled()
    setDockerInstalled(result.installed, result.version)
  }, [bridge, setDockerInstalled])

  // Auto-check Docker when entering step 1
  useEffect(() => {
    if (setupStep === 1) checkDocker()
  }, [setupStep, checkDocker])

  const handlePullImages = useCallback(async () => {
    if (!bridge) return
    setPullProgress(0, 'Starting pull...')
    try {
      await bridge.docker.pullImages()
      setSetupStep(3)
    } catch (e) {
      setPullProgress(-1, `Pull failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [bridge, setPullProgress, setSetupStep])

  const handleStartServices = useCallback(async () => {
    if (!bridge) return
    try {
      await bridge.docker.startServices()
      // Poll health immediately
      const health = await bridge.docker.getHealth()
      updateHealth(health)
    } catch (e) {
      console.error('[SetupWizard] Start failed:', e)
    }
  }, [bridge, updateHealth])

  // Auto-start services on step 3
  useEffect(() => {
    if (setupStep === 3) handleStartServices()
  }, [setupStep, handleStartServices])

  const handleFinish = useCallback(async () => {
    if (bridge) {
      await bridge.app.setFirstRunComplete()
    }
    onComplete()
  }, [bridge, onComplete])

  const statusDot = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'starting': return 'bg-yellow-500 animate-pulse'
      default: return 'bg-red-500'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--nomu-bg)]">
      {/* Step indicator */}
      <div className="absolute top-8 flex gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                i < setupStep
                  ? 'bg-green-500 text-white'
                  : i === setupStep
                    ? 'bg-[var(--nomu-primary)] text-white'
                    : 'bg-[var(--nomu-surface)] text-[var(--nomu-text-muted)]'
              }`}
            >
              {i < setupStep ? <Check size={14} /> : i + 1}
            </div>
            <span className="hidden text-xs text-[var(--nomu-text-muted)] sm:block">{label}</span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < setupStep ? 'bg-green-500' : 'bg-[var(--nomu-border)]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={setupStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg rounded-2xl bg-[var(--nomu-surface)] p-8 shadow-2xl"
        >
          {/* Step 0: Welcome */}
          {setupStep === 0 && (
            <div className="text-center">
              <NomuLogo className="mx-auto mb-6 h-10" />
              <h1 className="mb-2 font-['Barlow'] text-2xl font-bold text-[var(--nomu-text)]">
                Welcome to Compliance Ready AI
              </h1>
              <p className="mb-8 text-sm text-[var(--nomu-text-muted)]">
                Let's set up your local AI compliance environment. This wizard will guide you through
                installing dependencies and starting services.
              </p>
              <div className="flex items-center justify-center gap-3 rounded-lg bg-[var(--nomu-bg)] p-4 text-sm text-[var(--nomu-text-muted)]">
                <Sparkles size={18} className="text-[var(--nomu-primary)]" />
                100% on-premises. Your data never leaves your machine.
              </div>
              <button
                onClick={() => setSetupStep(1)}
                className="mt-8 w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Step 1: Docker Check */}
          {setupStep === 1 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-[var(--nomu-primary)]/20 p-2">
                  <Server size={20} className="text-[var(--nomu-primary)]" />
                </div>
                <h2 className="font-['Barlow'] text-xl font-bold text-[var(--nomu-text)]">Docker Check</h2>
              </div>
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                Compliance Ready AI uses Docker to run backend services locally.
              </p>

              {dockerInstalled ? (
                <div className="mb-6 rounded-lg bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check size={18} />
                    <span className="font-medium">Docker is installed</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">{dockerVersion}</p>
                </div>
              ) : (
                <div className="mb-6 rounded-lg bg-red-500/10 p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={18} />
                    <span className="font-medium">Docker not found</span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--nomu-text-muted)]">
                    Please install Docker Desktop for your platform:
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {[
                      { label: 'macOS', url: 'https://docs.docker.com/desktop/install/mac-install/' },
                      { label: 'Windows', url: 'https://docs.docker.com/desktop/install/windows-install/' },
                      { label: 'Linux', url: 'https://docs.docker.com/desktop/install/linux/' },
                    ].map(({ label, url }) => (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-[var(--nomu-primary)] hover:underline"
                      >
                        <ExternalLink size={12} /> {label}
                      </a>
                    ))}
                  </div>
                  <button
                    onClick={checkDocker}
                    className="mt-4 w-full rounded-lg bg-[var(--nomu-surface-hover)] py-2 text-sm text-[var(--nomu-text)] transition hover:bg-[var(--nomu-border)]"
                  >
                    Re-check
                  </button>
                </div>
              )}

              <button
                onClick={() => setSetupStep(2)}
                disabled={!dockerInstalled}
                className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Pull Images */}
          {setupStep === 2 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-[var(--nomu-accent)]/20 p-2">
                  <Download size={20} className="text-[var(--nomu-accent)]" />
                </div>
                <h2 className="font-['Barlow'] text-xl font-bold text-[var(--nomu-text)]">Pull Images</h2>
              </div>
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                Download Docker images for all services. This may take a few minutes on first run.
              </p>

              {pullProgress > 0 && (
                <div className="mb-6">
                  <div className="mb-2 flex justify-between text-xs text-[var(--nomu-text-muted)]">
                    <span>Downloading...</span>
                    <span>{Math.round(pullProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--nomu-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--nomu-accent)] transition-all duration-300"
                      style={{ width: `${pullProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 truncate text-xs text-[var(--nomu-text-muted)]">{pullMessage}</p>
                </div>
              )}

              {pullProgress === -1 && (
                <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-xs text-red-400">
                  {pullMessage}
                </div>
              )}

              {pullProgress === 100 ? (
                <button
                  onClick={() => setSetupStep(3)}
                  className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
                >
                  Continue
                </button>
              ) : pullProgress > 0 && pullProgress < 100 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--nomu-text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Pulling images...
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handlePullImages}
                    className="flex-1 rounded-lg bg-[var(--nomu-accent)] py-3 font-medium text-white transition hover:bg-[var(--nomu-accent-hover)]"
                  >
                    Pull Images
                  </button>
                  <button
                    onClick={() => setSetupStep(3)}
                    className="rounded-lg bg-[var(--nomu-surface-hover)] px-4 py-3 text-sm text-[var(--nomu-text-muted)] transition hover:bg-[var(--nomu-border)]"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Start Services */}
          {setupStep === 3 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-[var(--nomu-primary)]/20 p-2">
                  <Server size={20} className="text-[var(--nomu-primary)]" />
                </div>
                <h2 className="font-['Barlow'] text-xl font-bold text-[var(--nomu-text)]">Start Services</h2>
              </div>
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                Starting backend services. This may take a moment...
              </p>

              <div className="mb-6 space-y-2">
                {(['backend', 'postgres', 'redis', 'mongo', 'ollama'] as const).map((name) => {
                  const svc = servicesHealth.find((s) => s.name === name)
                  const st = svc?.status || 'starting'
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg bg-[var(--nomu-bg)] px-4 py-2"
                    >
                      <span className="text-sm capitalize text-[var(--nomu-text)]">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${statusDot(st)}`} />
                        <span className="text-xs capitalize text-[var(--nomu-text-muted)]">{st}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => setSetupStep(4)}
                disabled={!allServicesHealthy}
                className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allServicesHealthy ? 'Continue' : 'Waiting for services...'}
              </button>
            </div>
          )}

          {/* Step 4: Ready */}
          {setupStep === 4 && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <Rocket size={32} className="text-green-400" />
              </div>
              <h2 className="mb-2 font-['Barlow'] text-2xl font-bold text-[var(--nomu-text)]">
                You're All Set!
              </h2>
              <p className="mb-8 text-sm text-[var(--nomu-text-muted)]">
                All services are running. Start building AI compliance workflows by dragging nodes
                from the sidebar onto the canvas.
              </p>
              <button
                onClick={handleFinish}
                className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
              >
                Launch Compliance Ready AI
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
