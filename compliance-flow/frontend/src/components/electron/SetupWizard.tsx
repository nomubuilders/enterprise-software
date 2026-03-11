import { useState, useCallback, useEffect } from 'react'
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
  Brain,
  Monitor,
  Apple,
  Terminal,
  Copy,
  CheckCircle2,
  Shield,
} from 'lucide-react'
import { NomuLogo } from '../common/NomuLogo'
import { getElectronBridge } from '../../services/electronBridge'
import { useElectronStore } from '../../store/electronStore'

const STEPS = ['Welcome', 'Prerequisites', 'Setup', 'AI Model', 'Ready']

type Platform = 'mac' | 'windows' | 'linux'

const DOCKER_URLS: Record<Platform, { label: string; url: string; size: string }> = {
  mac: {
    label: 'Docker Desktop for macOS',
    url: 'https://docs.docker.com/desktop/install/mac-install/',
    size: '~600 MB',
  },
  windows: {
    label: 'Docker Desktop for Windows',
    url: 'https://docs.docker.com/desktop/install/windows-install/',
    size: '~550 MB',
  },
  linux: {
    label: 'Docker Engine for Linux',
    url: 'https://docs.docker.com/engine/install/',
    size: '~400 MB',
  },
}

const PLATFORM_TIPS: Record<Platform, string[]> = {
  mac: [
    'Apple Silicon (M1/M2/M3): Download the Apple chip version',
    'Intel Mac: Download the Intel chip version',
    'After installing, open Docker Desktop and wait for it to start',
  ],
  windows: [
    'Requires Windows 10/11 with WSL 2 enabled',
    'Run in PowerShell as Admin: wsl --install',
    'After installing Docker Desktop, restart your computer',
  ],
  linux: [
    'Ubuntu/Debian: Follow the apt repository instructions',
    'Also install Docker Compose: sudo apt install docker-compose-plugin',
    'Add your user to docker group: sudo usermod -aG docker $USER',
  ],
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="ml-2 rounded p-1 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] transition"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  )
}

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
    modelPullProgress,
    modelPullMessage,
    setModelPullProgress,
  } = useElectronStore()

  const [platform, setPlatform] = useState<Platform>('mac')
  const [checkedPrereqs, setCheckedPrereqs] = useState({ docker: false })

  // Detect platform
  useEffect(() => {
    if (!bridge) return
    bridge.app.getPlatform().then((p) => {
      if (p === 'darwin') setPlatform('mac')
      else if (p === 'win32') setPlatform('windows')
      else setPlatform('linux')
    })
  }, [bridge])

  // Subscribe to IPC events
  useEffect(() => {
    if (!bridge) return
    const unsub1 = bridge.docker.onPullProgress((data) => {
      setPullProgress(data.progress, data.message)
    })
    const unsub2 = bridge.docker.onHealthUpdate((health) => {
      updateHealth(health)
    })
    const unsub3 = bridge.ollama.onPullProgress((data) => {
      setModelPullProgress(data.progress, data.message)
    })
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [bridge, setPullProgress, updateHealth, setModelPullProgress])

  const checkDocker = useCallback(async () => {
    if (!bridge) return
    const result = await bridge.docker.checkInstalled()
    setDockerInstalled(result.installed, result.version)
    if (result.installed) setCheckedPrereqs((p) => ({ ...p, docker: true }))
  }, [bridge, setDockerInstalled])

  // Auto-check Docker on prerequisites step
  useEffect(() => {
    if (setupStep === 1) checkDocker()
  }, [setupStep, checkDocker])

  const handleAutoSetup = useCallback(async () => {
    if (!bridge) return
    // Pull images
    setPullProgress(1, 'Downloading services...')
    try {
      await bridge.docker.pullImages()
    } catch (e) {
      setPullProgress(-1, `Pull failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      return
    }
    // Start services
    try {
      await bridge.docker.startServices()
      const health = await bridge.docker.getHealth()
      updateHealth(health)
    } catch (e) {
      console.error('[SetupWizard] Start failed:', e)
    }
  }, [bridge, setPullProgress, updateHealth])

  // Auto-start setup on step 2
  useEffect(() => {
    if (setupStep === 2) handleAutoSetup()
  }, [setupStep, handleAutoSetup])

  const handlePullModel = useCallback(async () => {
    if (!bridge) return
    setModelPullProgress(1, 'Checking for model...')
    try {
      const models: string[] = await bridge.ollama.listModels()
      if (models.some((m) => m.startsWith('llama3.2'))) {
        setModelPullProgress(100, 'Model already installed')
        return
      }
      await bridge.ollama.pullModel('llama3.2')
    } catch (e) {
      setModelPullProgress(-1, `Failed: ${e instanceof Error ? e.message : 'Connection error'}`)
    }
  }, [bridge, setModelPullProgress])

  // Auto-pull model on step 3
  useEffect(() => {
    if (setupStep === 3) handlePullModel()
  }, [setupStep, handlePullModel])

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

  const platformIcon = platform === 'mac' ? Apple : platform === 'windows' ? Monitor : Terminal
  const PlatformIcon = platformIcon
  const dockerInfo = DOCKER_URLS[platform]
  const tips = PLATFORM_TIPS[platform]

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
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                Build AI compliance workflows that run 100% on your machine.
                This wizard will help you set everything up.
              </p>

              {/* What you'll need */}
              <div className="mb-6 rounded-lg bg-[var(--nomu-bg)] p-4 text-left">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--nomu-text-muted)]">
                  What you'll need
                </p>
                <div className="space-y-2">
                  {[
                    { icon: Server, label: 'Docker Desktop', detail: 'Runs backend services locally', required: true },
                    { icon: Brain, label: 'AI Model (Llama 3.2)', detail: 'Downloaded automatically (~2GB)', required: false },
                  ].map(({ icon: Icon, label, detail, required }) => (
                    <div key={label} className="flex items-center gap-3">
                      <Icon size={16} className="text-[var(--nomu-primary)]" />
                      <div className="flex-1">
                        <span className="text-sm text-[var(--nomu-text)]">{label}</span>
                        <span className="ml-2 text-xs text-[var(--nomu-text-muted)]">{detail}</span>
                      </div>
                      {required ? (
                        <span className="text-[10px] rounded bg-[var(--nomu-accent)]/20 px-1.5 py-0.5 text-[var(--nomu-accent)]">Required</span>
                      ) : (
                        <span className="text-[10px] rounded bg-green-500/20 px-1.5 py-0.5 text-green-400">Auto</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6 flex items-center justify-center gap-3 rounded-lg bg-[var(--nomu-primary)]/5 p-3 text-sm text-[var(--nomu-text-muted)]">
                <Shield size={16} className="text-[var(--nomu-primary)]" />
                100% on-premises — your data never leaves your machine
              </div>

              <button
                onClick={() => setSetupStep(1)}
                className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Step 1: Prerequisites — platform-aware Docker instructions */}
          {setupStep === 1 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-[var(--nomu-primary)]/20 p-2">
                  <PlatformIcon size={20} className="text-[var(--nomu-primary)]" />
                </div>
                <div>
                  <h2 className="font-['Barlow'] text-xl font-bold text-[var(--nomu-text)]">Install Docker</h2>
                  <p className="text-xs text-[var(--nomu-text-muted)] capitalize">
                    Detected: {platform === 'mac' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Linux'}
                  </p>
                </div>
              </div>

              {/* Docker status */}
              {dockerInstalled ? (
                <div className="mb-5 rounded-lg bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check size={18} />
                    <span className="font-medium">Docker is installed and running</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">{dockerVersion}</p>
                </div>
              ) : (
                <>
                  {/* Download link */}
                  <a
                    href={dockerInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--nomu-primary)]/30 bg-[var(--nomu-primary)]/5 p-4 transition hover:border-[var(--nomu-primary)]/60 hover:bg-[var(--nomu-primary)]/10"
                  >
                    <Download size={20} className="text-[var(--nomu-primary)]" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--nomu-text)]">{dockerInfo.label}</p>
                      <p className="text-xs text-[var(--nomu-text-muted)]">Free download · {dockerInfo.size}</p>
                    </div>
                    <ExternalLink size={16} className="text-[var(--nomu-primary)]" />
                  </a>

                  {/* Platform-specific tips */}
                  <div className="mb-4 rounded-lg bg-[var(--nomu-bg)] p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--nomu-text-muted)]">
                      Setup tips for {platform === 'mac' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Linux'}
                    </p>
                    <ul className="space-y-1.5">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[var(--nomu-text-muted)]">
                          <span className="mt-0.5 text-[var(--nomu-primary)]">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Terminal command for Linux */}
                  {platform === 'linux' && (
                    <div className="mb-4 flex items-center rounded-lg bg-[var(--nomu-bg)] px-3 py-2 font-mono text-xs text-[var(--nomu-text)]">
                      <code className="flex-1">curl -fsSL https://get.docker.com | sh</code>
                      <CopyButton text="curl -fsSL https://get.docker.com | sh" />
                    </div>
                  )}

                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3">
                    <AlertCircle size={16} className="text-yellow-400" />
                    <p className="text-xs text-yellow-400">
                      Install Docker, then open it and wait until it says "Docker is running" before continuing.
                    </p>
                  </div>

                  <button
                    onClick={checkDocker}
                    className="mb-3 w-full rounded-lg bg-[var(--nomu-surface-hover)] py-2.5 text-sm text-[var(--nomu-text)] transition hover:bg-[var(--nomu-border)]"
                  >
                    <Loader2 size={14} className="mr-2 inline" />
                    I've installed Docker — Check again
                  </button>
                </>
              )}

              <button
                onClick={() => setSetupStep(2)}
                disabled={!dockerInstalled}
                className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dockerInstalled ? 'Continue — Start Automatic Setup' : 'Install Docker to Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Automatic Setup — pull images + start services */}
          {setupStep === 2 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-[var(--nomu-accent)]/20 p-2">
                  <Server size={20} className="text-[var(--nomu-accent)]" />
                </div>
                <h2 className="font-['Barlow'] text-xl font-bold text-[var(--nomu-text)]">Setting Up Services</h2>
              </div>
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                Downloading and starting all backend services. This takes a few minutes on first run.
              </p>

              {/* Pull progress */}
              {pullProgress > 0 && pullProgress < 100 && (
                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-xs text-[var(--nomu-text-muted)]">
                    <span>Downloading services...</span>
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
                <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-400">
                  {pullMessage}
                  <button
                    onClick={handleAutoSetup}
                    className="mt-2 w-full rounded-lg bg-[var(--nomu-surface-hover)] py-2 text-sm text-[var(--nomu-text)] transition hover:bg-[var(--nomu-border)]"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Service health */}
              {(pullProgress >= 100 || allServicesHealthy) && (
                <div className="mb-4 space-y-2">
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
              )}

              {allServicesHealthy ? (
                <button
                  onClick={() => setSetupStep(3)}
                  className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
                >
                  Continue
                </button>
              ) : pullProgress >= 0 && pullProgress < 100 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--nomu-text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Setting up...
                </div>
              ) : pullProgress >= 100 && !allServicesHealthy ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--nomu-text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Starting services...
                </div>
              ) : null}
            </div>
          )}

          {/* Step 3: AI Model Download */}
          {setupStep === 3 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-[var(--nomu-primary)]/20 p-2">
                  <Brain size={20} className="text-[var(--nomu-primary)]" />
                </div>
                <h2 className="font-['Barlow'] text-xl font-bold text-[var(--nomu-text)]">Download AI Model</h2>
              </div>
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                Downloading Llama 3.2 for local AI processing. One-time download (~2GB).
                This model runs entirely on your machine.
              </p>

              {modelPullProgress > 0 && modelPullProgress < 100 && (
                <div className="mb-6">
                  <div className="mb-2 flex justify-between text-xs text-[var(--nomu-text-muted)]">
                    <span>{modelPullMessage}</span>
                    <span>{modelPullProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--nomu-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--nomu-primary)] transition-all duration-300"
                      style={{ width: `${modelPullProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {modelPullProgress === 100 && (
                <div className="mb-6 rounded-lg bg-green-500/10 p-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check size={18} />
                    <span className="font-medium">{modelPullMessage}</span>
                  </div>
                </div>
              )}

              {modelPullProgress === -1 && (
                <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-xs text-red-400">
                  {modelPullMessage}
                  <button
                    onClick={handlePullModel}
                    className="mt-2 w-full rounded-lg bg-[var(--nomu-surface-hover)] py-2 text-sm text-[var(--nomu-text)] transition hover:bg-[var(--nomu-border)]"
                  >
                    Retry
                  </button>
                </div>
              )}

              {modelPullProgress === 100 ? (
                <button
                  onClick={() => setSetupStep(4)}
                  className="w-full rounded-lg bg-[var(--nomu-primary)] py-3 font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
                >
                  Continue
                </button>
              ) : modelPullProgress > 0 && modelPullProgress < 100 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--nomu-text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Downloading model...
                </div>
              ) : modelPullProgress !== -1 ? (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--nomu-text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  Checking models...
                </div>
              ) : null}
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
              <p className="mb-6 text-sm text-[var(--nomu-text-muted)]">
                All services are running and your AI model is ready.
                Start building compliance workflows by dragging nodes from the sidebar.
              </p>

              <div className="mb-6 rounded-lg bg-[var(--nomu-bg)] p-4 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--nomu-text-muted)]">Quick start</p>
                <ul className="space-y-1.5 text-xs text-[var(--nomu-text-muted)]">
                  <li className="flex items-start gap-2">
                    <Sparkles size={12} className="mt-0.5 text-[var(--nomu-primary)]" />
                    Drag a <strong className="text-[var(--nomu-text)]">Manual Trigger</strong> to the canvas to start a workflow
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles size={12} className="mt-0.5 text-[var(--nomu-primary)]" />
                    Connect it to an <strong className="text-[var(--nomu-text)]">AI Agent</strong> node for LLM processing
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles size={12} className="mt-0.5 text-[var(--nomu-primary)]" />
                    Or load a <strong className="text-[var(--nomu-text)]">Template</strong> from the Workflows menu
                  </li>
                </ul>
              </div>

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
