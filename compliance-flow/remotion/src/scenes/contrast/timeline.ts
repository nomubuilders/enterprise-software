// Centralized frame constants for ContrastScene Part 1 · "The Leash" rebuild.
// Total Part 1: 390 frames @ 30fps = 13.0s.
// CostChart hand-off begins at frame 390 (separate <Sequence> in ContrastSceneV2).
//
// Per Phase 2 spec, Section 1. Compressed from prior 578f / 19.27s budget.
// Master PitchVideoV2 timeline shifts: Workflow.from 1928→1740, Outro.from
// 2288→2100, total 2468→2280. See PitchVideoV2.tsx.

export const TL = {
  // B0 · Black
  blackStart: 0,
  blackEnd: 6,

  // B1 · Stage establish (lights up, orb suspends, monolith rises, cable descends)
  establishStart: 6,
  establishEnd: 48,

  // B2 · Title beat (headers fade in, idle behaviors begin)
  titleInStart: 48,
  titleInEnd: 78,

  // B3 · Pre-roll hold (breath before Row 1)
  preRollEnd: 102,

  // Rows · 5 rows. Row N startFrame:
  rowStart: [102, 156, 210, 264, 318] as const,
  // Row durations · 54f canonical, Row 5 trimmed to 42 (last row needs less hold)
  rowDuration: [54, 54, 54, 54, 42] as const,

  // B9 · Lock-in pause
  lockStart: 360,
  lockEnd: 372,

  // B10 · Cable→Cost morph (the hand-off)
  morphStart: 372,
  morphEnd: 390,

  // Hand-off to CostChart (next composition)
  handoff: 390,
} as const

// Per-row sub-beat offsets (frames *relative* to the row's startFrame).
// 54-frame row clock. Sub-beats trimmed proportionally from prior 60f row.
export const ROW_BEATS = {
  cloudEnterStart: 0,
  cloudEnterEnd: 14,    // cloud card lands by t=14
  yankStart: 18,        // cable yank / siphon onset / orb dim trigger
  localEnterStart: 30,
  localEnterEnd: 42,    // local card lands by t=42
  ledStepStart: 34,
  ledStepEnd: 48,
  bothHoldEnd: 54,      // row complete
} as const

// LED emissive intensity per row (cumulative, after that row's LED step).
// Base 0.30 (set at scene start), then steps up. 6-value array.
export const LED_LEVELS = [0.30, 0.55, 0.78, 1.05, 1.30, 1.65] as const

// Per-row text content. Index 0 = first row revealed.
export const ROW_TEXT = [
  { cloud: 'Locked into one model',           local: 'Pick any open model' },
  { cloud: 'Your data leaves the box',        local: 'Stays on your hardware' },
  { cloud: 'Model can be nerfed overnight',   local: 'You own the version forever' },
  { cloud: 'No audit trail',                  local: 'Every step is evidence' },
  { cloud: 'Black-box decisions',             local: 'Built-in explainability' },
] as const

// Version-plate text per row. Etch builds across rows.
export const VERSION_PLATE_TEXT = [
  'v3.2.1',
  'v3.2.1 · 184d ago',
  'v3.2.1 · 184d ago',
  'v3.2.1 · 184d ago',
  'v3.2.1 · 184d ago',
] as const

// Returns the absolute frame at which row N's LED step completes.
export const ledStepEndFrame = (rowIndex: number): number =>
  TL.rowStart[rowIndex] + ROW_BEATS.ledStepEnd

// Returns the absolute frame at which row N's "yank" sub-beat starts.
export const yankStartFrame = (rowIndex: number): number =>
  TL.rowStart[rowIndex] + ROW_BEATS.yankStart

// ─────────────────────────────────────────────────────────────────────────
// DEPRECATED · legacy exports retained for typecheck compatibility.
//
// CloudObject.tsx, LocalObject.tsx, TitleText.tsx, CardPair.tsx are no
// longer imported by ProductStage.tsx after the "The Leash" rebuild but
// remain on disk per the project's no-delete-without-confirmation rule.
// These stubs let tsc still walk those files cleanly. Safe to remove
// once the legacy files themselves are deleted.
// ─────────────────────────────────────────────────────────────────────────

/** @deprecated · only used by legacy CloudObject.tsx (no longer in scene graph) */
export const CLOUD_DISTORT_LEVELS = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] as const

/** @deprecated · only used by legacy CloudObject.tsx (no longer in scene graph) */
export const cloudDistortStepEndFrame = (rowIndex: number): number =>
  TL.rowStart[rowIndex] + ROW_BEATS.bothHoldEnd

/**
 * @deprecated · legacy TL fields used by TitleText.tsx (no longer in scene
 * graph). Aliased to current titleInEnd / morphStart so the orphaned file
 * still typechecks if anyone re-imports it.
 */
export const TL_LEGACY = {
  titleHoldEnd: TL.titleInEnd,
  titleOutEnd: TL.titleInEnd + 20,
  ledMaxStart: 472,
  ledMaxEnd: 510,
  wipeStart: TL.morphStart,
  wipeEnd: TL.morphEnd,
} as const
