import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, SkipForward } from 'lucide-react'
import { useTutorialStore } from '../../store/tutorialStore'
import { tutorialSteps } from '../../data/tutorialSteps'
import { useFlowStore } from '../../store/flowStore'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function TutorialOverlay() {
  const { isActive, currentStep, next, skip } = useTutorialStore()
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const prevNodeCount = useRef(0)
  const nodes = useFlowStore((s) => s.nodes)

  const step = tutorialSteps[currentStep]

  // Find and track the target element
  const updateRect = useCallback(() => {
    if (!step) return
    const el = document.querySelector(`[data-tutorial="${step.target}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    } else {
      setTargetRect(null)
    }
  }, [step])

  useEffect(() => {
    if (!isActive) return
    updateRect()
    const interval = setInterval(updateRect, 500)
    window.addEventListener('resize', updateRect)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', updateRect)
    }
  }, [isActive, updateRect])

  // Interactive step: detect when user drags a node
  useEffect(() => {
    if (!isActive || !step?.interactive || step.action !== 'drag-node') return
    if (nodes.length > prevNodeCount.current) {
      next()
    }
    prevNodeCount.current = nodes.length
  }, [isActive, step, nodes.length, next])

  if (!isActive || !step) return null

  const padding = 8
  const spotlightRect = targetRect
    ? {
      top: targetRect.top - padding,
      left: targetRect.left - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    }
    : null

  // Tooltip position
  const tooltipWidth = 288 // w-72 = 18rem = 288px
  const sidebarWidth = 256 // sidebar w-64 = 16rem = 256px

  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const gap = 16
    const tooltipHeight = 200 // approximate tooltip height

    // Helper: clamp top so tooltip stays within viewport
    const clampTop = (top: number) => Math.min(top, window.innerHeight - tooltipHeight - gap)

    switch (step.position) {
      case 'right':
        return {
          top: clampTop(spotlightRect.top),
          left: spotlightRect.left + spotlightRect.width + gap,
        }
      case 'left': {
        // If tooltip would overlap the sidebar, place it inside the canvas instead
        const rightEdge = window.innerWidth - spotlightRect.left + gap
        const wouldOverlap = window.innerWidth - rightEdge - tooltipWidth < sidebarWidth
        if (wouldOverlap) {
          return {
            top: clampTop(spotlightRect.top + 60),
            left: sidebarWidth + gap,
          }
        }
        return {
          top: clampTop(spotlightRect.top),
          right: rightEdge,
        }
      }
      case 'bottom':
        return {
          top: clampTop(spotlightRect.top + spotlightRect.height + gap),
          left: Math.max(spotlightRect.left, sidebarWidth + gap),
        }
      case 'top':
        return {
          bottom: window.innerHeight - spotlightRect.top + gap,
          left: Math.max(spotlightRect.left, sidebarWidth + gap),
        }
    }
  }

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop with spotlight hole */}
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {spotlightRect && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-[var(--nomu-primary)] ring-offset-2 ring-offset-transparent"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Allow clicks through the spotlight area */}
      {spotlightRect && step.interactive && (
        <div
          className="absolute"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute w-72 rounded-xl bg-[var(--nomu-surface)] p-4 shadow-2xl"
          style={{ ...getTooltipStyle(), pointerEvents: 'auto' }}
        >
          {/* Step counter */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[var(--nomu-text-muted)]">
              {currentStep + 1} / {tutorialSteps.length}
            </span>
            <button onClick={skip} className="rounded p-1 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]">
              <X size={14} />
            </button>
          </div>

          <h3 className="mb-1 font-['Barlow'] text-sm font-bold text-[var(--nomu-text)]">
            {step.title}
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-[var(--nomu-text-muted)]">
            {step.description}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={skip}
              className="flex items-center gap-1 text-xs text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]"
            >
              <SkipForward size={12} />
              Skip tutorial
            </button>
            {!step.interactive && (
              <button
                onClick={next}
                className="flex items-center gap-1 rounded-lg bg-[var(--nomu-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--nomu-primary-hover)]"
              >
                {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight size={12} />
              </button>
            )}
            {step.interactive && (
              <span className="text-xs italic text-[var(--nomu-accent)]">
                {step.action === 'drag-node' ? 'Drag a node...' : 'Complete the action...'}
              </span>
            )}
          </div>

          {/* Progress dots */}
          <div className="mt-3 flex justify-center gap-1">
            {tutorialSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-4 bg-[var(--nomu-primary)]' : i < currentStep ? 'w-1 bg-green-500' : 'w-1 bg-[var(--nomu-border)]'
                  }`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
