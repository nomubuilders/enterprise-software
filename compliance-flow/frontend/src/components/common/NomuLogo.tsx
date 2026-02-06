import { memo } from 'react'

interface NomuLogoProps {
  className?: string
  showWordmark?: boolean
}

export const NomuLogo = memo(({ className = '', showWordmark = true }: NomuLogoProps) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Circular logomark: mountain/wave icon inside a circle */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        {/* Mountain/wave paths */}
        <path
          d="M12 30 C16 22, 20 26, 24 20 C28 26, 32 22, 36 30"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Small circle/dot above */}
        <circle cx="24" cy="16" r="3" fill="currentColor" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <svg
          viewBox="0 0 120 32"
          fill="none"
          className="h-6"
          aria-label="NOMU"
        >
          <text
            x="0"
            y="24"
            fontFamily="'Barlow', sans-serif"
            fontWeight="700"
            fontSize="28"
            letterSpacing="0.1em"
            fill="currentColor"
          >
            NOMU
          </text>
        </svg>
      )}
    </div>
  )
})

NomuLogo.displayName = 'NomuLogo'
