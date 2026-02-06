/**
 * Image Validator Service
 * Validates container images against the approved allowlist before execution
 */

import type { ApprovedImage, DockerContainerConfig } from '../types/docker'

export interface ValidationResult {
  valid: boolean
  error?: string
  approvedImage?: ApprovedImage
  adjustedConfig?: {
    cpuLimit: number
    memoryLimit: number
  }
}

export function validateImage(
  config: Pick<DockerContainerConfig, 'image' | 'tag' | 'cpuLimit' | 'memoryLimit'>,
  approvedImages: ApprovedImage[]
): ValidationResult {
  // Check if image is on allowlist
  const approved = approvedImages.find(
    (img) => img.name === config.image && img.tag === config.tag
  )

  if (!approved) {
    return {
      valid: false,
      error: `Image not approved: ${config.image}:${config.tag}. Contact your admin to add this image to the allowlist.`,
    }
  }

  // Enforce per-image resource ceilings
  const adjustedCpu = Math.min(config.cpuLimit, approved.maxCpu)
  const adjustedMemory = Math.min(config.memoryLimit, approved.maxMemory)

  const wasAdjusted = adjustedCpu !== config.cpuLimit || adjustedMemory !== config.memoryLimit

  return {
    valid: true,
    approvedImage: approved,
    adjustedConfig: wasAdjusted ? {
      cpuLimit: adjustedCpu,
      memoryLimit: adjustedMemory,
    } : undefined,
  }
}

export function loadApprovedImages(): ApprovedImage[] {
  // In production, this would fetch from the backend API
  // For now, load from the local JSON config
  try {
    // This will be replaced with an API call in the full backend integration
    return []
  } catch {
    return []
  }
}
