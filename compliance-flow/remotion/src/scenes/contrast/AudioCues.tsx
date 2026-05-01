import { Audio, Sequence, staticFile } from 'remotion'
import { TL } from './timeline'

// AudioCues · all <Audio> components for ContrastScene Part 1, gated by
// <Sequence> from the cue's frame.
//
// Each cue plays once at its scheduled frame. Volume tuned per spec section 5.
//
// Sources:
//   - https://remotion.media/<name>.wav  · Remotion-hosted built-ins
//   - staticFile('sfx/<name>.mp3')       · soundcn assets installed to public/sfx/
//
// Per-row offsets are computed from TL.rowStart[i] so a row-time tweak in
// timeline.ts ripples through here without rewiring frames.

interface Cue {
  frame: number
  src: string
  volume: number
  label: string
}

const cues: Cue[] = [
  // Stage establish
  { frame: TL.establishStart, src: 'https://remotion.media/whoosh.wav', volume: 0.4, label: 'lights up' },
  // Title materialize
  { frame: TL.titleInStart, src: 'https://remotion.media/shutter-modern.wav', volume: 0.5, label: 'title materialize' },

  // Row 1
  { frame: TL.rowStart[0],      src: 'https://remotion.media/shutter-modern.wav',  volume: 0.4,  label: 'r1 cloud' },
  { frame: TL.rowStart[0] + 24, src: 'https://remotion.media/whoosh.wav',          volume: 0.25, label: 'r1 local pre-roll' },
  { frame: TL.rowStart[0] + 30, src: staticFile('sfx/metal-click.mp3'),            volume: 1.0,  label: 'r1 local snap' },
  { frame: TL.rowStart[0] + 34, src: staticFile('sfx/power-up-4.mp3'),             volume: 0.32, label: 'r1 led step' },

  // Row 2
  { frame: TL.rowStart[1],      src: 'https://remotion.media/shutter-modern.wav',  volume: 0.4,  label: 'r2 cloud' },
  { frame: TL.rowStart[1] + 24, src: 'https://remotion.media/whoosh.wav',          volume: 0.25, label: 'r2 local pre-roll' },
  { frame: TL.rowStart[1] + 30, src: staticFile('sfx/metal-click.mp3'),            volume: 1.0,  label: 'r2 local snap' },
  { frame: TL.rowStart[1] + 34, src: staticFile('sfx/power-up-4.mp3'),             volume: 0.32, label: 'r2 led step' },

  // Row 3
  { frame: TL.rowStart[2],      src: 'https://remotion.media/shutter-modern.wav',  volume: 0.4,  label: 'r3 cloud' },
  { frame: TL.rowStart[2] + 24, src: 'https://remotion.media/whoosh.wav',          volume: 0.25, label: 'r3 local pre-roll' },
  { frame: TL.rowStart[2] + 30, src: staticFile('sfx/metal-click.mp3'),            volume: 1.0,  label: 'r3 local snap' },
  { frame: TL.rowStart[2] + 34, src: staticFile('sfx/power-up-4.mp3'),             volume: 0.32, label: 'r3 led step' },

  // Row 4
  { frame: TL.rowStart[3],      src: 'https://remotion.media/shutter-modern.wav',  volume: 0.4,  label: 'r4 cloud' },
  { frame: TL.rowStart[3] + 24, src: 'https://remotion.media/whoosh.wav',          volume: 0.25, label: 'r4 local pre-roll' },
  { frame: TL.rowStart[3] + 30, src: staticFile('sfx/metal-click.mp3'),            volume: 1.0,  label: 'r4 local snap' },
  { frame: TL.rowStart[3] + 34, src: staticFile('sfx/power-up-4.mp3'),             volume: 0.32, label: 'r4 led step' },

  // Row 5 · final lock-in uses confirmation-004 (warm resonant) instead of metal-click
  { frame: TL.rowStart[4],      src: 'https://remotion.media/shutter-modern.wav',  volume: 0.4,  label: 'r5 cloud' },
  { frame: TL.rowStart[4] + 24, src: 'https://remotion.media/whoosh.wav',          volume: 0.25, label: 'r5 local pre-roll' },
  { frame: TL.rowStart[4] + 30, src: staticFile('sfx/confirmation-004.mp3'),       volume: 1.0,  label: 'r5 local snap (final lock-in)' },
  { frame: TL.rowStart[4] + 34, src: staticFile('sfx/power-up-4.mp3'),             volume: 0.32, label: 'r5 led step (peak)' },

  // B10 wipe
  { frame: TL.wipeStart,     src: staticFile('sfx/force-field-000.mp3'),  volume: 0.5, label: 'wipe' },
  { frame: TL.wipeStart + 45, src: staticFile('sfx/confirmation-001.mp3'), volume: 0.6, label: 'final close' },
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
