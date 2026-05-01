import * as THREE from 'three'
import { VERSION_PLATE_TEXT } from './timeline'

// Pre-built CanvasTextures for the version plate on the monolith.
//
// Why this lives in its own module:
// Drei <Text> uses troika-three-text which is async (font shaping happens off
// the main thread and races the headless render snapshot). Our workaround is
// to render the version label to a 2D canvas synchronously at module load,
// then upload that canvas as a CanvasTexture to a plane material. No async,
// no font-loading race, deterministic across renders.
//
// Each texture is 1024×256 (4:1 aspect) to match the 0.55×0.12 plane geometry.
// The font is the system sans-serif fallback (no @font-face dependency) which
// renders identically in headless Chrome and Studio.

const TEXTURE_W = 1024
const TEXTURE_H = 256

const buildTexture = (text: string): THREE.CanvasTexture => {
  // SSR safety · Remotion's renderer-side root resolution may import this
  // module before document is available. Return a 1×1 transparent texture
  // and let the component re-create at first paint.
  if (typeof document === 'undefined') {
    const data = new Uint8Array([0, 0, 0, 0])
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex as unknown as THREE.CanvasTexture
  }

  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_W
  canvas.height = TEXTURE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Fallback to a flat texture if 2D context unavailable
    const data = new Uint8Array([0, 0, 0, 0])
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex as unknown as THREE.CanvasTexture
  }

  // Background transparent · we'll use this as both map and emissiveMap
  ctx.clearRect(0, 0, TEXTURE_W, TEXTURE_H)

  // Etch text in white. Emissive material will tint it brand-purple at runtime.
  // Slight horizontal tracking for laser-engraved feel.
  ctx.fillStyle = '#FEFCFD'
  ctx.font = '700 132px "Barlow", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, TEXTURE_W / 2, TEXTURE_H / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  // sRGB encoding for correct color on emissive map
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

// Pre-built once per module load. Five textures, indexed by row.
export const VERSION_PLATE_TEXTURES: readonly THREE.CanvasTexture[] = VERSION_PLATE_TEXT.map(buildTexture)
