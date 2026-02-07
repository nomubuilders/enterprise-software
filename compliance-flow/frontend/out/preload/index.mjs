import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  // Docker management
  docker: {
    checkInstalled: () => ipcRenderer.invoke("docker:check-installed"),
    startServices: () => ipcRenderer.invoke("docker:start-services"),
    stopServices: () => ipcRenderer.invoke("docker:stop-services"),
    getHealth: () => ipcRenderer.invoke("docker:get-health"),
    pullImages: () => ipcRenderer.invoke("docker:pull-images"),
    getServiceLogs: (service) => ipcRenderer.invoke("docker:get-logs", service),
    onHealthUpdate: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("docker:health-update", handler);
      return () => ipcRenderer.removeListener("docker:health-update", handler);
    },
    onLogOutput: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("docker:log-output", handler);
      return () => ipcRenderer.removeListener("docker:log-output", handler);
    },
    onPullProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("docker:pull-progress", handler);
      return () => ipcRenderer.removeListener("docker:pull-progress", handler);
    }
  },
  // App info
  app: {
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    getPlatform: () => ipcRenderer.invoke("app:get-platform"),
    isFirstRun: () => ipcRenderer.invoke("app:is-first-run"),
    setFirstRunComplete: () => ipcRenderer.invoke("app:set-first-run-complete")
  },
  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:check"),
    downloadUpdate: () => ipcRenderer.invoke("updater:download"),
    installUpdate: () => ipcRenderer.invoke("updater:install"),
    onUpdateAvailable: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on("updater:available", handler);
      return () => ipcRenderer.removeListener("updater:available", handler);
    },
    onUpdateDownloaded: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("updater:downloaded", handler);
      return () => ipcRenderer.removeListener("updater:downloaded", handler);
    }
  }
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
