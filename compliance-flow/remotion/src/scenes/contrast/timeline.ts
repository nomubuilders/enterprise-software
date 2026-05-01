// Centralized frame constants for ContrastScene Part 1.
// Total Part 1: 578 frames @ 30fps = 19.27s.
// CostChart hand-off begins at frame 578 (separate <Sequence> in ContrastSceneV2).
//
// Per Phase 2 spec, Section 1.

export const TL = {
  // B0 · Black
  blackStart: 0,
  blackEnd: 8,

  // B1 · Stage establish (lights up, floor materializes, objects fade in, camera dolly)
  establishStart: 8,
  establishEnd: 60,

  // B2 · Title float ("Let's compare.")
  titleInStart: 60,
  titleInEnd: 82,
  titleHoldEnd: 110,
  titleOutEnd: 130,

  // B3 · Pre-roll hold (objects breathing, camera continues subtle orbit)
  preRollEnd: 158,

  // Rows · 5 rows. Row N startFrame:
  rowStart: [158, 226, 286, 346, 406] as const,
  // Row durations (Row 1 has +8 lead, Row 5 has +6 trail)
  rowDuration: [68, 60, 60, 60, 66] as const,

  // B9 · LED max + breath (after Row 5 ends)
  ledMaxStart: 472,
  ledMaxEnd: 510,

  // B10 · LED ring expansion (wipe)
  wipeStart: 510,
  wipeEnd: 578,

  // Hand-off to CostChart (next composition)
  handoff: 578,
} as const

// Per-row sub-beat offsets (frames *relative* to the row's startFrame).
// Canonical 60-frame row. Row 1 adds 8 lead frames; Row 5 adds 6 trail frames.
export const ROW_BEATS = {
  cloudEnterStart: 0,
  cloudEnterEnd: 14,
  readHoldEnd: 30,
  localEnterStart: 30,
  localEnterEnd: 42,
  ledStepStart: 34,
  ledStepEnd: 48,
  bothHoldEnd: 60,
} as const

// LED emissive intensity per row (cumulative, after that row's LED step).
// Base 0.30 (set at scene start), then +~0.34 per row, ending at 2.00.
export const LED_LEVELS = [0.30, 0.64, 0.98, 1.32, 1.66, 2.00] as const

// Cloud distort intensity per row (after that row's "both hold" sub-beat).
// Cloud destabilizes as Local locks in.
export const CLOUD_DISTORT_LEVELS = [1.00, 1.12, 1.24, 1.36, 1.48, 1.60] as const

// Per-row text content. Index 0 = first row revealed.
export const ROW_TEXT = [
  { cloud: 'Locked into one model',           local: 'Pick any open model' },
  { cloud: 'Your data leaves the box',        local: 'Stays on your hardware' },
  { cloud: 'Model can be nerfed overnight',   local: 'You own the version forever' },
  { cloud: 'No audit trail',                  local: 'Every step is evidence' },
  { cloud: 'Black-box decisions',             local: 'Built-in explainability' },
] as const

// Returns the absolute frame at which row N's LED step completes (intensity reaches LED_LEVELS[n+1]).
export const ledStepEndFrame = (rowIndex: number): number =>
  TL.rowStart[rowIndex] + ROW_BEATS.ledStepEnd

// Returns the absolute frame at which row N's "both hold" completes (used for cloud distort step).
export const cloudDistortStepEndFrame = (rowIndex: number): number =>
  TL.rowStart[rowIndex] + ROW_BEATS.bothHoldEnd
