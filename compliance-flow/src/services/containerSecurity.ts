/**
 * Container Security Configuration
 * Defines defense-in-depth security settings for Docker container execution
 */

export interface SecurityProfile {
  user: string
  privileged: boolean
  capDrop: string[]
  capAdd: string[]
  securityOpt: string[]
  readonlyRootfs: boolean
  noNewPrivileges: boolean
  pidMode: string
  ipcMode: string
  tmpfs: Record<string, string>
}

/**
 * Get the default (production) security profile.
 * All containers run with maximum restrictions by default.
 */
export function getDefaultSecurityProfile(): SecurityProfile {
  return {
    user: '1000:1000',
    privileged: false,
    capDrop: ['ALL'],
    capAdd: [],
    securityOpt: ['no-new-privileges:true'],
    readonlyRootfs: true,
    noNewPrivileges: true,
    pidMode: '',
    ipcMode: 'none',
    tmpfs: {
      '/tmp': 'rw,noexec,nosuid,size=100m',
      '/output': 'rw,noexec,nosuid,size=500m',
    },
  }
}

/**
 * Validate that a security profile meets minimum requirements.
 * Returns an array of violations if any security requirements are not met.
 */
export function validateSecurityProfile(profile: SecurityProfile): string[] {
  const violations: string[] = []

  if (profile.privileged) {
    violations.push('Privileged mode is not allowed')
  }

  if (profile.user === 'root' || profile.user === '0' || profile.user === '0:0') {
    violations.push('Running as root is not allowed')
  }

  if (!profile.capDrop.includes('ALL')) {
    violations.push('All capabilities must be dropped (capDrop: ALL)')
  }

  if (profile.capAdd.length > 0) {
    violations.push(`Additional capabilities not allowed: ${profile.capAdd.join(', ')}`)
  }

  if (profile.pidMode === 'host') {
    violations.push('Host PID namespace sharing is not allowed')
  }

  if (profile.ipcMode === 'host') {
    violations.push('Host IPC namespace sharing is not allowed')
  }

  return violations
}
