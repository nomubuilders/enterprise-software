export const theme = {
  colors: {
    purple: '#4004DA',
    purpleSoft: 'rgba(64, 4, 218, 0.18)',
    purpleEdge: 'rgba(64, 4, 218, 0.45)',
    orange: '#FF6C1D',
    orangeSoft: 'rgba(255, 108, 29, 0.18)',
    orangeEdge: 'rgba(255, 108, 29, 0.45)',
    black: '#000000',
    darkGray: '#36312E',
    offWhite: '#FEFCFD',
    gray: '#4D4D4D',
    grayMuted: 'rgba(254, 252, 253, 0.55)',
    cyan: '#00E5FF',
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

export const sceneTimings = {
  hook: { from: 0, durationInFrames: 180 },
  solution: { from: 180, durationInFrames: 120 },
  venn: { from: 300, durationInFrames: 240 },
  workflow: { from: 540, durationInFrames: 180 },
  outro: { from: 720, durationInFrames: 30 },
} as const

export const TOTAL_FRAMES = 750
