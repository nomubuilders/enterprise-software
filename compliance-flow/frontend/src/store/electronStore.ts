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
  modelPullProgress: number
  modelPullMessage: string

  // Actions
  setIsFirstRun: (v: boolean) => void
  setSetupStep: (step: number) => void
  setDockerInstalled: (installed: boolean, version?: string) => void
  setPullProgress: (progress: number, message: string) => void
  updateHealth: (report: HealthReport) => void
  setModelPullProgress: (progress: number, message: string) => void
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
  modelPullProgress: 0,
  modelPullMessage: '',

  setIsFirstRun: (v) => set({ isFirstRun: v }),
  setSetupStep: (step) => set({ setupStep: step }),
  setDockerInstalled: (installed, version) =>
    set({ dockerInstalled: installed, dockerVersion: version || '' }),
  setPullProgress: (progress, message) => set({ pullProgress: progress, pullMessage: message }),
  updateHealth: (report) =>
    set({ servicesHealth: report.services, allServicesHealthy: report.allHealthy }),
  setModelPullProgress: (progress, message) =>
    set({ modelPullProgress: progress, modelPullMessage: message }),
}))
