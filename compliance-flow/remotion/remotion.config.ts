import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
Config.setConcurrency(4)
// Enable WebGL in headless Chromium for @remotion/three scenes (ContrastSceneV2).
// Without this, three.js fails to initialize a WebGL context during render.
Config.setChromiumOpenGlRenderer('angle')
