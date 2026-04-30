// Light-mode theme. Off-white background, ink text, brand accents.
// Optimized for editorial / enterprise feel — no dark-mode tropes.
export const theme = {
  colors: {
    // Surfaces
    bg: '#FEFCFD',          // Off-White — primary canvas
    bgSubtle: '#F7F4F5',    // Subtle warm tint for cards / sections
    bgEdge: '#EFEAEC',      // Soft vignette edge
    divider: 'rgba(26, 22, 20, 0.08)',

    // Ink (text)
    ink: '#1A1614',         // Soft black — primary text
    inkMuted: '#4D4D4D',    // Gray — body text
    inkSubtle: '#8C8987',   // Quiet labels, captions

    // Brand accents (high contrast on light bg)
    purple: '#4004DA',
    purpleSoft: 'rgba(64, 4, 218, 0.12)',
    purpleEdge: 'rgba(64, 4, 218, 0.4)',
    orange: '#FF6C1D',
    orangeSoft: 'rgba(255, 108, 29, 0.12)',
    orangeEdge: 'rgba(255, 108, 29, 0.4)',

    // Tertiary accent (replaces cyan — darker teal works on white)
    teal: '#0891B2',
    tealSoft: 'rgba(8, 145, 178, 0.12)',
    tealEdge: 'rgba(8, 145, 178, 0.4)',

    // Legacy aliases (backwards-compat for components that reference them)
    offWhite: '#FEFCFD',
    darkGray: '#36312E',
    black: '#1A1614',
    gray: '#4D4D4D',
    grayMuted: '#8C8987',
    cyan: '#0891B2', // remap cyan → teal so existing code keeps working
  },
  fonts: {
    heading: '"Barlow", system-ui, sans-serif',
    body: '"Work Sans", system-ui, sans-serif',
  },
  scene: {
    fps: 30,
    width: 1920,
    height: 1080,
  },
} as const

// Scene timings, in frames @ 30fps.
// Total: 1020 frames = 34 seconds.
export const sceneTimings = {
  hook:     { from: 0,    durationInFrames: 180 }, //  6s — three problems with article backdrop
  cost:     { from: 180,  durationInFrames: 180 }, //  6s — cost graph: cloud climbs, local flat
  solution: { from: 360,  durationInFrames: 120 }, //  4s — brand reveal
  venn:     { from: 480,  durationInFrames: 240 }, //  8s — three-way Venn diagram
  workflow: { from: 720,  durationInFrames: 180 }, //  6s — animated node graph
  outro:    { from: 900,  durationInFrames: 120 }, //  4s — typewriter tagline (was 30, too short for typing to finish)
} as const

export const TOTAL_FRAMES = 1020
