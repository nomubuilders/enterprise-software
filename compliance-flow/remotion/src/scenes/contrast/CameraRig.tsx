import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { useCurrentFrame } from 'remotion'
import { getCameraState } from './cameraSpline'

// CameraRig · frame-driven camera transform.
//
// IMPORTANT: this component does NOT create or swap the active camera.
// `<ThreeCanvas camera={...}>` in ProductStage owns the default camera. We
// just mutate its position + lookAt per frame.
//
// Earlier version used Drei `<PerspectiveCamera makeDefault>` plus a useEffect
// calling `set({ camera })`. That fights @remotion/three's `frameloop="never"`
// render-on-demand model: the camera reference changing mid-render confuses
// the bookkeeping for "did we render this frame yet" and the still render
// hangs at the first delayRender. The fix below removes both and mutates
// the canvas's existing camera in a useLayoutEffect (synchronous, fires
// before paint, no swap).

export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame()
  const camera = useThree((s) => s.camera)

  useLayoutEffect(() => {
    const { position, lookAt } = getCameraState(frame)
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
    camera.updateProjectionMatrix()
  })

  return null
}
