import { create } from 'zustand'
import type { ServiceHealth, HealthReport } from '../types/electron'

interface ElectronState {
  // Setup wizard
  isFirstRun: boolean
  setupStep: number
  dockerInstalled: boolean
  dockerVersion: string
  pullProgress: number
  pullMessage: string
  servicesHealth: ServiceHealth[]
  allServicesHealthy: boolean

  // Actions
  setIsFirstRun: (v: boolean) => void
  setSetupStep: (step: number) => void
  setDockerInstalled: (installed: boolean, version?: string) => void
  setPullProgress: (progress: number, message: string) => void
  updateHealth: (report: HealthReport) => void
}

export const useElectronStore = create<ElectronState>()((set) => ({
  isFirstRun: false,
  setupStep: 0,
  dockerInstalled: false,
  dockerVersion: '',
  pullProgress: 0,
  pullMessage: '',
  servicesHealth: [],
  allServicesHealthy: false,

  setIsFirstRun: (v) => set({ isFirstRun: v }),
  setSetupStep: (step) => set({ setupStep: step }),
  setDockerInstalled: (installed, version) =>
    set({ dockerInstalled: installed, dockerVersion: version || '' }),
  setPullProgress: (progress, message) => set({ pullProgress: progress, pullMessage: message }),
  updateHealth: (report) =>
    set({ servicesHealth: report.services, allServicesHealthy: report.allHealthy }),
}))
