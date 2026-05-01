import { Easing } from 'remotion'

// Shared easing palette for ContrastScene Part 1.
// All curves are Easing.bezier — never springs, never presets stacked.

// Crisp UI entrance (decelerates into rest). Materials, opacity, position
// landings, and per-row "value reveals" use this. Justification: viewer should
// feel an element "land," not "snap."
export const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)

// Accelerate-out for departures. Title float-up, card fade-out tail.
export const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)

// Editorial in-out for slow camera moves and large stage shifts.
export const EASE_EDITORIAL = Easing.bezier(0.45, 0, 0.55, 1)

// Overshoot for impact. Local card snap-in, scale "claim" pulses.
export const EASE_IMPACT = Easing.bezier(0.34, 1.56, 0.64, 1)

// Smooth morph for size/position transitions where there's no "land."
export const EASE_MORPH = Easing.bezier(0.65, 0, 0.35, 1)
