import { Audio, Sequence, staticFile } from 'remotion'
import { TL, ROW_BEATS } from './timeline'

// AudioCues · "The Leash" sound design.
//
// Per Phase 2 §4. Sourced via soundcn MCP (preview-confirmed). All assets
// in public/sfx/ are CC0 (Kenney). Remotion-hosted built-ins via
// https://remotion.media/<name>.wav for whoosh / shutter.
//
// Mix philosophy: silence is loud. Creak lands naked, phaser-down decays
// before the next cue, and the morph crescendo at f378 is the loudest
// single moment.

interface Cue {
  frame: number
  src: string
  volume: number
  label: string
}

const cues: Cue[] = [
  // === B1 establish ===
  { frame: TL.establishStart,     src: 'https://remotion.media/whoosh.wav',           volume: 0.35, label: 'lights up' },
  { frame: TL.establishStart + 22, src: staticFile('sfx/creak-3.mp3'),                volume: 0.45, label: 'cable descends · subtle creak' },

  // === B2 title beat ===
  { frame: TL.titleInStart,       src: 'https://remotion.media/shutter-modern.wav',   volume: 0.45, label: 'headers materialize' },
  { frame: TL.titleInStart + 18,  src: staticFile('sfx/power-up-4.mp3'),              volume: 0.28, label: 'LED breath peak' },

  // === Row 1 · Locked into one model / Pick any open model ===
  { frame: TL.rowStart[0],                                src: 'https://remotion.media/shutter-modern.wav', volume: 0.4,  label: 'r1 cloud card' },
  { frame: TL.rowStart[0] + ROW_BEATS.yankStart,          src: staticFile('sfx/creak-2.mp3'),               volume: 0.75, label: 'r1 cable yank #1' },
  { frame: TL.rowStart[0] + ROW_BEATS.localEnterStart,    src: staticFile('sfx/metal-click.mp3'),           volume: 0.9,  label: 'r1 local snap' },
  { frame: TL.rowStart[0] + ROW_BEATS.localEnterStart,    src: staticFile('sfx/laser-large-000.mp3'),       volume: 0.55, label: 'r1 etch begin' },
  { frame: TL.rowStart[0] + ROW_BEATS.ledStepStart,       src: staticFile('sfx/power-up-4.mp3'),            volume: 0.32, label: 'r1 led step' },

  // === Row 2 · Your data leaves the box / Stays on your hardware ===
  { frame: TL.rowStart[1],                                src: 'https://remotion.media/shutter-modern.wav', volume: 0.4,  label: 'r2 cloud card' },
  { frame: TL.rowStart[1] + ROW_BEATS.yankStart - 4,      src: staticFile('sfx/low-down.mp3'),              volume: 0.55, label: 'r2 siphon onset' },
  { frame: TL.rowStart[1] + ROW_BEATS.yankStart + 1,      src: staticFile('sfx/cloth-3.mp3'),               volume: 0.30, label: 'r2 siphon texture' },
  { frame: TL.rowStart[1] + ROW_BEATS.localEnterStart,    src: staticFile('sfx/metal-click.mp3'),           volume: 0.9,  label: 'r2 local snap' },
  { frame: TL.rowStart[1] + ROW_BEATS.ledStepStart,       src: staticFile('sfx/power-up-4.mp3'),            volume: 0.32, label: 'r2 led step' },

  // === Row 3 · Model can be nerfed overnight / You own the version forever ===
  { frame: TL.rowStart[2],                                src: 'https://remotion.media/shutter-modern.wav', volume: 0.4,  label: 'r3 cloud card' },
  { frame: TL.rowStart[2] + ROW_BEATS.yankStart,          src: staticFile('sfx/phaser-down-3.mp3'),         volume: 0.85, label: 'r3 orb dim & shrink' },
  { frame: TL.rowStart[2] + ROW_BEATS.localEnterStart,    src: staticFile('sfx/metal-click.mp3'),           volume: 0.9,  label: 'r3 local snap' },
  { frame: TL.rowStart[2] + ROW_BEATS.ledStepStart,       src: staticFile('sfx/power-up-4.mp3'),            volume: 0.32, label: 'r3 led step' },

  // === Row 4 · No audit trail / Every step is evidence ===
  { frame: TL.rowStart[3],                                src: 'https://remotion.media/shutter-modern.wav', volume: 0.4,  label: 'r4 cloud card' },
  { frame: TL.rowStart[3] + ROW_BEATS.yankStart,          src: staticFile('sfx/force-field-000.mp3'),      volume: 0.45, label: 'r4 cable fog onset' },
  { frame: TL.rowStart[3] + ROW_BEATS.localEnterStart,    src: staticFile('sfx/metal-click.mp3'),           volume: 0.9,  label: 'r4 local snap' },
  // 5 audit ticks · click-001 fires at frames 296, 301, 306, 311, 316 (TICK_REVEAL_START + i*5 = 294 + i*5; +2 lead so click lands as box appears)
  { frame: 296, src: staticFile('sfx/click-001.mp3'), volume: 0.45, label: 'r4 audit tick 1' },
  { frame: 301, src: staticFile('sfx/click-001.mp3'), volume: 0.45, label: 'r4 audit tick 2' },
  { frame: 306, src: staticFile('sfx/click-001.mp3'), volume: 0.45, label: 'r4 audit tick 3' },
  { frame: 311, src: staticFile('sfx/click-001.mp3'), volume: 0.45, label: 'r4 audit tick 4' },
  { frame: 316, src: staticFile('sfx/click-001.mp3'), volume: 0.45, label: 'r4 audit tick 5' },
  { frame: TL.rowStart[3] + ROW_BEATS.ledStepStart,       src: staticFile('sfx/power-up-4.mp3'),            volume: 0.32, label: 'r4 led step' },

  // === Row 5 · Black-box decisions / Built-in explainability ===
  { frame: TL.rowStart[4],                                src: 'https://remotion.media/shutter-modern.wav', volume: 0.4,  label: 'r5 cloud card' },
  { frame: TL.rowStart[4] + ROW_BEATS.yankStart - 4,      src: staticFile('sfx/phaser-down-3.mp3'),         volume: 0.55, label: 'r5 orb fogs over' },
  // Local enters a few frames earlier on row 5 (42f row vs 54f canonical); confirmation-004 (warm resonant) for finality
  { frame: TL.rowStart[4] + 24,                           src: staticFile('sfx/confirmation-004.mp3'),      volume: 0.95, label: 'r5 final lock-in' },
  { frame: TL.rowStart[4] + ROW_BEATS.ledStepStart,       src: staticFile('sfx/power-up-4.mp3'),            volume: 0.4,  label: 'r5 led step (peak)' },

  // === B10 morph ===
  { frame: TL.morphStart,         src: staticFile('sfx/force-field-000.mp3'),         volume: 0.55, label: 'morph onset' },
  { frame: TL.morphStart + 6,     src: staticFile('sfx/low-frequency-explosion-001.mp3'), volume: 0.55, label: 'cable→cost color flip crescendo' },
  { frame: TL.morphStart + 14,    src: staticFile('sfx/confirmation-001.mp3'),        volume: 0.5,  label: 'final close · primes CostChart' },
]

export const AudioCues: React.FC = () => (
  <>
    {cues.map((cue) => (
      <Sequence key={`${cue.frame}-${cue.label}`} from={cue.frame} layout="none">
        <Audio src={cue.src} volume={cue.volume} />
      </Sequence>
    ))}
  </>
)
