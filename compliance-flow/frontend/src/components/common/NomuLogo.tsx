import { memo } from 'react'

interface NomuLogoProps {
  className?: string
  showWordmark?: boolean
}

export const NomuLogo = memo(({ className = '', showWordmark = true }: NomuLogoProps) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      {showWordmark ? (
        <img
          src="/nomu-logo.png"
          alt="NOMU"
          className="h-full w-auto object-contain"
          draggable={false}
        />
      ) : (
        <img
          src="/nomu-symbol.png"
          alt="NOMU"
          className="h-full w-auto object-contain"
          draggable={false}
        />
      )}
    </div>
  )
})

NomuLogo.displayName = 'NomuLogo'
