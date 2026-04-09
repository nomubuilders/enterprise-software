import { memo } from 'react'
import nomuLogo from '../../assets/nomu-logo.png'
import nomuSymbol from '../../assets/nomu-symbol.png'

interface NomuLogoProps {
  className?: string
  showWordmark?: boolean
}

export const NomuLogo = memo(({ className = '', showWordmark = true }: NomuLogoProps) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      {showWordmark ? (
        <img
          src={nomuLogo}
          alt="NOMU"
          className="h-full w-auto object-contain"
          draggable={false}
        />
      ) : (
        <img
          src={nomuSymbol}
          alt="NOMU"
          className="h-full w-auto object-contain"
          draggable={false}
        />
      )}
    </div>
  )
})

NomuLogo.displayName = 'NomuLogo'
